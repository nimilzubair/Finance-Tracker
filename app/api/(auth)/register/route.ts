// api/(auth)/register/route.ts
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function POST(request: NextRequest) {
  let client;
  try {
    const { email, username, password, confirm_password } = await request.json();

    if (!email || !username || !password || !confirm_password) {
      return Response.json({ error: "All fields are required" }, { status: 400 });
    }

    if (!isValidUsername(username)) {
      return Response.json(
        { error: "Username can only contain letters and underscore" },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return Response.json({ error: "Invalid email format" }, { status: 400 });
    }

    if (password !== confirm_password) {
      return Response.json(
        { error: "Password and confirm password don't match" },
        { status: 400 }
      );
    }

    if (!isStrongPassword(password)) {
      return Response.json(
        {
          error: [
            "Password must:",
            "Be at least 8 characters long",
            "Contain at least one lower case letter",
            "Contain at least one upper case letter",
            "Contain at least one digit",
            "Contain at least one special character",
          ],
        },
        { status: 400 }
      );
    }

    client = await pool.connect();

    const existing = await client.query(
      "SELECT userid FROM users WHERE username = $1 OR email = $2",
      [username, email]
    );
    if (existing.rows.length > 0) {
      return Response.json(
        { error: "Username or email already exists." },
        { status: 409 }
      );
    }

    // ✅ hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await client.query(
      `INSERT INTO users (username, email, password) 
       VALUES ($1, $2, $3) 
       RETURNING userid, username, email, createdat`,
      [username, email, hashedPassword]
    );

    const newUser = result.rows[0];

    // ✅ issue JWT
    const token = jwt.sign(
      { userId: newUser.userid, username: newUser.username, email: newUser.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return Response.json(
      {
        message: "User registered successfully",
        user: newUser,
        token,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error: ", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}

// --- validation helpers ---
function isValidUsername(username: string): boolean {
  const regex = /^(?=.*[A-Za-z])[A-Za-z._]+$/;
  return regex.test(username);
}

function isStrongPassword(password: string): boolean {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  return regex.test(password);
}

function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}
