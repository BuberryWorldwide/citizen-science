import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-client';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const json = await backendFetch(`/api/projects/${id}/trees`);
  return NextResponse.json(json);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const json = await backendFetch(`/api/projects/${id}/trees`, { method: 'POST', body: JSON.stringify(body) });
  return NextResponse.json(json);
}
