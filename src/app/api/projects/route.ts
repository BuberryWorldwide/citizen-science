import { NextRequest, NextResponse } from 'next/server';
import { ProjectManager } from '@/lib/db/projects';
import { moderate } from '@/lib/moderation';

export async function GET() {
  try {
    const projects = await ProjectManager.list();
    return NextResponse.json({ success: true, data: projects });
  } catch (error) {
    console.error('Error listing projects:', error);
    return NextResponse.json({ success: false, error: 'Failed to list projects' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ success: false, error: 'name is required' }, { status: 400 });
    }

    const mod = moderate({ name: body.name, description: body.description });
    if (!mod.passed) {
      return NextResponse.json({ success: false, error: `Inappropriate content in ${mod.field}` }, { status: 400 });
    }

    const project = await ProjectManager.create(body.name, body.description);

    // Optionally add trees at creation time
    if (body.tree_ids?.length) {
      for (const treeId of body.tree_ids) {
        await ProjectManager.addTree(project.id, treeId);
      }
    }

    return NextResponse.json({ success: true, data: project }, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ success: false, error: 'Failed to create project' }, { status: 500 });
  }
}
