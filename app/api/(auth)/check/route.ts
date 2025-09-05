// app/api/(auth)/check/route.ts
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret"; // keep in .env

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: number;
      username: string;
      email: string;
    };

    // ✅ return consistent user object
    return NextResponse.json({
      success: true,
      user: {
        userid: decoded.userId,
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
