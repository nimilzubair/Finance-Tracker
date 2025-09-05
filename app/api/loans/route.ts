// app/api/loans/route.ts
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Helper: Extract userId from JWT token
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

// ================== GET LOANS ==================
export async function GET(request: NextRequest) {
  let client;
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return Response.json({ error: "User not logged in" }, { status: 401 });
    }

    client = await pool.connect();

    const result = await client.query(
      `SELECT loanid, loantitle, totalamount, amountpaid, amountleft, createdat 
       FROM loans 
       WHERE userid = $1 
       ORDER BY createdat DESC`,
      [userId]
    );

    return Response.json(result.rows, { status: 200 });
  } catch (error) {
    console.error("Error fetching loans:", error);
    return Response.json({ error: "Failed to fetch loans" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}

// ================== ADD NEW LOAN ==================
export async function POST(request: NextRequest) {
  let client;
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return Response.json({ error: "User not logged in" }, { status: 401 });
    }

    const { loantitle, totalamount, amountpaid = 0, amountleft } =
      await request.json();

    // Validate required fields
    if (!loantitle || !totalamount) {
      return Response.json(
        { error: "loantitle and totalamount are required" },
        { status: 400 }
      );
    }

    const totalAmountNum = Number(totalamount);
    const amountPaidNum = Number(amountpaid);
    const amountLeftNum =
      amountleft !== undefined
        ? Number(amountleft)
        : totalAmountNum - amountPaidNum;

    if (isNaN(totalAmountNum) || totalAmountNum <= 0) {
      return Response.json(
        { error: "Total amount must be a positive number" },
        { status: 400 }
      );
    }

    if (isNaN(amountPaidNum) || amountPaidNum < 0) {
      return Response.json(
        { error: "Amount paid must be 0 or a positive number" },
        { status: 400 }
      );
    }

    if (amountLeftNum < 0) {
      return Response.json(
        { error: "Amount left cannot be negative" },
        { status: 400 }
      );
    }

    client = await pool.connect();

    const result = await client.query(
      `INSERT INTO loans (userid, loantitle, totalamount, amountpaid, amountleft, createdat) 
       VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
      [userId, loantitle, totalAmountNum, amountPaidNum, amountLeftNum]
    );

    return Response.json(
      {
        message: "Loan added successfully",
        loan: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding loan:", error);
    return Response.json({ error: "Failed to add loan" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}
