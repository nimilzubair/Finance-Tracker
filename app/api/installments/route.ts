// app/api/installments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { PoolClient } from 'pg';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

// Extract user ID from JWT
function getUserIdFromRequest(request: NextRequest): number | null {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded.userId || decoded.id || null;
  } catch (err) {
    console.error('JWT verification error:', err);
    return null;
  }
}

// Centralized payment amount calculation
function calculatePaymentAmount(
  totalAmount: number, 
  advance: number, 
  frequency: string, 
  duration: number, 
  intervalDays?: number
): number {
  const principal = totalAmount - advance;
  
  switch(frequency) {
    case 'weekly':
      return principal / Math.ceil(duration * 30 / 7);
    case 'bi-weekly':
      return principal / Math.ceil(duration * 30 / 14);
    case 'monthly':
      return principal / duration;
    case 'quarterly':
      return principal / Math.ceil(duration / 3);
    case 'yearly':
      return principal / Math.ceil(duration / 12);
    case 'custom':
      return intervalDays ? principal / Math.ceil(duration * 30 / intervalDays) : principal / duration;
    default:
      return principal / duration;
  }
}

// Calculate next payment date based on frequency
function calculateNextPaymentDate(
  startDate: Date, 
  frequency: string, 
  paymentsMade: number, 
  customDays?: number
): Date {
  const nextDate = new Date(startDate);

  switch (frequency) {
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + paymentsMade * 7);
      break;
    case 'bi-weekly':
      nextDate.setDate(nextDate.getDate() + paymentsMade * 14);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + paymentsMade);
      break;
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + paymentsMade * 3);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + paymentsMade);
      break;
    case 'custom':
      if (customDays) nextDate.setDate(nextDate.getDate() + paymentsMade * customDays);
      break;
    default:
      nextDate.setMonth(nextDate.getMonth() + paymentsMade);
      break;
  }
  return nextDate;
}

// Calculate total periods for a payment frequency
function calculateTotalPeriods(frequency: string, duration: number, intervalDays?: number): number {
  switch(frequency) {
    case 'weekly':
      return Math.ceil(duration * 30 / 7);
    case 'bi-weekly':
      return Math.ceil(duration * 30 / 14);
    case 'monthly':
      return duration;
    case 'quarterly':
      return Math.ceil(duration / 3);
    case 'yearly':
      return Math.ceil(duration / 12);
    case 'custom':
      return intervalDays ? Math.ceil(duration * 30 / intervalDays) : duration;
    default:
      return duration;
  }
}

// Update installment status based on payments
async function updateInstallmentStatus(installmentId: number, client: PoolClient) {
  try {
    const res = await client.query(`
      SELECT 
        i.*,
        COALESCE(SUM(id.amountpaid), 0) AS total_paid,
        COUNT(CASE WHEN id.is_advance = false THEN 1 END) AS payments_made
      FROM installments i
      LEFT JOIN installment_details id ON i.installmentid = id.installmentid
      WHERE i.installmentid = $1
      GROUP BY i.installmentid
    `, [installmentId]);

    if (!res.rows.length) return;
    
    const inst = res.rows[0];
    const totalPaid = parseFloat(inst.total_paid);
    const totalAmount = parseFloat(inst.totalamount);
    const remaining = totalAmount - totalPaid;
    let newStatus = inst.status;

    if (remaining <= 0.01) {
      newStatus = 'completed';
    } else if (newStatus !== 'paused') {
      const paymentsMade = parseInt(inst.payments_made);
      const nextDue = calculateNextPaymentDate(
        new Date(inst.startdate), 
        inst.payment_frequency, 
        paymentsMade, 
        inst.payment_interval_days
      );
      const today = new Date();
      
      if (today > nextDue) {
        newStatus = 'overdue';
      } else if (newStatus === 'overdue') {
        newStatus = 'active';
      }
    }

    if (newStatus !== inst.status) {
      await client.query(
        'UPDATE installments SET status = $1, updatedat = CURRENT_TIMESTAMP WHERE installmentid = $2', 
        [newStatus, installmentId]
      );
    }
  } catch (error) {
    console.error('Error updating installment status:', error);
  }
}

// GET - list installments with all calculations
export async function GET(request: NextRequest) {
  let client: PoolClient | undefined;
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const frequency = searchParams.get('frequency');
    const search = searchParams.get('search');

    client = await pool.connect();

    // Simplified query - calculate amounts in JavaScript for consistency
    let query = `
      SELECT 
        i.*,
        COALESCE(SUM(id.amountpaid), 0) AS total_paid,
        (i.totalamount - COALESCE(SUM(id.amountpaid), 0)) AS remaining_amount,
        COUNT(CASE WHEN id.is_advance = false THEN 1 END) AS payments_made
      FROM installments i
      LEFT JOIN installment_details id ON i.installmentid = id.installmentid
      WHERE i.userid = $1
    `;

    const params: any[] = [userId];
    let idx = 2;

    if (status && status !== 'all') { 
      query += ` AND i.status = $${idx}`; 
      params.push(status); 
      idx++; 
    }
    if (frequency && frequency !== 'all') { 
      query += ` AND i.payment_frequency = $${idx}`; 
      params.push(frequency); 
      idx++; 
    }
    if (search && search.trim()) { 
      query += ` AND (LOWER(i.installmenttitle) LIKE $${idx} OR LOWER(i.description) LIKE $${idx})`;
      params.push(`%${search.toLowerCase().trim()}%`); 
      idx++; 
    }

    query += ' GROUP BY i.installmentid ORDER BY i.startdate DESC';

    const result = await client.query(query, params);

    // Calculate consistent amounts and periods in JavaScript
    const installmentsWithCalculations = result.rows.map(inst => {
      const totalAmount = parseFloat(inst.totalamount);
      const advanceAmount = parseFloat(inst.advanceamount) || 0;
      const duration = parseInt(inst.installmentdurationinmonths);
      const paymentsMade = parseInt(inst.payments_made);
      
      const amountPerPeriod = calculatePaymentAmount(
        totalAmount,
        advanceAmount,
        inst.payment_frequency,
        duration,
        inst.payment_interval_days
      );
      
      const totalPeriods = calculateTotalPeriods(
        inst.payment_frequency,
        duration,
        inst.payment_interval_days
      );
      
      const periodsRemaining = Math.max(0, totalPeriods - paymentsMade);

      return {
        ...inst,
        total_paid: parseFloat(inst.total_paid),
        remaining_amount: parseFloat(inst.remaining_amount),
        payments_made: paymentsMade,
        amountperperiod: amountPerPeriod,
        periods_remaining: periodsRemaining,
        total_periods: totalPeriods
      };
    });

    // Update statuses asynchronously
    await Promise.all(
      installmentsWithCalculations.map(inst => 
        updateInstallmentStatus(inst.installmentid, client!)
      )
    );

    return NextResponse.json({ installments: installmentsWithCalculations });
  } catch (err) {
    console.error('Error fetching installments:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}

// POST - create new installment
export async function POST(request: NextRequest) {
  let client: PoolClient | undefined;
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });

    const body = await request.json();
    const { 
      installmenttitle, 
      startdate, 
      installmentdurationinmonths, 
      payment_frequency = 'monthly', 
      payment_interval_days, 
      totalamount, 
      advancepaid = false, 
      advanceamount = 0, 
      description = '' 
    } = body;

    // Validation
    if (!installmenttitle?.trim()) {
      return NextResponse.json({ error: 'Installment title required' }, { status: 400 });
    }
    if (!startdate) {
      return NextResponse.json({ error: 'Start date required' }, { status: 400 });
    }

    const duration = parseInt(installmentdurationinmonths);
    if (!duration || duration <= 0) {
      return NextResponse.json({ error: 'Valid duration required' }, { status: 400 });
    }

    const total = parseFloat(totalamount);
    if (!total || total <= 0) {
      return NextResponse.json({ error: 'Valid total amount required' }, { status: 400 });
    }

    const advance = parseFloat(advanceamount) || 0;
    if (advancepaid && advance <= 0) {
      return NextResponse.json({ error: 'Advance amount required when paid' }, { status: 400 });
    }
    if (advance >= total) {
      return NextResponse.json({ error: 'Advance must be less than total' }, { status: 400 });
    }

    if (payment_frequency === 'custom' && (!payment_interval_days || parseInt(payment_interval_days) <= 0)) {
      return NextResponse.json({ error: 'Custom frequency requires valid interval days' }, { status: 400 });
    }

    client = await pool.connect();

    // Calculate amount per period consistently
    const amountPerMonth = calculatePaymentAmount(
      total,
      advance,
      payment_frequency,
      duration,
      payment_interval_days ? parseInt(payment_interval_days) : undefined
    );

    // Insert installment
    const result = await client.query(`
      INSERT INTO installments (
        userid, installmenttitle, startdate, installmentdurationinmonths,
        payment_frequency, payment_interval_days, totalamount,
        advancepaid, advanceamount, amountpermonth, status, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', $11) RETURNING *
    `, [
      userId,
      installmenttitle.trim(),
      startdate,
      duration,
      payment_frequency,
      payment_frequency === 'custom' ? parseInt(payment_interval_days) : null,
      total,
      advancepaid,
      advance,
      amountPerMonth,
      description.trim()
    ]);

    const newInstallment = result.rows[0];

    // Handle advance payment if provided
    if (advancepaid && advance > 0) {
      await client.query(`
        INSERT INTO installment_details (
          installmentid, amountpaid, paiddate, is_advance, description
        ) VALUES ($1, $2, $3, true, 'Initial advance payment')
      `, [newInstallment.installmentid, advance, startdate]);
    }

    return NextResponse.json({ 
      message: 'Installment plan created successfully', 
      installment: newInstallment 
    }, { status: 201 });

  } catch (err) {
    console.error('Error creating installment:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally { 
    if (client) client.release(); 
  }
}

// PUT - update installment
export async function PUT(request: NextRequest) {
  let client: PoolClient | undefined;
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });

    const body = await request.json();
    const { installmentid, ...updateData } = body;
    if (!installmentid) return NextResponse.json({ error: 'Installment ID required' }, { status: 400 });

    client = await pool.connect();

    // Check ownership
    const ownership = await client.query(
      'SELECT installmentid FROM installments WHERE installmentid = $1 AND userid = $2', 
      [installmentid, userId]
    );
    if (!ownership.rows.length) {
      return NextResponse.json({ error: 'Unauthorized or not found' }, { status: 404 });
    }

    // Filter valid update fields
    const validFields = [
      'installmenttitle', 'startdate', 'installmentdurationinmonths', 
      'payment_frequency', 'payment_interval_days', 'totalamount', 
      'advancepaid', 'advanceamount', 'status', 'description'
    ];
    
    const fields = Object.keys(updateData).filter(k => 
      updateData[k] !== undefined && validFields.includes(k)
    );
    
    if (!fields.length) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Validate custom frequency
    if (updateData.payment_frequency === 'custom' && !updateData.payment_interval_days) {
      return NextResponse.json({ error: 'Custom frequency requires interval days' }, { status: 400 });
    }

    // Recalculate amountpermonth if relevant fields are updated
    if (fields.some(f => ['totalamount', 'advanceamount', 'payment_frequency', 'installmentdurationinmonths', 'payment_interval_days'].includes(f))) {
      const currentData = await client.query('SELECT * FROM installments WHERE installmentid = $1', [installmentid]);
      const current = currentData.rows[0];
      
      const newTotal = updateData.totalamount !== undefined ? parseFloat(updateData.totalamount) : parseFloat(current.totalamount);
      const newAdvance = updateData.advanceamount !== undefined ? parseFloat(updateData.advanceamount) : parseFloat(current.advanceamount);
      const newFreq = updateData.payment_frequency || current.payment_frequency;
      const newDuration = updateData.installmentdurationinmonths !== undefined ? parseInt(updateData.installmentdurationinmonths) : parseInt(current.installmentdurationinmonths);
      const newInterval = updateData.payment_interval_days !== undefined ? parseInt(updateData.payment_interval_days) : current.payment_interval_days;
      
      updateData.amountpermonth = calculatePaymentAmount(newTotal, newAdvance, newFreq, newDuration, newInterval);
    }

    const setClause = fields.map((f, i) => `${f} = $${i + 3}`).join(', ');
    const values = fields.map(f => updateData[f]);

    const result = await client.query(
      `UPDATE installments SET ${setClause}, updatedat = CURRENT_TIMESTAMP WHERE installmentid = $1 AND userid = $2 RETURNING *`, 
      [installmentid, userId, ...values]
    );

    return NextResponse.json({ 
      message: 'Installment updated successfully', 
      installment: result.rows[0] 
    });

  } catch(err) {
    console.error('Error updating installment:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally { 
    if (client) client.release(); 
  }
}

// DELETE - remove installment
export async function DELETE(request: NextRequest) {
  let client: PoolClient | undefined;
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const installmentId = searchParams.get('id');
    if (!installmentId) return NextResponse.json({ error: 'Installment ID required' }, { status: 400 });

    client = await pool.connect();

    // Delete installment (CASCADE will handle installment_details)
    const res = await client.query(
      'DELETE FROM installments WHERE installmentid = $1 AND userid = $2', 
      [installmentId, userId]
    );
    
    if (!res.rowCount) {
      return NextResponse.json({ error: 'Unauthorized or not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Installment deleted successfully' });

  } catch(err) {
    console.error('Error deleting installment:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally { 
    if (client) client.release(); 
  }
}