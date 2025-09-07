// api/(auth)/register/route.ts
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { JWT_CONFIG } from '@/lib/jwt';

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

    // Check for existing username or email
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

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    const result = await client.query(
      `INSERT INTO users (username, email, password) 
       VALUES ($1, $2, $3) 
       RETURNING userid, username, email, createdat`,
      [username, email, hashedPassword]
    );

    const newUser = result.rows[0];

    // ✅ FIXED: Remove unnecessary type assertions
    const token = jwt.sign(
      { 
        userId: newUser.userid, 
        username: newUser.username, 
        email: newUser.email 
      },
      JWT_CONFIG.secret,
      { 
        expiresIn: JWT_CONFIG.expiresIn
      }
    );

    return Response.json(
      {
        message: "User registered successfully",
        user: {
          userid: newUser.userid,
          username: newUser.username,
          email: newUser.email,
          createdat: newUser.createdat
        },
        token,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Registration error: ", error);
    
    // Handle specific database errors
    if (error.code === '23505') { // Unique violation
      return Response.json(
        { error: "Username or email already exists." },
        { status: 409 }
      );
    }
    
    return Response.json(
      { error: "Internal server error" }, 
      { status: 500 }
    );
  } finally {
    if (client) client.release();
  }
}

// --- Validation helpers ---
function isValidUsername(username: string): boolean {
  const regex = /^(?=.*[A-Za-z])[A-Za-z_]+$/;
  return regex.test(username) && username.length >= 3;
}

function isStrongPassword(password: string): boolean {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  return regex.test(password);
}

function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}