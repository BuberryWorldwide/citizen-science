import { NextRequest, NextResponse } from 'next/server';
import { ProjectManager } from '@/lib/db/projects';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await ProjectManager.getById(id);
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }
    const trees = await ProjectManager.getProjectTrees(id);
    return NextResponse.json({ success: true, data: { ...project, trees } });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch project' }, { status: 500 });
  }
}
