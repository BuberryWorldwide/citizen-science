import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-client';
import { getCurrentUserId } from '@/lib/auth/session';
import { moderate } from '@/lib/moderation';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const userId = await getCurrentUserId();

  const mod = moderate({ notes: body.notes });
  if (!mod.passed) {
    return NextResponse.json({ success: false, error: `Inappropriate content in ${mod.field}` }, { status: 400 });
  }

  const json = await backendFetch('/api/observations', {
    method: 'POST',
    body: JSON.stringify(body),
    userId: userId || undefined,
  });
  return NextResponse.json(json, { status: json.success ? 201 : 500 });
}
