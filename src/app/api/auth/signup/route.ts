import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { pool } from '@/lib/db/connection';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password || password.length < 6) {
      return NextResponse.json({ success: false, error: 'Email and password (6+ chars) required' }, { status: 400 });
    }

    // Check if user already exists
    const existing = await pool.query(
      'SELECT id FROM public."user" WHERE email = $1',
      [email]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json({ success: false, error: 'Email already registered' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO public."user" (email, password) VALUES ($1, $2) RETURNING id, email`,
      [email, hashedPassword]
    );

    return NextResponse.json({ success: true, data: { id: result.rows[0].id } }, { status: 201 });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ success: false, error: 'Signup failed' }, { status: 500 });
  }
}
