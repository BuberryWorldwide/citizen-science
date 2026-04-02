import { NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-client';

export async function GET() {
  const json = await backendFetch('/api/leaderboard');
  return NextResponse.json(json);
}
