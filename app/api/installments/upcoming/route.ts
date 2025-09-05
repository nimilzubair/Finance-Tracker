// app/api/installments/upcoming/route.ts
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// helper to extract userId from token
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
      return NextResponse.json({ error: "User not logged in" }, { status: 401 });
    }

    client = await pool.connect();

    // For each installment, compute the next due payment date and amount
    const result = await client.query(
      `
      SELECT 
        i.installmentid,
        i.installmenttitle,
        i.amountpermonth AS amountdue,
        (i.startdate + (COUNT(id.installmentdetailid) * interval '1 month')) AS duedate
      FROM installments i
      LEFT JOIN installment_details id 
        ON i.installmentid = id.installmentid
      WHERE i.userid = $1
      GROUP BY i.installmentid
      HAVING (i.totalamount - COALESCE(SUM(id.amountpaid), 0)) > 0
      ORDER BY duedate ASC
      LIMIT 5
      `,
      [userId]
    );

    return NextResponse.json(result.rows, { status: 200 });
  } catch (err) {
    console.error("Error fetching upcoming payments:", err);
    return NextResponse.json({ error: "Failed to fetch upcoming payments" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}
