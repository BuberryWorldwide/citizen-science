'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { syncPendingData } from '@/lib/offline/sync';
import { OfflineStore } from '@/lib/offline/store';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);

  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await OfflineStore.getPendingCount();
      setPendingCount(count);
    } catch {
      // IndexedDB not available (SSR)
    }
  }, []);

  const doSync = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      const result = await syncPendingData();
      if (result.synced > 0) {
        await refreshPendingCount();
      }
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [refreshPendingCount]);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    refreshPendingCount();

    const handleOnline = () => {
      setIsOnline(true);
      doSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Try syncing on mount if online
    if (navigator.onLine) doSync();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [doSync, refreshPendingCount]);

  return { isOnline, pendingCount, syncing, refreshPendingCount, doSync };
}
