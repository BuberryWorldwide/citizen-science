import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-client';
import { getCurrentUserId } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const userId = await getCurrentUserId();
  const json = await backendFetch('/api/sync', {
    method: 'POST',
    body: JSON.stringify(body),
    userId: userId || undefined,
  });
  return NextResponse.json(json);
}
