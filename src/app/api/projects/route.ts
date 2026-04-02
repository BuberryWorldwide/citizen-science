import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-client';
import { moderate } from '@/lib/moderation';

export async function GET() {
  const json = await backendFetch('/api/projects');
  return NextResponse.json(json);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const mod = moderate({ name: body.name, description: body.description });
  if (!mod.passed) {
    return NextResponse.json({ success: false, error: `Inappropriate content in ${mod.field}` }, { status: 400 });
  }
  const json = await backendFetch('/api/projects', { method: 'POST', body: JSON.stringify(body) });
  return NextResponse.json(json, { status: json.success ? 201 : 500 });
}
