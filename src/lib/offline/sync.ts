import { OfflineStore, PendingPhoto } from './store';
import { compressImage } from '@/lib/image';

export async function syncPendingData(): Promise<{ synced: number; errors: string[] }> {
  const trees = await OfflineStore.getPendingTrees();
  const observations = await OfflineStore.getPendingObservations();
  const photos = await OfflineStore.getPendingPhotos();

  if (trees.length === 0 && observations.length === 0 && photos.length === 0) {
    return { synced: 0, errors: [] };
  }

  const errors: string[] = [];
  let synced = 0;

  // Sync trees and observations first
  if (trees.length > 0 || observations.length > 0) {
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trees, observations }),
      });

      const json = await res.json();
      if (!json.success) {
        return { synced: 0, errors: [json.error || 'Sync failed'] };
      }

      // Clear synced items
      for (const tree of trees) {
        await OfflineStore.removePendingTree(tree.local_id);
      }
      for (const obs of observations) {
        await OfflineStore.removePendingObservation(obs.local_id);
      }

      synced += (json.data.trees?.length || 0) + (json.data.observations?.length || 0);
      if (json.data.errors?.length) errors.push(...json.data.errors);

      // Resolve photo observation IDs from sync results
      // Trees sync returns server IDs in order — map tree_local_id → first observation
      // Observations sync returns server IDs in order
      await resolvePhotoObservationIds(photos, trees, observations, json.data);
    } catch (err) {
      return { synced: 0, errors: [(err as Error).message] };
    }
  }

  // Now sync photos
  const remainingPhotos = await OfflineStore.getPendingPhotos();
  for (const photo of remainingPhotos) {
    if (!photo.observation_id) {
      // Can't upload without an observation ID — need to resolve on next sync
      errors.push(`Photo ${photo.local_id}: no observation_id yet`);
      continue;
    }

    try {
      const file = new File(
        [photo.data],
        photo.filename,
        { type: photo.content_type }
      );
      const compressed = await compressImage(file);

      // Get presigned URL
      const res = await fetch('/api/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          observation_id: photo.observation_id,
          filename: compressed.name,
          content_type: compressed.type,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      // Upload to MinIO
      await fetch(json.data.upload_url, {
        method: 'PUT',
        body: compressed,
        headers: { 'Content-Type': compressed.type },
      });

      await OfflineStore.removePendingPhoto(photo.local_id);
      synced++;
    } catch (err) {
      errors.push(`Photo upload failed: ${(err as Error).message}`);
    }
  }

  return { synced, errors };
}

async function resolvePhotoObservationIds(
  photos: PendingPhoto[],
  trees: { local_id: string }[],
  observations: { local_id: string }[],
  syncResult: { trees?: string[]; observations?: string[] }
) {
  // For photos linked to observations that just synced
  const obsIdMap = new Map<string, string>();
  if (syncResult.observations) {
    observations.forEach((obs, i) => {
      if (syncResult.observations![i]) {
        obsIdMap.set(obs.local_id, syncResult.observations![i]);
      }
    });
  }

  // For photos linked to trees — the tree sync creates observations too.
  // We need to fetch the tree to find the observation ID.
  const treeIdMap = new Map<string, string>();
  if (syncResult.trees) {
    for (let i = 0; i < trees.length; i++) {
      const treeId = syncResult.trees[i];
      if (treeId) {
        treeIdMap.set(trees[i].local_id, treeId);
      }
    }
  }

  for (const photo of photos) {
    let resolved = false;

    if (photo.observation_local_id && obsIdMap.has(photo.observation_local_id)) {
      photo.observation_id = obsIdMap.get(photo.observation_local_id);
      resolved = true;
    }

    if (photo.tree_local_id && treeIdMap.has(photo.tree_local_id)) {
      // Fetch the tree to find its first observation
      try {
        const treeId = treeIdMap.get(photo.tree_local_id)!;
        const res = await fetch(`/api/trees/${treeId}`);
        const json = await res.json();
        if (json.success && json.data.observations?.length > 0) {
          photo.observation_id = json.data.observations[0].id;
          resolved = true;
        }
      } catch { /* will retry next sync */ }
    }

    if (resolved) {
      await OfflineStore.addPendingPhoto(photo); // update in IDB
    }
  }
}
