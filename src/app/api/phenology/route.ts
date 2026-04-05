import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-client';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams.toString();
  const json = await backendFetch(`/api/phenology/current?${params}`);
  return NextResponse.json(json);
}
