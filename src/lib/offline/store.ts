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

export interface PendingPhoto {
  local_id: string;
  observation_local_id?: string; // links to PendingObservation.local_id
  observation_id?: string;       // server ID if observation was already synced
  tree_local_id?: string;        // links to PendingTree.local_id (for TagTreeForm photos)
  filename: string;
  content_type: string;
  data: ArrayBuffer;
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

  async addPendingPhoto(photo: PendingPhoto) {
    const db = await getDB();
    await db.put('pendingPhotos', photo);
  },

  async getPendingPhotos(): Promise<PendingPhoto[]> {
    const db = await getDB();
    return db.getAll('pendingPhotos');
  },

  async removePendingPhoto(localId: string) {
    const db = await getDB();
    await db.delete('pendingPhotos', localId);
  },

  async getPendingCount(): Promise<number> {
    const db = await getDB();
    const trees = await db.count('pendingTrees');
    const obs = await db.count('pendingObservations');
    const photos = await db.count('pendingPhotos');
    return trees + obs + photos;
  },
};
