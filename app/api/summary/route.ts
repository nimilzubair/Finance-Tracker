// app/api/summary/route.ts - FIXED VERSION
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Helper: Extract userId from JWT token - FIXED VERSION
function getUserIdFromRequest(request: NextRequest): number | null {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

    const token = authHeader.substring(7); // Remove "Bearer " prefix
    if (!token) return null;

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
    console.log("User ID from token:", userId); // Debug log
    
    if (!userId) {
      return Response.json({ error: "User not authenticated" }, { status: 401 });
    }

    client = await pool.connect();

    // Get current month and year for filtering
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    // 1. TOTAL BALANCE (Sum of all account balances)
    const assetsResult = await client.query(
      `SELECT COALESCE(SUM(balance), 0) AS total 
       FROM accounts 
       WHERE userid = $1 AND active = true`,
      [userId]
    );
    const totalBalance = parseFloat(assetsResult.rows[0].total);

    // 2. MONTHLY INCOME
    const incomeResult = await client.query(
      `SELECT COALESCE(SUM(amount), 0) AS total 
       FROM income 
       WHERE userid = $1 
         AND EXTRACT(MONTH FROM income_date) = $2 
         AND EXTRACT(YEAR FROM income_date) = $3`,
      [userId, currentMonth, currentYear]
    );
    const monthlyIncome = parseFloat(incomeResult.rows[0].total);

    // 3. MONTHLY EXPENSES
    const expensesResult = await client.query(
      `SELECT COALESCE(SUM(amount), 0) AS total 
       FROM expenses 
       WHERE userid = $1 
         AND EXTRACT(MONTH FROM paiddate) = $2 
         AND EXTRACT(YEAR FROM paiddate) = $3`,
      [userId, currentMonth, currentYear]
    );
    const monthlyExpenses = parseFloat(expensesResult.rows[0].total);

    // 4. NET CASH FLOW
    const netCashFlow = monthlyIncome - monthlyExpenses;

    const summaryData = {
      totalBalance,
      monthlyIncome,
      monthlyExpenses,
      netCashFlow
    };

    console.log("Summary data for user", userId, ":", summaryData); // Debug log

    return Response.json(summaryData, { status: 200 });

  } catch (error) {
    console.error("Database error in summary API:", error);
    return Response.json(
      { error: "Failed to fetch summary data",
        details: error.message },
      { status: 500 }
    );
  } finally {
    if (client) client.release();
  }
}