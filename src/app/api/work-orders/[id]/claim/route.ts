import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-client';
import { getCurrentUserId } from '@/lib/auth/session';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }
  const json = await backendFetch(`/api/work-orders/${id}/claim`, {
    method: 'POST',
    body: JSON.stringify({}),
    userId,
  });
  return NextResponse.json(json, { status: json.success ? 200 : 400 });
}
