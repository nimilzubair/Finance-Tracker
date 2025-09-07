// api/expenses/all/route.ts
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

// GET - Fetch expenses
export async function GET(request: NextRequest) {
  console.log("GET ALL EXPENSES");
  let client;
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return Response.json({ error: "User not logged in" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    client = await pool.connect();

    let query = `
      SELECT expensetitle, amount, paiddate, createdat
      FROM expenses
      WHERE userid = $1
    `;
    const params: any[] = [userId];

    if (month && year) {
      query += ` AND EXTRACT(MONTH FROM paiddate) = $2 AND EXTRACT(YEAR FROM paiddate) = $3`;
      params.push(parseInt(month), parseInt(year));
    }

    query += " ORDER BY paiddate DESC";

    const result = await client.query(query, params);
    return Response.json(result.rows);
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return Response.json({ error: "Failed to fetch expenses" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}

// POST - Add new expense
export async function POST(request: NextRequest) {
  console.log("ADD NEW EXPENSE");
  let client;
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return Response.json({ error: "User not logged in" }, { status: 401 });
    }

    const { expensetitle, amount, paiddate } = await request.json();

    // Validation
    if (!expensetitle || !amount || !paiddate) {
      return Response.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return Response.json(
        { error: "Amount must be a positive number" },
        { status: 400 }
      );
    }

    // Validate date format
    const expenseDate = new Date(paiddate);
    if (isNaN(expenseDate.getTime())) {
      return Response.json(
        { error: "Invalid date format" },
        { status: 400 }
      );
    }

    client = await pool.connect();

    const result = await client.query(
      `INSERT INTO expenses (userid, expensetitle, amount, paiddate) 
       VALUES ($1, $2, $3, $4) 
       RETURNING expenseid, expensetitle, amount, paiddate, createdat`,
      [userId, expensetitle.trim(), numAmount, paiddate]
    );

    const newExpense = result.rows[0];

    return Response.json({
      message: "Expense added successfully",
      expense: newExpense
    }, { status: 201 });

  } catch (error) {
    console.error("Error adding expense:", error);
    return Response.json(
      { error: "Failed to add expense" },
      { status: 500 }
    );
  } finally {
    if (client) client.release();
  }
}
// Add these to your existing expenses route

// UPDATE EXPENSE
export async function PUT(request: NextRequest) {
  let client;
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return Response.json({ error: "User not authenticated" }, { status: 401 });
    }

    const { expenseid, expensetitle, amount, paiddate, category } = await request.json();

    if (!expenseid || !expensetitle || !amount || !paiddate) {
      return Response.json({ error: "All fields are required" }, { status: 400 });
    }

    client = await pool.connect();

    // Verify the expense belongs to the user
    const check = await client.query(
      'SELECT expenseid FROM expenses WHERE expenseid = $1 AND userid = $2',
      [expenseid, userId]
    );

    if (check.rows.length === 0) {
      return Response.json({ error: "Expense not found or unauthorized" }, { status: 404 });
    }

    const result = await client.query(
      `UPDATE expenses 
       SET expensetitle = $1, amount = $2, paiddate = $3, category = $4, updatedat = NOW()
       WHERE expenseid = $5 AND userid = $6 
       RETURNING *`,
      [expensetitle, amount, paiddate, category, expenseid, userId]
    );

    return Response.json(
      { message: "Expense updated successfully", expense: result.rows[0] },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating expense:", error);
    return Response.json({ error: "Failed to update expense" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}

// DELETE EXPENSE
export async function DELETE(request: NextRequest) {
  let client;
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return Response.json({ error: "User not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const expenseid = searchParams.get('id');

    if (!expenseid) {
      return Response.json({ error: "Expense ID is required" }, { status: 400 });
    }

    client = await pool.connect();

    // Verify the expense belongs to the user
    const check = await client.query(
      'SELECT expenseid FROM expenses WHERE expenseid = $1 AND userid = $2',
      [expenseid, userId]
    );

    if (check.rows.length === 0) {
      return Response.json({ error: "Expense not found or unauthorized" }, { status: 404 });
    }

    await client.query(
      'DELETE FROM expenses WHERE expenseid = $1 AND userid = $2',
      [expenseid, userId]
    );

    return Response.json(
      { message: "Expense deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting expense:", error);
    return Response.json({ error: "Failed to delete expense" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}