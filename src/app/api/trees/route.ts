import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-client';
import { getCurrentUserId } from '@/lib/auth/session';
import { moderate } from '@/lib/moderation';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams.toString();
  const json = await backendFetch(`/api/trees?${params}`);
  return NextResponse.json(json);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const userId = await getCurrentUserId();

  const mod = moderate({ species_variety: body.species_variety, notes: body.notes, observation_notes: body.observation_notes });
  if (!mod.passed) {
    return NextResponse.json({ success: false, error: `Inappropriate content in ${mod.field}` }, { status: 400 });
  }

  const json = await backendFetch('/api/trees', {
    method: 'POST',
    body: JSON.stringify(body),
    userId: userId || undefined,
  });
  return NextResponse.json(json, { status: json.success ? 201 : 500 });
}
