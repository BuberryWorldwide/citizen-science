import { NextRequest, NextResponse } from 'next/server';
import { TreeManager } from '@/lib/db/trees';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tree = await TreeManager.getById(id);
    if (!tree) {
      return NextResponse.json({ success: false, error: 'Tree not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: tree });
  } catch (error) {
    console.error('Error fetching tree:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch tree' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const tree = await TreeManager.update(id, body);
    if (!tree) {
      return NextResponse.json({ success: false, error: 'Tree not found or no changes' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: tree });
  } catch (error) {
    console.error('Error updating tree:', error);
    return NextResponse.json({ success: false, error: 'Failed to update tree' }, { status: 500 });
  }
}
