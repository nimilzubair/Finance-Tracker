// app/api/installments/upcoming/route.ts
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import jwt from "jsonwebtoken";
import { PoolClient } from 'pg';

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

function getUserIdFromRequest(request: NextRequest): number | null {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded.userId || decoded.id || null;
  } catch (err) {
    console.error("JWT verification error:", err);
    return null;
  }
}

// Centralized payment amount calculation (consistent with other routes)
function calculatePaymentAmount(
  totalAmount: number, 
  advance: number, 
  frequency: string, 
  duration: number, 
  intervalDays?: number
): number {
  const principal = totalAmount - advance;
  
  switch(frequency) {
    case 'weekly':
      return principal / Math.ceil(duration * 30 / 7);
    case 'bi-weekly':
      return principal / Math.ceil(duration * 30 / 14);
    case 'monthly':
      return principal / duration;
    case 'quarterly':
      return principal / Math.ceil(duration / 3);
    case 'yearly':
      return principal / Math.ceil(duration / 12);
    case 'custom':
      return intervalDays ? principal / Math.ceil(duration * 30 / intervalDays) : principal / duration;
    default:
      return principal / duration;
  }
}

// Calculate next payment date (consistent with other routes)
function calculateNextPaymentDate(
  startDate: Date, 
  frequency: string, 
  paymentsMade: number, 
  intervalDays?: number
): Date {
  const next = new Date(startDate);
  
  switch(frequency) {
    case 'weekly':
      next.setDate(next.getDate() + paymentsMade * 7);
      break;
    case 'bi-weekly':
      next.setDate(next.getDate() + paymentsMade * 14);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + paymentsMade);
      break;
    case 'quarterly':
      next.setMonth(next.getMonth() + paymentsMade * 3);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + paymentsMade);
      break;
    case 'custom':
      if (intervalDays) next.setDate(next.getDate() + paymentsMade * intervalDays);
      break;
    default:
      next.setMonth(next.getMonth() + paymentsMade);
      break;
  }
  return next;
}

// Calculate days between two dates
function daysBetween(date1: Date, date2: Date): number {
  const diffTime = date2.getTime() - date1.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export async function GET(request: NextRequest) {
  let client: PoolClient | undefined;
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const daysAhead = parseInt(searchParams.get("days") || "30", 10);

    client = await pool.connect();

    // Simplified query - do calculations in JavaScript for consistency
    const result = await client.query(
      `
      SELECT 
        i.installmentid,
        i.installmenttitle,
        i.payment_frequency,
        i.startdate,
        i.payment_interval_days,
        i.totalamount,
        i.advanceamount,
        i.installmentdurationinmonths,
        i.status,
        COALESCE(COUNT(CASE WHEN id.is_advance = false THEN 1 END), 0) AS payments_made,
        COALESCE(SUM(id.amountpaid), 0) AS total_paid
      FROM installments i
      LEFT JOIN installment_details id ON i.installmentid = id.installmentid
      WHERE i.userid = $1 AND i.status IN ('active', 'overdue')
      GROUP BY i.installmentid
      HAVING (i.totalamount - COALESCE(SUM(id.amountpaid), 0)) > 0.01
      ORDER BY i.startdate ASC
      `,
      [userId]
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    const upcomingPayments = [];

    for (const row of result.rows) {
      const totalAmount = Number(row.totalamount);
      const advanceAmount = Number(row.advanceamount) || 0;
      const totalPaid = Number(row.total_paid);
      const paymentsMade = Number(row.payments_made);
      const remainingAmount = totalAmount - totalPaid;

      // Skip if fully paid
      if (remainingAmount <= 0.01) continue;

      // Calculate next payment details
      const nextPaymentDate = calculateNextPaymentDate(
        new Date(row.startdate),
        row.payment_frequency,
        paymentsMade,
        row.payment_interval_days
      );

      const amountDue = calculatePaymentAmount(
        totalAmount,
        advanceAmount,
        row.payment_frequency,
        Number(row.installmentdurationinmonths),
        row.payment_interval_days
      );

      const daysUntilDue = daysBetween(today, nextPaymentDate);

      // Only include payments due within the specified timeframe
      if (daysUntilDue >= 0 && daysUntilDue <= daysAhead) {
        let paymentStatus = "upcoming";
        if (daysUntilDue <= 0) {
          paymentStatus = "overdue";
        } else if (daysUntilDue <= 7) {
          paymentStatus = "due-soon";
        }

        upcomingPayments.push({
          installmentid: row.installmentid,
          installmenttitle: row.installmenttitle,
          payment_frequency: row.payment_frequency,
          amountdue: Math.min(amountDue, remainingAmount), // Don't exceed remaining
          next_due_date: nextPaymentDate.toISOString().split('T')[0],
          days_until_due: Math.max(0, daysUntilDue),
          total_paid: totalPaid,
          totalamount: totalAmount,
          remaining_amount: remainingAmount,
          payments_made: paymentsMade,
          status: paymentStatus,
          installment_status: row.status,
          next_payment_period: paymentsMade + 1
        });
      }
    }

    // Sort by urgency (overdue first, then by days until due)
    upcomingPayments.sort((a, b) => {
      if (a.status === "overdue" && b.status !== "overdue") return -1;
      if (b.status === "overdue" && a.status !== "overdue") return 1;
      return a.days_until_due - b.days_until_due;
    });

    return NextResponse.json({ 
      upcoming: upcomingPayments.slice(0, 20) // Limit to 20 results
    }, { status: 200 });

  } catch (err) {
    console.error("Error fetching upcoming payments:", err);
    return NextResponse.json({ error: "Failed to fetch upcoming payments" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}

// POST - Get specific installment's next payment details
export async function POST(request: NextRequest) {
  let client: PoolClient | undefined;
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const { installmentid } = await request.json();
    if (!installmentid) {
      return NextResponse.json({ error: "Installment ID is required" }, { status: 400 });
    }

    client = await pool.connect();

    const result = await client.query(
      `
      SELECT 
        i.installmentid,
        i.installmenttitle,
        i.payment_frequency,
        i.startdate,
        i.payment_interval_days,
        i.totalamount,
        i.advanceamount,
        i.installmentdurationinmonths,
        i.status,
        COALESCE(COUNT(CASE WHEN id.is_advance = false THEN 1 END), 0) AS payments_made,
        COALESCE(SUM(id.amountpaid), 0) AS total_paid
      FROM installments i
      LEFT JOIN installment_details id ON i.installmentid = id.installmentid
      WHERE i.installmentid = $1 AND i.userid = $2
      GROUP BY i.installmentid
      `,
      [installmentid, userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Installment not found or unauthorized" }, { status: 404 });
    }

    const row = result.rows[0];
    const totalAmount = Number(row.totalamount);
    const advanceAmount = Number(row.advanceamount) || 0;
    const totalPaid = Number(row.total_paid);
    const paymentsMade = Number(row.payments_made);
    const remainingAmount = totalAmount - totalPaid;

    // Check if fully paid
    if (remainingAmount <= 0.01) {
      return NextResponse.json({ 
        error: "Installment is fully paid",
        is_completed: true 
      }, { status: 400 });
    }

    // Calculate next payment details
    const nextPaymentDate = calculateNextPaymentDate(
      new Date(row.startdate),
      row.payment_frequency,
      paymentsMade,
      row.payment_interval_days
    );

    const amountDue = calculatePaymentAmount(
      totalAmount,
      advanceAmount,
      row.payment_frequency,
      Number(row.installmentdurationinmonths),
      row.payment_interval_days
    );

    const today = new Date();
    const daysUntilDue = daysBetween(today, nextPaymentDate);

    return NextResponse.json({
      installmentid: row.installmentid,
      installmenttitle: row.installmenttitle,
      payment_frequency: row.payment_frequency,
      amountdue: Math.min(amountDue, remainingAmount), // Don't exceed remaining
      next_due_date: nextPaymentDate.toISOString().split('T')[0],
      days_until_due: Math.max(0, daysUntilDue),
      next_payment_period: paymentsMade + 1,
      payments_made: paymentsMade,
      total_paid: totalPaid,
      remaining_amount: remainingAmount,
      is_overdue: daysUntilDue < 0,
      installment_status: row.status
    }, { status: 200 });

  } catch (err) {
    console.error("Error fetching next payment:", err);
    return NextResponse.json({ error: "Failed to fetch next payment" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}

// PUT - Mark payment as paid (quick payment without detailed form)
export async function PUT(request: NextRequest) {
  let client: PoolClient | undefined;
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const { installmentid, payment_date } = await request.json();
    if (!installmentid) {
      return NextResponse.json({ error: "Installment ID is required" }, { status: 400 });
    }

    const paymentDate = payment_date ? new Date(payment_date) : new Date();
    if (isNaN(paymentDate.getTime())) {
      return NextResponse.json({ error: "Invalid payment date" }, { status: 400 });
    }

    client = await pool.connect();

    // Get installment details
    const result = await client.query(
      `
      SELECT 
        i.*,
        COALESCE(COUNT(CASE WHEN id.is_advance = false THEN 1 END), 0) AS payments_made,
        COALESCE(SUM(id.amountpaid), 0) AS total_paid
      FROM installments i
      LEFT JOIN installment_details id ON i.installmentid = id.installmentid
      WHERE i.installmentid = $1 AND i.userid = $2
      GROUP BY i.installmentid
      `,
      [installmentid, userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Installment not found or unauthorized" }, { status: 404 });
    }

    const inst = result.rows[0];
    const totalAmount = Number(inst.totalamount);
    const advanceAmount = Number(inst.advanceamount) || 0;
    const totalPaid = Number(inst.total_paid);
    const paymentsMade = Number(inst.payments_made);
    const remainingAmount = totalAmount - totalPaid;

    if (remainingAmount <= 0.01) {
      return NextResponse.json({ error: "Installment is already fully paid" }, { status: 400 });
    }

    // Calculate payment amount
    const paymentAmount = calculatePaymentAmount(
      totalAmount,
      advanceAmount,
      inst.payment_frequency,
      Number(inst.installmentdurationinmonths),
      inst.payment_interval_days
    );

    const actualPayment = Math.min(paymentAmount, remainingAmount);

    // Record the payment
    await client.query(
      `INSERT INTO installment_details 
       (installmentid, amountpaid, paiddate, is_advance, payment_period_id, description) 
       VALUES ($1, $2, $3, false, $4, 'Quick payment via upcoming payments')`,
      [installmentid, actualPayment, paymentDate, paymentsMade + 1]
    );

    // Update status if completed
    const newTotalPaid = totalPaid + actualPayment;
    if (newTotalPaid >= totalAmount) {
      await client.query(
        `UPDATE installments SET status = 'completed', updatedat = CURRENT_TIMESTAMP 
         WHERE installmentid = $1`,
        [installmentid]
      );
    }

    return NextResponse.json({
      message: "Payment recorded successfully",
      amount_paid: actualPayment,
      remaining_amount: Math.max(0, remainingAmount - actualPayment),
      is_completed: newTotalPaid >= totalAmount
    }, { status: 200 });

  } catch (err) {
    console.error("Error recording quick payment:", err);
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}