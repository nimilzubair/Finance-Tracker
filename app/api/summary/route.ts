// app/api/summary/route.ts
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

export async function GET(request: NextRequest) {
  let client;
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return Response.json({ error: "User not logged in" }, { status: 401 });
    }

    client = await pool.connect();

    // Get current month and year for filtering
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
    const currentYear = currentDate.getFullYear();

    // 1. TOTAL ASSETS (Cash, Bank Balances, Investments)
    const assetsResult = await client.query(
      `SELECT COALESCE(SUM(balance), 0) AS total 
       FROM accounts 
       WHERE userid = $1 AND active = true`,
      [userId]
    );

    // 2. MONTHLY INCOME (Salary, Business Income, etc.)
    const incomeResult = await client.query(
      `SELECT COALESCE(SUM(amount), 0) AS total 
       FROM income 
       WHERE userid = $1 
         AND EXTRACT(MONTH FROM income_date) = $2 
         AND EXTRACT(YEAR FROM income_date) = $3`,
      [userId, currentMonth, currentYear]
    );

    // 3. MONTHLY EXPENSES
    const expensesResult = await client.query(
      `SELECT COALESCE(SUM(amount), 0) AS total 
       FROM expenses 
       WHERE userid = $1 
         AND EXTRACT(MONTH FROM paiddate) = $2 
         AND EXTRACT(YEAR FROM paiddate) = $3`,
      [userId, currentMonth, currentYear]
    );

    // 4. TOTAL LIABILITIES (Loans + Remaining Installments)
    // Active loans (remaining amount)
    const loansLiabilitiesResult = await client.query(
      `SELECT COALESCE(SUM(amountleft), 0) AS total 
       FROM loans 
       WHERE userid = $1 AND amountleft > 0`,
      [userId]
    );

    // Remaining installment payments
    const installmentsLiabilitiesResult = await client.query(
      `SELECT 
         COALESCE(SUM(i.totalamount - COALESCE(SUM(id.amountpaid), 0)), 0) AS total
       FROM installments i
       LEFT JOIN installment_details id ON i.installmentid = id.installmentid
       WHERE i.userid = $1
       GROUP BY i.installmentid
       HAVING (i.totalamount - COALESCE(SUM(id.amountpaid), 0)) > 0`,
      [userId]
    );

    // 5. NET WORTH (Assets - Liabilities)
    const totalAssets = parseFloat(assetsResult.rows[0].total);
    const totalLiabilities = parseFloat(loansLiabilitiesResult.rows[0].total) + 
                           parseFloat(installmentsLiabilitiesResult.rows[0].total);
    const netWorth = totalAssets - totalLiabilities;

    // 6. CASH FLOW (Income - Expenses)
    const monthlyIncome = parseFloat(incomeResult.rows[0].total);
    const monthlyExpenses = parseFloat(expensesResult.rows[0].total);
    const netCashFlow = monthlyIncome - monthlyExpenses;

    const summaryData = {
      // Net Worth Section
      totalAssets,
      totalLiabilities,
      netWorth,
      
      // Monthly Overview
      monthlyIncome,
      monthlyExpenses,
      netCashFlow,
      
      // Cash Position
      cashBalance: totalAssets, // Assuming all assets are liquid for simplicity
      
      // Additional useful metrics
      savingsRate: monthlyIncome > 0 ? ((netCashFlow / monthlyIncome) * 100) : 0,
      debtToAssetRatio: totalAssets > 0 ? (totalLiabilities / totalAssets) : 0
    };

    return Response.json(summaryData, { status: 200 });

  } catch (error) {
    console.error("Database error in summary API:", error);
    return Response.json(
      { error: "Failed to fetch summary data" },
      { status: 500 }
    );
  } finally {
    if (client) client.release();
  }
}