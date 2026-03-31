import { NextRequest, NextResponse } from 'next/server';
import { ProjectManager } from '@/lib/db/projects';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    if (!body.tree_id) {
      return NextResponse.json({ success: false, error: 'tree_id is required' }, { status: 400 });
    }
    await ProjectManager.addTree(id, body.tree_id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding tree to project:', error);
    return NextResponse.json({ success: false, error: 'Failed to add tree' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    if (!body.tree_id) {
      return NextResponse.json({ success: false, error: 'tree_id is required' }, { status: 400 });
    }
    await ProjectManager.removeTree(id, body.tree_id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing tree from project:', error);
    return NextResponse.json({ success: false, error: 'Failed to remove tree' }, { status: 500 });
  }
}
