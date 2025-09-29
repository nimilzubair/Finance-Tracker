// app/api/installments/payment/route.ts
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

// Centralized payment amount calculation (same as main route)
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

// Update installment status after payment
async function updateInstallmentStatus(installmentId: number, client: PoolClient) {
  try {
    const res = await client.query(`
      SELECT 
        i.*,
        COALESCE(SUM(id.amountpaid), 0) AS total_paid
      FROM installments i
      LEFT JOIN installment_details id ON i.installmentid = id.installmentid
      WHERE i.installmentid = $1
      GROUP BY i.installmentid
    `, [installmentId]);

    if (!res.rows.length) return;
    
    const inst = res.rows[0];
    const totalPaid = parseFloat(inst.total_paid);
    const totalAmount = parseFloat(inst.totalamount);
    let newStatus = inst.status;

    if (totalPaid >= totalAmount) {
      newStatus = 'completed';
    } else if (newStatus === 'overdue' || newStatus === 'completed') {
      newStatus = 'active';
    }

    if (newStatus !== inst.status) {
      await client.query(
        'UPDATE installments SET status = $1, updatedat = CURRENT_TIMESTAMP WHERE installmentid = $2', 
        [newStatus, installmentId]
      );
    }
  } catch (error) {
    console.error('Error updating installment status:', error);
  }
}

export async function POST(request: NextRequest) {
  let client: PoolClient | undefined;
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const { installmentid, amountpaid, paiddate, is_advance, payment_period_id, description } = await request.json();
    
    // Validation
    if (!installmentid || !amountpaid || !paiddate) {
      return NextResponse.json({ 
        error: "Installment ID, amount, and payment date are required" 
      }, { status: 400 });
    }

    const amountNum = Number(amountpaid);
    if (!amountNum || amountNum <= 0) {
      return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
    }

    // Validate paiddate
    const paidDateObj = new Date(paiddate);
    if (isNaN(paidDateObj.getTime())) {
      return NextResponse.json({ error: "Invalid payment date" }, { status: 400 });
    }

    client = await pool.connect();

    // Get installment details with payment history
    const { rows } = await client.query(
      `SELECT i.*, 
              COALESCE(SUM(id.amountpaid), 0) AS total_paid,
              COUNT(CASE WHEN id.is_advance = false THEN 1 END) AS payments_made
       FROM installments i
       LEFT JOIN installment_details id ON i.installmentid = id.installmentid
       WHERE i.installmentid = $1 AND i.userid = $2
       GROUP BY i.installmentid`,
      [installmentid, userId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ 
        error: "Installment not found or unauthorized" 
      }, { status: 403 });
    }

    const inst = rows[0];
    const totalAmount = Number(inst.totalamount);
    const totalPaid = Number(inst.total_paid);
    const remaining = totalAmount - totalPaid;

    // Check if already fully paid
    if (remaining <= 0.01) {
      return NextResponse.json({ 
        error: "Installment is already fully paid" 
      }, { status: 400 });
    }

    // Check if payment exceeds remaining amount
    if (amountNum > remaining + 0.01) { // Small tolerance for rounding
      return NextResponse.json({ 
        error: `Payment exceeds remaining amount of $${remaining.toFixed(2)}` 
      }, { status: 400 });
    }

    // Handle advance payment validation
    if (is_advance) {
      if (inst.advancepaid) {
        return NextResponse.json({ error: "Advance already paid" }, { status: 400 });
      }
    } else {
      // Regular payment validation - calculate expected amount
      const expectedAmount = calculatePaymentAmount(
        totalAmount,
        Number(inst.advanceamount) || 0,
        inst.payment_frequency,
        Number(inst.installmentdurationinmonths),
        inst.payment_interval_days
      );

      // Allow some tolerance for rounding differences
      const diff = Math.abs(amountNum - expectedAmount);
      if (diff > 0.01) {
        return NextResponse.json({
          error: `Payment should be $${expectedAmount.toFixed(2)}`,
          expected_amount: expectedAmount
        }, { status: 400 });
      }

      // Check for duplicate payment period (fixed field name)
      if (payment_period_id) {
        const dupCheck = await client.query(
          `SELECT 1 FROM installment_details 
           WHERE installmentid = $1 AND payment_period_id = $2 AND is_advance = false`,
          [installmentid, payment_period_id]
        );
        if (dupCheck.rows.length > 0) {
          return NextResponse.json({ 
            error: `Payment for period ${payment_period_id} already exists` 
          }, { status: 400 });
        }
      }
    }

    // Insert payment record (fixed field name)
    const insert = await client.query(
      `INSERT INTO installment_details 
       (installmentid, amountpaid, paiddate, is_advance, payment_period_id, description, createdat) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,
      [
        installmentid, 
        amountNum, 
        paidDateObj, 
        is_advance || false, 
        payment_period_id || null,
        description || (is_advance ? 'Advance payment' : 'Regular payment')
      ]
    );

    // Update installment record if advance payment
    if (is_advance) {
      await client.query(
        `UPDATE installments SET 
         advancepaid = true, 
         advanceamount = $1, 
         updatedat = CURRENT_TIMESTAMP 
         WHERE installmentid = $2`,
        [amountNum, installmentid]
      );
    }

    // Update installment status
    await updateInstallmentStatus(installmentid, client);

    const newTotal = totalPaid + amountNum;
    const newRemaining = totalAmount - newTotal;

    return NextResponse.json({
      message: "Payment recorded successfully",
      payment: insert.rows[0],
      remaining_amount: Math.max(0, newRemaining),
      is_completed: newTotal >= totalAmount,
      total_paid: newTotal
    }, { status: 201 });

  } catch (err) {
    console.error("Error recording payment:", err);
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}

export async function GET(request: NextRequest) {
  let client: PoolClient | undefined;
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const installmentid = searchParams.get("installmentid");
    if (!installmentid) {
      return NextResponse.json({ error: "Installment ID is required" }, { status: 400 });
    }

    client = await pool.connect();

    // Check ownership
    const own = await client.query(
      `SELECT installmentid FROM installments WHERE installmentid = $1 AND userid = $2`,
      [installmentid, userId]
    );
    if (own.rows.length === 0) {
      return NextResponse.json({ 
        error: "Installment not found or unauthorized" 
      }, { status: 403 });
    }

    // Get payment history (fixed field name)
    const result = await client.query(
      `SELECT 
         installmentdetailid, 
         installmentid, 
         amountpaid, 
         paiddate, 
         is_advance, 
         payment_period_id, 
         description,
         createdat
       FROM installment_details
       WHERE installmentid = $1
       ORDER BY paiddate DESC, createdat DESC`,
      [installmentid]
    );

    // Format response with proper number formatting
    const payments = result.rows.map(payment => ({
      ...payment,
      amountpaid: Number(payment.amountpaid)
    }));

    return NextResponse.json({ payments });

  } catch (err) {
    console.error("Error fetching payment history:", err);
    return NextResponse.json({ error: "Failed to fetch payment history" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}

// DELETE - remove a payment (useful for corrections)
export async function DELETE(request: NextRequest) {
  let client: PoolClient | undefined;
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get("paymentId");
    if (!paymentId) {
      return NextResponse.json({ error: "Payment ID is required" }, { status: 400 });
    }

    client = await pool.connect();

    // Check ownership and get payment details
    const paymentCheck = await client.query(
      `SELECT id.*, i.userid 
       FROM installment_details id
       JOIN installments i ON id.installmentid = i.installmentid
       WHERE id.installmentdetailid = $1`,
      [paymentId]
    );

    if (paymentCheck.rows.length === 0 || paymentCheck.rows[0].userid !== userId) {
      return NextResponse.json({ 
        error: "Payment not found or unauthorized" 
      }, { status: 403 });
    }

    const payment = paymentCheck.rows[0];

    // Delete the payment
    await client.query(
      'DELETE FROM installment_details WHERE installmentdetailid = $1',
      [paymentId]
    );

    // If it was an advance payment, update the installment record
    if (payment.is_advance) {
      await client.query(
        `UPDATE installments SET 
         advancepaid = false, 
         advanceamount = 0, 
         updatedat = CURRENT_TIMESTAMP 
         WHERE installmentid = $1`,
        [payment.installmentid]
      );
    }

    // Update installment status
    await updateInstallmentStatus(payment.installmentid, client);

    return NextResponse.json({ 
      message: "Payment deleted successfully" 
    });

  } catch (err) {
    console.error("Error deleting payment:", err);
    return NextResponse.json({ error: "Failed to delete payment" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}