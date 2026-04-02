import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-client';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const json = await backendFetch('/api/auth/signup', { method: 'POST', body: JSON.stringify(body) });
  return NextResponse.json(json, { status: json.success ? 201 : (json._status || 500) });
}
