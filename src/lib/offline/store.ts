import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'citizen-science';
const DB_VERSION = 1;

interface PendingTree {
  local_id: string;
  species?: string;
  species_variety?: string;
  lat: number;
  lon: number;
  accessibility?: string;
  use_potential?: string[];
  notes?: string;
  health?: string;
  trunk_width?: string;
  phenology?: string;
  observation_notes?: string;
  created_at: string;
  synced: boolean;
}

interface PendingObservation {
  local_id: string;
  tree_id: string;
  health?: string;
  trunk_width?: string;
  phenology?: string;
  notes?: string;
  created_at: string;
  synced: boolean;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('pendingTrees')) {
          db.createObjectStore('pendingTrees', { keyPath: 'local_id' });
        }
        if (!db.objectStoreNames.contains('pendingObservations')) {
          db.createObjectStore('pendingObservations', { keyPath: 'local_id' });
        }
        if (!db.objectStoreNames.contains('pendingPhotos')) {
          db.createObjectStore('pendingPhotos', { keyPath: 'local_id' });
        }
      },
    });
  }
  return dbPromise;
}

export const OfflineStore = {
  async addPendingTree(tree: PendingTree) {
    const db = await getDB();
    await db.put('pendingTrees', tree);
  },

  async addPendingObservation(obs: PendingObservation) {
    const db = await getDB();
    await db.put('pendingObservations', obs);
  },

  async getPendingTrees(): Promise<PendingTree[]> {
    const db = await getDB();
    return db.getAll('pendingTrees');
  },

  async getPendingObservations(): Promise<PendingObservation[]> {
    const db = await getDB();
    return db.getAll('pendingObservations');
  },

  async removePendingTree(localId: string) {
    const db = await getDB();
    await db.delete('pendingTrees', localId);
  },

  async removePendingObservation(localId: string) {
    const db = await getDB();
    await db.delete('pendingObservations', localId);
  },

  async getPendingCount(): Promise<number> {
    const db = await getDB();
    const trees = await db.count('pendingTrees');
    const obs = await db.count('pendingObservations');
    return trees + obs;
  },
};
