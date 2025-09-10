// app/api/installments/upcoming/route.ts - ENHANCED with frequency support
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

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

export async function GET(request: NextRequest) {
  let client;
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    client = await pool.connect();

    const result = await client.query(
      `
      SELECT 
        i.installmentid,
        i.installmenttitle,
        i.payment_frequency,
        i.amountpermonth AS amountdue,
        -- Calculate next due date based on payment frequency
        CASE 
          WHEN i.payment_frequency = 'monthly' THEN 
            (i.startdate + (COUNT(id.installmentdetailid) * interval '1 month'))
          WHEN i.payment_frequency = 'quarterly' THEN 
            (i.startdate + (COUNT(id.installmentdetailid) * interval '3 months'))
          WHEN i.payment_frequency = 'yearly' THEN 
            (i.startdate + (COUNT(id.installmentdetailid) * interval '1 year'))
          WHEN i.payment_frequency = 'custom' AND i.payment_interval_days IS NOT NULL THEN
            (i.startdate + (COUNT(id.installmentdetailid) * i.payment_interval_days * interval '1 day'))
          ELSE 
            (i.startdate + (COUNT(id.installmentdetailid) * interval '1 month'))
        END AS duedate,
        -- Calculate days until due
        CASE 
          WHEN i.payment_frequency = 'monthly' THEN 
            EXTRACT(DAY FROM (i.startdate + (COUNT(id.installmentdetailid) * interval '1 month') - CURRENT_DATE))
          WHEN i.payment_frequency = 'custom' AND i.payment_interval_days IS NOT NULL THEN
            EXTRACT(DAY FROM (i.startdate + (COUNT(id.installmentdetailid) * i.payment_interval_days * interval '1 day') - CURRENT_DATE))
          ELSE 
            EXTRACT(DAY FROM (i.startdate + (COUNT(id.installmentdetailid) * interval '1 month') - CURRENT_DATE))
        END AS days_until_due,
        -- Calculate remaining payments
        i.installmentdurationinmonths - COUNT(id.installmentdetailid) AS payments_remaining
      FROM installments i
      LEFT JOIN installment_details id 
        ON i.installmentid = id.installmentid
      WHERE i.userid = $1
      GROUP BY i.installmentid
      HAVING (i.totalamount - COALESCE(SUM(id.amountpaid), 0)) > 0
      ORDER BY duedate ASC
      LIMIT 10
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