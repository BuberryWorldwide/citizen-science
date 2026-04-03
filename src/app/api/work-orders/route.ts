import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-client';
import { getCurrentUserId } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams.toString();
  const userId = await getCurrentUserId();
  const json = await backendFetch(`/api/work-orders?${searchParams}`, {
    userId: userId || undefined,
  });
  return NextResponse.json(json);
}
