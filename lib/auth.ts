// lib/auth.ts
import { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { JWT_CONFIG } from "@/lib/jwt";

export async function getUserIdFromRequest(request: NextRequest): Promise<number | null> {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

    const token = authHeader.substring(7);
    const secret = new TextEncoder().encode(JWT_CONFIG.secret);
    const { payload } = await jwtVerify(token, secret);

    return payload.userId ? parseInt(payload.userId as string) : null;
  } catch (error) {
    console.error("JWT verification error:", error);
    return null;
  }
}