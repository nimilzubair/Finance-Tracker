// app/api/installments/route.ts
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// Helper to extract userId from token
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

export async function GET(request: NextRequest) {
  let client;
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return Response.json({ error: "User not logged in" }, { status: 401 });
    }

    client = await pool.connect();

    const result = await client.query(
      `SELECT 
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
       GROUP BY i.installmentid
       ORDER BY i.createdat DESC`,
      [userId]
    );

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
      return Response.json({ error: "User not logged in" }, { status: 401 });
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
