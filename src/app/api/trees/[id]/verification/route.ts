import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-client';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const json = await backendFetch(`/api/trees/${id}/verification`);
  return NextResponse.json(json, { status: json.success ? 200 : 404 });
}
