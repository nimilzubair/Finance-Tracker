// lib/jwt.ts
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

export const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || "your-secret-key",
  expiresIn: '7d' // Remove the type assertion here
};

export interface DecodedToken {
  userId?: string;
  id?: string;
  username?: string;
  email?: string;
  iat?: number;
  exp?: number;
}

export function getUserIdFromRequest(request: NextRequest): number | null {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_CONFIG.secret) as DecodedToken;
    return decoded.userId ? parseInt(decoded.userId) : decoded.id ? parseInt(decoded.id) : null;
  } catch (error) {
    console.error("JWT verification error:", error);
    return null;
  }
}

export function verifyToken(token: string): DecodedToken | null {
  try {
    return jwt.verify(token, JWT_CONFIG.secret) as DecodedToken;
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
}