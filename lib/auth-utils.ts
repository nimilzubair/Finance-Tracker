// lib/auth-utils.ts
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { JWT_CONFIG, verifyToken } from "@/lib/jwt";

export async function getAuthenticatedUserId(request: NextRequest): Promise<number | null> {
  try {
    // Try JWT first (for API routes)
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      return decoded?.userId ? parseInt(decoded.userId as string) : null;
    }

    // Try NextAuth session (for pages)
    const session = await getServerSession(authOptions);
    return session?.user?.id ? parseInt(session.user.id) : null;
  } catch (error) {
    console.error("Authentication error:", error);
    return null;
  }
}