import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-client';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams.toString();
  const json = await backendFetch(`/api/export?${params}`);
  return NextResponse.json(json);
}
