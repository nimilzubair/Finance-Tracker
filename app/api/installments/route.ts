// app/api/installments/route.ts - UPDATED with filtering
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// Helper to extract userId from token
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

export async function GET(request: NextRequest) {
  let client;
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return Response.json({ error: "User not authenticated" }, { status: 401 });
    }

    // Get month and year from query parameters
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
        i.amountpermonth,
        i.advancepaid,
        i.advanceamount,
        i.totalamount,
        i.createdat,
        COALESCE(SUM(id.amountpaid), 0) as total_paid,
        (i.totalamount - COALESCE(SUM(id.amountpaid), 0)) as remaining_amount,
        COUNT(id.installmentdetailid) as payments_made
      FROM installments i
      LEFT JOIN installment_details id ON i.installmentid = id.installmentid
      WHERE i.userid = $1
    `;
    
    const params: any[] = [userId];
    let paramCount = 1;

    // Add date filtering if month and year are provided and not "All" (0)
    if (month && year && month !== '0' && year !== '0') {
      paramCount++;
      query += ` AND EXTRACT(MONTH FROM i.startdate) = $${paramCount}`;
      params.push(parseInt(month));
      
      paramCount++;
      query += ` AND EXTRACT(YEAR FROM i.startdate) = $${paramCount}`;
      params.push(parseInt(year));
    } else if (month && month !== '0') {
      // Filter by month only
      paramCount++;
      query += ` AND EXTRACT(MONTH FROM i.startdate) = $${paramCount}`;
      params.push(parseInt(month));
    } else if (year && year !== '0') {
      // Filter by year only
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
      amountpermonth,
      advancepaid,
      advanceamount,
      totalamount,
    } = await request.json();

    if (!installmenttitle || !startdate || !installmentdurationinmonths || !amountpermonth || !totalamount) {
      return Response.json({ error: "All fields except advance details are required" }, { status: 400 });
    }

    client = await pool.connect();

    const result = await client.query(
      `INSERT INTO installments 
       (userid, installmenttitle, startdate, installmentdurationinmonths, amountpermonth, advancepaid, advanceamount, totalamount, createdat) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING *`,
      [
        userId,
        installmenttitle,
        startdate,
        installmentdurationinmonths,
        amountpermonth,
        advancepaid || false,
        advanceamount || 0,
        totalamount,
      ]
    );

    return Response.json(
      { message: "Installment plan added successfully", installment: result.rows[0] },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding installment:", error);
    return Response.json({ error: "Failed to add installment" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}