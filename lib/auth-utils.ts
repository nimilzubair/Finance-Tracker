// lib/auth-utils.ts
import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/jwt";

export async function getAuthenticatedUserId(request: NextRequest): Promise<number | null> {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      return decoded?.userId ? parseInt(decoded.userId as string) : null;
    }
    return null;
  } catch (error) {
    console.error("Authentication error:", error);
    return null;
  }
}
