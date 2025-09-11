// app/api/(auth)/google/route.ts
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { SignJWT } from "jose";
import { JWT_CONFIG } from "@/lib/jwt";

export async function POST(request: NextRequest) {
  let dbClient;
  try {
    const { token: googleToken } = await request.json();

    if (!googleToken) {
      return NextResponse.json(
        { error: "Google token is required" },
        { status: 400 }
      );
    }

    // Verify Google token using Google's API
    const response = await fetch(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${googleToken}`
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Invalid Google token" },
        { status: 400 }
      );
    }

    const payload = await response.json();

    if (!payload || !payload.email) {
      return NextResponse.json(
        { error: "Invalid Google token payload" },
        { status: 400 }
      );
    }

    // Additional validation: check audience matches our client ID
    if (payload.aud !== process.env.GOOGLE_CLIENT_ID) {
      return NextResponse.json(
        { error: "Invalid token audience" },
        { status: 400 }
      );
    }

    const { email, name, picture } = payload;
    
    // Generate username from email
    const username = email.includes('@') ? email.split('@')[0] : email;
    
    // Ensure username is valid (only letters, numbers, underscores)
    const cleanUsername = username.replace(/[^a-zA-Z0-9_]/g, '_');

    dbClient = await pool.connect();

    // Check if user already exists by email
    const existingUser = await dbClient.query(
      "SELECT userid, username, email, createdat FROM users WHERE email = $1",
      [email]
    );

    let user;
    
    if (existingUser.rows.length > 0) {
      // User exists, return their data
      user = existingUser.rows[0];
    } else {
      // Create new user - handle potential username conflicts
      let finalUsername = cleanUsername;
      let counter = 1;
      
      // Check if username already exists
      let usernameExists = await dbClient.query(
        "SELECT userid FROM users WHERE username = $1",
        [finalUsername]
      );
      
      // If username exists, append numbers until we find an available one
      while (usernameExists.rows.length > 0) {
        finalUsername = `${cleanUsername}${counter}`;
        usernameExists = await dbClient.query(
          "SELECT userid FROM users WHERE username = $1",
          [finalUsername]
        );
        counter++;
      }
      
      // Insert new user with is_google_account = true
      const result = await dbClient.query(
        `INSERT INTO users (username, email, password, is_google_account) 
         VALUES ($1, $2, $3, $4) 
         RETURNING userid, username, email, createdat`,
        [finalUsername, email, 'google_oauth', true]  // is_google_account = true
      );
      user = result.rows[0];
    }

    // Generate JWT token
    const secret = new TextEncoder().encode(JWT_CONFIG.secret);
    const token = await new SignJWT({
      userId: user.userid,
      username: user.username,
      email: user.email,
      isGoogleAccount: true,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(JWT_CONFIG.expiresIn)
      .sign(secret);

    return NextResponse.json({
      message: "Google authentication successful",
      user: {
        userid: user.userid,
        username: user.username,
        email: user.email,
        createdat: user.createdat,
        isGoogleAccount: true,
      },
      token,
    });

  } catch (error: any) {
    console.error("Google OAuth error: ", error);
    return NextResponse.json(
      { error: "Google authentication failed. Please try again." },
      { status: 500 }
    );
  } finally {
    if (dbClient) dbClient.release();
  }
}