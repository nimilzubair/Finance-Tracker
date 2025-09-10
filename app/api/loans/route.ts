// app/api/loans/route.ts - UPDATED with filtering
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

    // Get month and year from query parameters
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    client = await pool.connect();

    let query = `
      SELECT loanid, loantitle, totalamount, amountpaid, amountleft, createdat 
      FROM loans 
      WHERE userid = $1
    `;
    
    const params: any[] = [userId];
    let paramCount = 1;

    // Add date filtering if month and year are provided and not "All" (0)
    if (month && year && month !== '0' && year !== '0') {
      paramCount++;
      query += ` AND EXTRACT(MONTH FROM createdat) = $${paramCount}`;
      params.push(parseInt(month));
      
      paramCount++;
      query += ` AND EXTRACT(YEAR FROM createdat) = $${paramCount}`;
      params.push(parseInt(year));
    } else if (month && month !== '0') {
      // Filter by month only
      paramCount++;
      query += ` AND EXTRACT(MONTH FROM createdat) = $${paramCount}`;
      params.push(parseInt(month));
    } else if (year && year !== '0') {
      // Filter by year only
      paramCount++;
      query += ` AND EXTRACT(YEAR FROM createdat) = $${paramCount}`;
      params.push(parseInt(year));
    }

    query += ` ORDER BY createdat DESC`;

    const result = await client.query(query, params);

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
// Add to your existing loans route

// UPDATE LOAN
export async function PUT(request: NextRequest) {
  let client;
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return Response.json({ error: "User not authenticated" }, { status: 401 });
    }

    const { loanid, loantitle, totalamount, amountpaid, amountleft } = await request.json();
    console.log("Loan id: ", loanid);
    if (!loanid || !loantitle || totalamount === undefined) {
      return Response.json({ error: "Loan ID, title and total amount are required" }, { status: 400 });
    }

    client = await pool.connect();

    // Verify the loan belongs to the user
    const check = await client.query(
      'SELECT loanid FROM loans WHERE loanid = $1 AND userid = $2',
      [loanid, userId]
    );

    if (check.rows.length === 0) {
      return Response.json({ error: "Loan not found or unauthorized" }, { status: 404 });
    }

    const result = await client.query(
      `UPDATE loans 
       SET loantitle = $1, totalamount = $2, amountpaid = $3, amountleft = $4 
       WHERE loanid = $5 AND userid = $6 
       RETURNING *`,
      [loantitle, totalamount, amountpaid, amountleft, loanid, userId]
    );

    return Response.json(
      { message: "Loan updated successfully", loan: result.rows[0] },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating loan:", error);
    return Response.json({ error: "Failed to update loan" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}

// DELETE LOAN - Accepts ID from body
export async function DELETE(request: NextRequest) {
  let client;
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return Response.json({ error: "User not authenticated" }, { status: 401 });
    }

    const { loanid } = await request.json();

    if (!loanid) {
      return Response.json({ error: "Loan ID is required" }, { status: 400 });
    }

    client = await pool.connect();
    const check = await client.query(
      'SELECT loanid FROM loans WHERE loanid = $1 AND userid = $2',
      [loanid, userId]
    );

    if (check.rows.length === 0) {
      return Response.json({ error: "Loan not found or unauthorized" }, { status: 404 });
    }

    await client.query(
      'DELETE FROM loans WHERE loanid = $1 AND userid = $2',
      [loanid, userId]
    );

    return Response.json(
      { message: "Loan deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting loan:", error);
    return Response.json({ error: "Failed to delete loan" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}