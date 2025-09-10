// app/api/installments/route.ts - ENHANCED with payment frequencies
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// Payment frequency mappings
const paymentFrequencies = {
  'daily': 1,
  'weekly': 7,
  'bi-weekly': 14,
  'monthly': 30,
  'quarterly': 90,
  'yearly': 365,
  'custom': 0
};

function getUserIdFromRequest(request: NextRequest): number | null {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
    
    const token = authHeader.substring(7);
    if (!token) return null;

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded.userId || decoded.id || null;
  } catch (error) {
    console.error("JWT verification error:", error);
    return null;
  }
}

// GET - Fetch installments with enhanced status tracking
export async function GET(request: NextRequest) {
  let client;
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return Response.json({ error: "User not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    client = await pool.connect();

    let query = `
      SELECT 
        i.installmentid,
        i.installmenttitle,
        i.startdate,
        i.installmentdurationinmonths,
        i.payment_frequency,
        i.payment_interval_days,
        i.amountpermonth,
        i.advancepaid,
        i.advanceamount,
        i.totalamount,
        i.createdat,
        COALESCE(SUM(id.amountpaid), 0) as total_paid,
        (i.totalamount - COALESCE(SUM(id.amountpaid), 0)) as remaining_amount,
        COUNT(id.installmentdetailid) as payments_made,
        -- Calculate periods remaining based on frequency
        CASE 
          WHEN i.payment_frequency = 'monthly' THEN 
            i.installmentdurationinmonths - COUNT(id.installmentdetailid)
          WHEN i.payment_frequency = 'quarterly' THEN 
            CEIL((i.installmentdurationinmonths - COUNT(id.installmentdetailid)) / 3)
          WHEN i.payment_frequency = 'yearly' THEN 
            CEIL((i.installmentdurationinmonths - COUNT(id.installmentdetailid)) / 12)
          WHEN i.payment_frequency = 'custom' AND i.payment_interval_days > 0 THEN
            CEIL((i.installmentdurationinmonths * 30 - (COUNT(id.installmentdetailid) * i.payment_interval_days)) / i.payment_interval_days)
          ELSE 
            i.installmentdurationinmonths - COUNT(id.installmentdetailid)
        END as periods_remaining,
        -- Status tracking
        CASE 
          WHEN (i.totalamount - COALESCE(SUM(id.amountpaid), 0)) <= 0 THEN 'completed'
          WHEN (i.totalamount - COALESCE(SUM(id.amountpaid), 0)) > 0 THEN 'active'
          ELSE 'pending'
        END as status
      FROM installments i
      LEFT JOIN installment_details id ON i.installmentid = id.installmentid
      WHERE i.userid = $1
    `;
    
    const params: any[] = [userId];
    let paramCount = 1;

    if (month && month !== '0') {
      paramCount++;
      query += ` AND EXTRACT(MONTH FROM i.startdate) = $${paramCount}`;
      params.push(parseInt(month));
    }
    if (year && year !== '0') {
      paramCount++;
      query += ` AND EXTRACT(YEAR FROM i.startdate) = $${paramCount}`;
      params.push(parseInt(year));
    }

    query += ` GROUP BY i.installmentid ORDER BY i.createdat DESC`;

    const result = await client.query(query, params);
    return Response.json(result.rows);
  } catch (error) {
    console.error("Error fetching installments:", error);
    return Response.json({ error: "Failed to fetch installments" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}

// POST - Create new installment with frequency support
export async function POST(request: NextRequest) {
  let client;
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return Response.json({ error: "User not authenticated" }, { status: 401 });
    }

    const {
      installmenttitle,
      startdate,
      installmentdurationinmonths,
      payment_frequency,
      payment_interval_days,
      advancepaid,
      advanceamount,
      totalamount,
    } = await request.json();

    if (!installmenttitle || !startdate || !installmentdurationinmonths || !totalamount || !payment_frequency) {
      return Response.json({ error: "All required fields are missing" }, { status: 400 });
    }

    // Validate payment frequency
    if (!['daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'yearly', 'custom'].includes(payment_frequency)) {
      return Response.json({ error: "Invalid payment frequency" }, { status: 400 });
    }

    // For custom frequency, interval days is required
    if (payment_frequency === 'custom' && (!payment_interval_days || payment_interval_days <= 0)) {
      return Response.json({ error: "Custom frequency requires valid interval days" }, { status: 400 });
    }

    client = await pool.connect();

    // Calculate amount per period based on frequency
    let amountPerPeriod;
    const netAmount = totalamount - (advanceamount || 0);
    
    switch (payment_frequency) {
      case 'monthly':
        amountPerPeriod = netAmount / installmentdurationinmonths;
        break;
      case 'quarterly':
        amountPerPeriod = netAmount / (installmentdurationinmonths / 3);
        break;
      case 'yearly':
        amountPerPeriod = netAmount / (installmentdurationinmonths / 12);
        break;
      case 'custom':
        const totalDays = installmentdurationinmonths * 30;
        const numberOfPayments = Math.ceil(totalDays / payment_interval_days);
        amountPerPeriod = netAmount / numberOfPayments;
        break;
      default:
        amountPerPeriod = netAmount / installmentdurationinmonths;
    }

    const result = await client.query(
      `INSERT INTO installments 
       (userid, installmenttitle, startdate, installmentdurationinmonths, 
        payment_frequency, payment_interval_days, amountpermonth, 
        advancepaid, advanceamount, totalamount, createdat) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()) RETURNING *`,
      [
        userId,
        installmenttitle,
        startdate,
        installmentdurationinmonths,
        payment_frequency,
        payment_interval_days || null,
        amountPerPeriod,
        advancepaid || false,
        advanceamount || 0,
        totalamount,
      ]
    );

    return Response.json(
      { 
        message: "Installment plan added successfully", 
        installment: result.rows[0] 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding installment:", error);
    return Response.json({ error: "Failed to add installment" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}

// PUT - Update installment with frequency support
export async function PUT(request: NextRequest) {
  let client;
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return Response.json({ error: "User not authenticated" }, { status: 401 });
    }

    const {
      installmentid,
      installmenttitle,
      startdate,
      installmentdurationinmonths,
      payment_frequency,
      payment_interval_days,
      advancepaid,
      advanceamount,
      totalamount,
    } = await request.json();

    if (!installmentid) {
      return Response.json({ error: "Installment ID is required" }, { status: 400 });
    }

    // Validate payment frequency
    if (payment_frequency && !['daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'yearly', 'custom'].includes(payment_frequency)) {
      return Response.json({ error: "Invalid payment frequency" }, { status: 400 });
    }

    client = await pool.connect();

    // Calculate new amount per period if relevant fields changed
    let amountPerMonth;
    if (totalamount !== undefined || advanceamount !== undefined || installmentdurationinmonths !== undefined || payment_frequency !== undefined) {
      const netAmount = (totalamount || 0) - (advanceamount || 0);
      
      switch (payment_frequency) {
        case 'monthly':
          amountPerMonth = netAmount / (installmentdurationinmonths || 1);
          break;
        case 'quarterly':
          amountPerMonth = netAmount / ((installmentdurationinmonths || 1) / 3);
          break;
        case 'yearly':
          amountPerMonth = netAmount / ((installmentdurationinmonths || 1) / 12);
          break;
        case 'custom':
          const totalDays = (installmentdurationinmonths || 1) * 30;
          const numberOfPayments = Math.ceil(totalDays / (payment_interval_days || 30));
          amountPerMonth = netAmount / numberOfPayments;
          break;
        default:
          amountPerMonth = netAmount / (installmentdurationinmonths || 1);
      }
    }

    const result = await client.query(
      `UPDATE installments 
       SET installmenttitle = COALESCE($1, installmenttitle),
           startdate = COALESCE($2, startdate),
           installmentdurationinmonths = COALESCE($3, installmentdurationinmonths),
           payment_frequency = COALESCE($4, payment_frequency),
           payment_interval_days = COALESCE($5, payment_interval_days),
           amountpermonth = COALESCE($6, amountpermonth),
           advancepaid = COALESCE($7, advancepaid),
           advanceamount = COALESCE($8, advanceamount),
           totalamount = COALESCE($9, totalamount)
       WHERE installmentid = $10 AND userid = $11
       RETURNING *`,
      [
        installmenttitle,
        startdate,
        installmentdurationinmonths,
        payment_frequency,
        payment_interval_days,
        amountPerMonth,
        advancepaid,
        advanceamount,
        totalamount,
        installmentid,
        userId,
      ]
    );

    if (result.rows.length === 0) {
      return Response.json({ error: "Installment not found or unauthorized" }, { status: 404 });
    }

    return Response.json(
      { message: "Installment updated successfully", installment: result.rows[0] },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating installment:", error);
    return Response.json({ error: "Failed to update installment" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}