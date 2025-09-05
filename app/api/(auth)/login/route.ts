// api/(auth)/login/route.ts
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function POST(request: NextRequest) {
  let client;
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return Response.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    client = await pool.connect();

    const userCredential = await client.query(
      `SELECT userid, username, email, password 
       FROM users 
       WHERE username = $1`,
      [username]
    );

    if (userCredential.rows.length === 0) {
      return Response.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    const user = userCredential.rows[0];

    // ✅ bcrypt check
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return Response.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // ✅ Generate JWT with userId, username, email
    const token = jwt.sign(
      { userId: user.userid, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Remove password before sending response
    const { password: _, ...userWithoutPassword } = user;

    return Response.json(
      {
        message: "Login successful",
        user: userWithoutPassword,
        token,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Login error: ", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    if (client) client.release();
  }
}
