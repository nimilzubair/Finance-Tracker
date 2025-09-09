// app/api/(auth)/check/route.ts
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { JWT_CONFIG } from "@/lib/jwt";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const token = authHeader.substring(7);

    // ✅ Verify token with jose
    const secret = new TextEncoder().encode(JWT_CONFIG.secret);
    const { payload } = await jwtVerify(token, secret);

    return NextResponse.json({
      success: true,
      user: {
        userid: payload.userId,
        username: payload.username,
        email: payload.email,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.code === "ERR_JWT_EXPIRED" ? "Token expired" : "Invalid token" },
      { status: 401 }
    );
  }
}
