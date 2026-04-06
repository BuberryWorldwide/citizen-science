import { NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-client';

export async function GET() {
  const json = await backendFetch('/api/lms/courses');
  return NextResponse.json(json);
}
