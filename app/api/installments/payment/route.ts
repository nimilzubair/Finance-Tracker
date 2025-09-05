// app/api/installments/payment/route.ts
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

function getUserIdFromRequest(request: NextRequest): number | null {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return null;

    const token = authHeader.split(" ")[1];
    if (!token) return null;

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    return decoded.userId;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  let client;
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return Response.json({ error: "User not logged in" }, { status: 401 });
    }

    const { installmentid, amountpaid, paiddate } = await request.json();

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

    // Only insert payment for installments that belong to this user
    const check = await client.query(
      `SELECT installmentid FROM installments WHERE installmentid = $1 AND userid = $2`,
      [installmentid, userId]
    );
    if (check.rows.length === 0) {
      return Response.json({ error: "Installment not found or unauthorized" }, { status: 403 });
    }

    const result = await client.query(
      `INSERT INTO installment_details 
       (installmentid, amountpaid, paiddate, createdat) 
       VALUES ($1, $2, $3, NOW()) RETURNING *`,
      [installmentid, amountNum, paiddate]
    );

    return Response.json(
      { message: "Payment recorded successfully", payment: result.rows[0] },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error recording payment:", error);
    return Response.json({ error: "Failed to record payment" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}
