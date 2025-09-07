import { NextRequest } from "next/server";
import pool from "@/lib/db";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

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

// GET INCOME (with filtering)
export async function GET(request: NextRequest) {
  let client;
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return Response.json({ error: "User not authenticated" }, { status: 401 });
    }

    // Get filter parameters
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    client = await pool.connect();

    let query = `
      SELECT incomeid, incometitle, amount, income_date, createdat 
      FROM income 
      WHERE userid = $1
    `;
    
    const params: any[] = [userId];
    let paramCount = 1;

    // Add date filtering if month and year are provided and not "All" (0)
    if (month && year && month !== '0' && year !== '0') {
      paramCount++;
      query += ` AND EXTRACT(MONTH FROM income_date) = $${paramCount}`;
      params.push(parseInt(month));
      
      paramCount++;
      query += ` AND EXTRACT(YEAR FROM income_date) = $${paramCount}`;
      params.push(parseInt(year));
    } else if (month && month !== '0') {
      // Filter by month only
      paramCount++;
      query += ` AND EXTRACT(MONTH FROM income_date) = $${paramCount}`;
      params.push(parseInt(month));
    } else if (year && year !== '0') {
      // Filter by year only
      paramCount++;
      query += ` AND EXTRACT(YEAR FROM income_date) = $${paramCount}`;
      params.push(parseInt(year));
    }

    query += ` ORDER BY income_date DESC`;

    const result = await client.query(query, params);

    return Response.json(result.rows, { status: 200 });
  } catch (error) {
    console.error("Error fetching income:", error);
    return Response.json({ error: "Failed to fetch income" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}

// ADD/UPDATE INCOME
export async function POST(request: NextRequest) {
  let client;
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return Response.json({ error: "User not authenticated" }, { status: 401 });
    }

    const { incomeid, incometitle, amount, income_date } = await request.json();

    if (!incometitle || !amount || !income_date) {
      return Response.json({ error: "Title, amount and date are required" }, { status: 400 });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return Response.json({ error: "Amount must be a positive number" }, { status: 400 });
    }

    client = await pool.connect();

    if (incomeid) {
      // Update existing income
      const result = await client.query(
        `UPDATE income 
         SET incometitle = $1, amount = $2, income_date = $3
         WHERE incomeid = $4 AND userid = $5 
         RETURNING *`,
        [incometitle, amountNum, income_date, incomeid, userId]
      );

      if (result.rows.length === 0) {
        return Response.json({ error: "Income not found or unauthorized" }, { status: 404 });
      }

      return Response.json(
        { message: "Income updated successfully", income: result.rows[0] },
        { status: 200 }
      );
    } else {
      // Add new income
      const result = await client.query(
        `INSERT INTO income (userid, incometitle, amount, income_date, createdat) 
         VALUES ($1, $2, $3, $4, NOW()) 
         RETURNING *`,
        [userId, incometitle, amountNum, income_date]
      );

      return Response.json(
        { message: "Income added successfully", income: result.rows[0] },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error("Error managing income:", error);
    return Response.json({ error: "Failed to manage income" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}

// DELETE INCOME
export async function DELETE(request: NextRequest) {
  let client;
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return Response.json({ error: "User not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const incomeid = searchParams.get('id');

    if (!incomeid) {
      return Response.json({ error: "Income ID is required" }, { status: 400 });
    }

    client = await pool.connect();

    // Verify the income belongs to the user
    const check = await client.query(
      'SELECT incomeid FROM income WHERE incomeid = $1 AND userid = $2',
      [incomeid, userId]
    );

    if (check.rows.length === 0) {
      return Response.json({ error: "Income not found or unauthorized" }, { status: 404 });
    }

    await client.query(
      'DELETE FROM income WHERE incomeid = $1 AND userid = $2',
      [incomeid, userId]
    );

    return Response.json(
      { message: "Income deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting income:", error);
    return Response.json({ error: "Failed to delete income" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}