import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { query } from '@/lib/db/connection';
import { getUploadUrl, getPublicUrl } from '@/lib/storage/minio';
import { PointsManager } from '@/lib/db/points';
import { getCurrentUserId } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { observation_id, filename, content_type } = body;

    if (!observation_id || !filename || !content_type) {
      return NextResponse.json(
        { success: false, error: 'observation_id, filename, and content_type are required' },
        { status: 400 }
      );
    }

    const storageKey = `observations/${observation_id}/${uuidv4()}-${filename}`;
    const uploadUrl = await getUploadUrl(storageKey, content_type);
    const publicUrl = getPublicUrl(storageKey);

    const result = await query(
      `INSERT INTO observation_photos (observation_id, storage_key, url)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [observation_id, storageKey, publicUrl]
    );

    const photoId = result.rows[0].id;

    const userId = await getCurrentUserId();
    if (userId) {
      await PointsManager.award(userId, 'photo_uploaded', photoId);
    }

    return NextResponse.json({
      success: true,
      data: { upload_url: uploadUrl, photo_id: photoId, storage_key: storageKey },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating photo upload:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create photo upload' },
      { status: 500 }
    );
  }
}
