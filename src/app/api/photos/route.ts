import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-client';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const json = await backendFetch('/api/photos', { method: 'POST', body: JSON.stringify(body) });
  return NextResponse.json(json);
}
