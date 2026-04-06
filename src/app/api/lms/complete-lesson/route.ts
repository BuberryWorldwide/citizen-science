import { NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-client';
import { getCurrentUserId } from '@/lib/auth/session';

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }
  const body = await req.json();
  const json = await backendFetch('/api/lms/complete-lesson', {
    method: 'POST',
    body: JSON.stringify(body),
    userId,
  });
  return NextResponse.json(json);
}
