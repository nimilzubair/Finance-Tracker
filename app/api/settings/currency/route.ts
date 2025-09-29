// app/api/settings/currency/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import jwt from 'jsonwebtoken';
import { PoolClient } from 'pg';

function getUserIdFromRequest(req: NextRequest): string | null {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    console.error('JWT_SECRET is not defined');
    return null;
  }
  
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded.userId || decoded.id || null;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

// Helper function to validate currency code
// In app/api/settings/currency/route.ts - Update the validation function
async function isValidCurrency(currency: string): Promise<boolean> {
  // Our top supported currencies
  const TOP_CURRENCIES = ['USD', 'EUR', 'GBP', 'PKR', 'AED'];
  
  // First check against our top currencies
  if (TOP_CURRENCIES.includes(currency.toUpperCase())) {
    return true;
  }

  // If not in our top list, validate with external API
  try {
    const res = await fetch("https://api.frankfurter.app/currencies");
    if (!res.ok) return false;
    
    const data = await res.json();
    return !!data[currency.toUpperCase()];
  } catch (error) {
    console.error('Currency validation error:', error);
    // Fallback to basic format validation if API fails
    return typeof currency === 'string' && currency.length === 3 && /^[A-Z]{3}$/.test(currency);
  }
}
// GET - Retrieve user's currency
export async function GET(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let client: PoolClient | undefined;
  try {
    client = await pool.connect();
    const result = await client.query(
      'SELECT currency FROM user_settings WHERE userid = $1',
      [userId]
    );
    
    const currency = result.rows[0]?.currency || 'PKR';
    return NextResponse.json({ currency });
  } catch (err) {
    console.error('Database error in GET currency:', err);
    return NextResponse.json(
      { error: 'Failed to fetch currency settings' }, 
      { status: 500 }
    );
  } finally {
    client?.release();
  }
}

// PUT - Update user currency (main method)
export async function PUT(request: NextRequest) {
  let client: PoolClient | undefined;
  
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { currency } = await request.json();
    if (!currency) {
      return NextResponse.json({ error: "Currency code is required" }, { status: 400 });
    }

    // Validate currency code format
    if (typeof currency !== 'string' || currency.length !== 3 || !/^[A-Za-z]{3}$/.test(currency)) {
      return NextResponse.json(
        { error: "Invalid currency format. Must be 3 uppercase letters." }, 
        { status: 400 }
      );
    }

    const currencyUpper = currency.toUpperCase();
    
    // Validate currency exists in external API
    const isValid = await isValidCurrency(currencyUpper);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid currency code" }, 
        { status: 400 }
      );
    }

    client = await pool.connect();
    
    await client.query('BEGIN');
    
    await client.query(`
      INSERT INTO user_settings (userid, currency)
      VALUES ($1, $2)
      ON CONFLICT (userid) DO UPDATE SET currency = $2
    `, [userId, currencyUpper]);
    
    await client.query('COMMIT');

    return NextResponse.json({ 
      message: "Currency updated successfully", 
      currency: currencyUpper 
    });
    
  } catch (err) {
    await client?.query('ROLLBACK');
    console.error("Error updating currency:", err);
    return NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    );
  } finally {
    client?.release();
  }
}

// POST - Alternative method (keeping but you could remove if redundant)
export async function POST(req: NextRequest) {
  // Simply call PUT handler to avoid code duplication
  return PUT(req);
}