import { OfflineStore } from './store';

export async function syncPendingData(): Promise<{ synced: number; errors: string[] }> {
  const trees = await OfflineStore.getPendingTrees();
  const observations = await OfflineStore.getPendingObservations();

  if (trees.length === 0 && observations.length === 0) {
    return { synced: 0, errors: [] };
  }

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

    // Clear synced items from IndexedDB
    for (const tree of trees) {
      await OfflineStore.removePendingTree(tree.local_id);
    }
    for (const obs of observations) {
      await OfflineStore.removePendingObservation(obs.local_id);
    }

    const synced = (json.data.trees?.length || 0) + (json.data.observations?.length || 0);
    return { synced, errors: json.data.errors || [] };
  } catch (err) {
    return { synced: 0, errors: [(err as Error).message] };
  }
}
