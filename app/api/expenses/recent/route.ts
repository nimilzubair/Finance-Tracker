import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// Helper: extract userId from JWT
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

// GET recent expenses
export async function GET(request: NextRequest) {
  console.log("GET RECENT EXPENSES");
  let client;
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "User not logged in" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "5");

    client = await pool.connect();
    const query = `
      SELECT expensetitle, amount, paiddate, createdat
      FROM expenses
      WHERE userid = $1
      ORDER BY paiddate DESC
      LIMIT $2
    `;
    const result = await client.query(query, [userId, limit]);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching recent expenses:", error);
    return NextResponse.json({ error: "Failed to fetch recent expenses" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}

// POST add expense
export async function POST(request: NextRequest) {
  console.log("POST NEW EXPENSES");
  let client;
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "User not logged in" }, { status: 401 });
    }

    const { expensetitle, amount, paiddate } = await request.json();

    if (!expensetitle || !amount || !paiddate) {
      return NextResponse.json(
        { error: "expensetitle, amount, and paiddate are required" },
        { status: 400 }
      );
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive number" },
        { status: 400 }
      );
    }

    client = await pool.connect();
    const result = await client.query(
      `INSERT INTO expenses (userid, expensetitle, amount, paiddate, createdat)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, expensetitle, amount, paiddate, createdat`,
      [userId, expensetitle, amountNum, paiddate]
    );

    return NextResponse.json(
      { message: "Expense added successfully", expense: result.rows[0] },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding expense:", error);
    return NextResponse.json({ error: "Failed to add expense" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}
