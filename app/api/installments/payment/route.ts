// app/api/installments/payment/route.ts - ENHANCED with validation
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

function getUserIdFromRequest(request: NextRequest): number | null {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded.userId || decoded.id || null;
  } catch (error) {
    console.error("JWT verification error:", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  let client;
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return Response.json({ error: "User not authenticated" }, { status: 401 });
    }

    const { installmentid, amountpaid, paiddate, is_advance } = await request.json();

    if (!installmentid || !amountpaid || !paiddate) {
      return Response.json(
        { error: "Installment ID, amount, and payment date are required" },
        { status: 400 }
      );
    }

    const amountNum = parseFloat(amountpaid);
    if (isNaN(amountNum) || amountNum <= 0) {
      return Response.json({ error: "Amount must be a positive number" }, { status: 400 });
    }

    client = await pool.connect();

    // Check if installment exists and belongs to user
    const installmentCheck = await client.query(
      `SELECT installmentid, totalamount, advancepaid, advanceamount 
       FROM installments WHERE installmentid = $1 AND userid = $2`,
      [installmentid, userId]
    );
    
    if (installmentCheck.rows.length === 0) {
      return Response.json({ error: "Installment not found or unauthorized" }, { status: 403 });
    }

    const installment = installmentCheck.rows[0];

    // Check if this is an advance payment and if advance was already paid
    if (is_advance && installment.advancepaid) {
      return Response.json({ error: "Advance payment already made" }, { status: 400 });
    }

    // Get total paid so far
    const totalPaidResult = await client.query(
      `SELECT COALESCE(SUM(amountpaid), 0) as total_paid 
       FROM installment_details WHERE installmentid = $1`,
      [installmentid]
    );

    const totalPaid = parseFloat(totalPaidResult.rows[0].total_paid);
    const remainingAmount = installment.totalamount - totalPaid;

    // Validate payment doesn't exceed remaining amount
    if (amountNum > remainingAmount) {
      return Response.json(
        { error: `Payment exceeds remaining amount of $${remainingAmount.toFixed(2)}` },
        { status: 400 }
      );
    }

    // Record the payment
    const result = await client.query(
      `INSERT INTO installment_details 
       (installmentid, amountpaid, paiddate, is_advance, createdat) 
       VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
      [installmentid, amountNum, paiddate, is_advance || false]
    );

    // If this was an advance payment, update the installment record
    if (is_advance) {
      await client.query(
        `UPDATE installments 
         SET advancepaid = true, advanceamount = $1 
         WHERE installmentid = $2`,
        [amountNum, installmentid]
      );
    }

    return Response.json(
      { 
        message: "Payment recorded successfully", 
        payment: result.rows[0],
        remaining_amount: remainingAmount - amountNum
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error recording payment:", error);
    return Response.json({ error: "Failed to record payment" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}