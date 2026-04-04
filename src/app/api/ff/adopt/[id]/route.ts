import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-client';
import { getCurrentUserId } from '@/lib/auth/session';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  const json = await backendFetch(`/api/ff/adopt/${id}`, {
    method: 'POST',
    userId: userId || undefined,
  });
  return NextResponse.json(json, { status: json.success ? 201 : 500 });
}
