import { useState, useEffect, useCallback } from 'react';
import { offlineStorage } from '@/lib/offlineStorage';
import { syncQueue } from '@/lib/syncQueue';
import { useNetworkStatus } from './useNetworkStatus';
import { toast } from 'sonner';

interface UseOfflineSyncOptions {
  table: string;
  enabled?: boolean;
}

export function useOfflineSync({ table, enabled = true }: UseOfflineSyncOptions) {
  const { isOnline, wasOffline } = useNetworkStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  // Update pending count
  const updatePendingCount = useCallback(async () => {
    if (!enabled) return;
    const count = await syncQueue.getPendingCount();
    setPendingCount(count);
  }, [enabled]);

  // Queue an offline mutation
  const queueMutation = useCallback(
    async (operation: 'insert' | 'update' | 'delete', data: any) => {
      if (!enabled) return;

      try {
        await syncQueue.queueMutation(table, operation, data);
        await updatePendingCount();
        
        if (!isOnline) {
          toast.info('Changes saved offline. Will sync when connection is restored.');
        }
      } catch (error) {
        console.error('Failed to queue mutation:', error);
        toast.error('Failed to save changes offline');
        throw error;
      }
    },
    [table, enabled, isOnline, updatePendingCount]
  );

  // Manually trigger sync
  const triggerSync = useCallback(async () => {
    if (!enabled || !isOnline || isSyncing) return;

    setIsSyncing(true);
    toast.loading('Syncing offline changes...', { id: 'sync-toast' });

    try {
      const result = await syncQueue.syncPendingMutations();
      
      if (result.synced > 0) {
        toast.success(`Synced ${result.synced} change${result.synced > 1 ? 's' : ''}`, {
          id: 'sync-toast',
        });
      } else if (result.failed > 0) {
        toast.error(`Failed to sync ${result.failed} change${result.failed > 1 ? 's' : ''}`, {
          id: 'sync-toast',
        });
      } else {
        toast.dismiss('sync-toast');
      }

      await updatePendingCount();
      
      const syncTime = await offlineStorage.getLastSyncTime('lastSync');
      setLastSyncTime(syncTime);
    } catch (error) {
      console.error('Sync failed:', error);
      toast.error('Sync failed. Will retry automatically.', { id: 'sync-toast' });
    } finally {
      setIsSyncing(false);
    }
  }, [enabled, isOnline, isSyncing, updatePendingCount]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (enabled && wasOffline && isOnline) {
      triggerSync();
    }
  }, [enabled, wasOffline, isOnline, triggerSync]);

  // Initialize and listen for sync events
  useEffect(() => {
    if (!enabled) return;

    // Initialize storage
    offlineStorage.init();

    // Update pending count periodically
    updatePendingCount();
    const interval = setInterval(updatePendingCount, 5000);

    // Get last sync time
    offlineStorage.getLastSyncTime('lastSync').then(setLastSyncTime);

    // Listen for sync completion
    const unsubscribe = syncQueue.onSyncComplete((result) => {
      updatePendingCount();
      if (result.synced > 0) {
        offlineStorage.getLastSyncTime('lastSync').then(setLastSyncTime);
      }
    });

    // Listen for service worker messages
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SYNC_REQUESTED') {
        triggerSync();
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleMessage);

    return () => {
      clearInterval(interval);
      unsubscribe();
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, [enabled, updatePendingCount, triggerSync]);

  // Cache data locally
  const cacheData = useCallback(
    async (data: any[]) => {
      if (!enabled) return;
      try {
        await offlineStorage.setCachedData(table, data);
      } catch (error) {
        console.error('Failed to cache data:', error);
      }
    },
    [table, enabled]
  );

  // Get cached data
  const getCachedData = useCallback(async (): Promise<any[]> => {
    if (!enabled) return [];
    try {
      return await offlineStorage.getCachedData(table);
    } catch (error) {
      console.error('Failed to get cached data:', error);
      return [];
    }
  }, [table, enabled]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    lastSyncTime,
    queueMutation,
    triggerSync,
    cacheData,
    getCachedData,
  };
}
