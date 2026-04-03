import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.BACKEND_API_URL || 'https://api.buberryworldwide.com';

export async function POST(request: NextRequest) {
  try {
    // Get the form data from the client
    const formData = await request.formData();
    const image = formData.get('image') as File | null;
    const organ = formData.get('organ') as string || 'leaf';

    if (!image) {
      return NextResponse.json({ success: false, error: 'No image provided' }, { status: 400 });
    }

    // Convert to buffer and forward to backend as raw bytes
    const buffer = Buffer.from(await image.arrayBuffer());

    const res = await fetch(`${API_BASE}/api/photos/identify?organ=${organ}`, {
      method: 'POST',
      body: buffer,
      headers: { 'Content-Type': 'image/jpeg' },
    });

    const json = await res.json();
    return NextResponse.json(json);
  } catch (error) {
    console.error('Identify proxy error:', error);
    return NextResponse.json({ success: false, error: 'Identification failed' }, { status: 500 });
  }
}
