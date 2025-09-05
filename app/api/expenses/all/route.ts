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
