// app/api/(auth)/check/route.ts - FIXED
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { JWT_CONFIG } from '@/lib/jwt';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const token = authHeader.substring(7); // Consistent extraction

    // Verify token
    const decoded = jwt.verify(token, JWT_CONFIG.secret) as any; // Use any for flexibility

    // ✅ return consistent user object
    return NextResponse.json({
      success: true,
      user: {
        userid: decoded.userId || decoded.id,
        username: decoded.username,
        email: decoded.email,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.name === "TokenExpiredError" ? "Token expired" : "Invalid token" },
      { status: 401 }
    );
  }
}