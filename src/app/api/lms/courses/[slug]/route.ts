import { NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-client';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const json = await backendFetch(`/api/lms/courses/${slug}`);
  return NextResponse.json(json);
}
