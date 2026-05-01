import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-client';
import { getCurrentUserId } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }
  const qs = request.nextUrl.search;
  const json = await backendFetch(`/api/work-orders/mine${qs}`, {
    userId,
  });
  return NextResponse.json(json);
}
