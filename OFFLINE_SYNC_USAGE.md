# Offline-First Functionality Usage Guide

This guide explains how to use the offline-first features implemented in ReflowAI GP Assistant.

## Overview

The offline-first functionality allows mobile field staff to work without internet connectivity and automatically sync changes when connection is restored.

## Key Features

- **Service Worker**: Caches static assets and API responses
- **IndexedDB Storage**: Local database for offline data persistence
- **Sync Queue**: Automatic synchronization of pending mutations
- **Network Detection**: Real-time online/offline status monitoring
- **UI Indicators**: Visual feedback for offline mode and sync status

## Using Offline Sync in Components

### Basic Setup

```typescript
import { useOfflineSync } from '@/hooks/useOfflineSync';

function MyComponent() {
  const {
    isOnline,
    pendingCount,
    isSyncing,
    lastSyncTime,
    queueMutation,
    triggerSync,
    cacheData,
    getCachedData,
  } = useOfflineSync({ table: 'tasks', enabled: true });
}
```

### Fetching Data with Offline Support

```typescript
const fetchTasks = async () => {
  try {
    if (isOnline) {
      // Fetch from server when online
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('due_at', { ascending: true });

      if (error) throw error;

      // Cache the data for offline use
      await cacheData(data || []);
      return data || [];
    } else {
      // Load from cache when offline
      const cachedTasks = await getCachedData();
      toast.info('Showing cached data (offline mode)');
      return cachedTasks;
    }
  } catch (error) {
    // Fallback to cache on error
    return await getCachedData();
  }
};
```

### Creating Records Offline

```typescript
const createTask = async (taskData: any) => {
  try {
    if (isOnline) {
      // Create directly when online
      const { data, error } = await supabase
        .from('tasks')
        .insert(taskData)
        .select()
        .single();

      if (error) throw error;
      toast.success('Task created');
      return data;
    } else {
      // Queue for later when offline
      await queueMutation('insert', taskData);
      toast.success('Task saved offline. Will sync when connection is restored.');
      return taskData;
    }
  } catch (error) {
    console.error('Failed to create task:', error);
    toast.error('Failed to create task');
    throw error;
  }
};
```

### Updating Records Offline

```typescript
const updateTask = async (taskId: string, updates: any) => {
  try {
    if (isOnline) {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      toast.success('Task updated');
      return data;
    } else {
      await queueMutation('update', { id: taskId, ...updates });
      toast.success('Update saved offline. Will sync when connection is restored.');
      return { id: taskId, ...updates };
    }
  } catch (error) {
    console.error('Failed to update task:', error);
    toast.error('Failed to update task');
    throw error;
  }
};
```

### Deleting Records Offline

```typescript
const deleteTask = async (taskId: string) => {
  try {
    if (isOnline) {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      toast.success('Task deleted');
    } else {
      await queueMutation('delete', { id: taskId });
      toast.success('Deletion saved offline. Will sync when connection is restored.');
    }
  } catch (error) {
    console.error('Failed to delete task:', error);
    toast.error('Failed to delete task');
    throw error;
  }
};
```

## Manual Sync Trigger

```typescript
function SyncButton() {
  const { triggerSync, isSyncing, pendingCount } = useOfflineSync({
    table: 'tasks',
    enabled: true,
  });

  return (
    <Button
      onClick={triggerSync}
      disabled={isSyncing || pendingCount === 0}
    >
      {isSyncing ? 'Syncing...' : `Sync ${pendingCount} changes`}
    </Button>
  );
}
```

## Network Status Hook

```typescript
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

function MyComponent() {
  const { isOnline, wasOffline } = useNetworkStatus();

  return (
    <div>
      {!isOnline && <p>You are offline</p>}
      {wasOffline && isOnline && <p>Connection restored!</p>}
    </div>
  );
}
```

## Offline Indicator Component

The `OfflineIndicator` component is automatically included in `AppLayout` and displays:
- Offline mode badge when disconnected
- "Back Online" notification with sync button when reconnected
- Sync button when there are pending changes
- Loading indicator during sync

## Service Worker

The service worker automatically:
- Caches static assets on install
- Uses network-first strategy for API calls
- Falls back to cache when offline
- Cleans up old caches on activation
- Supports background sync

## IndexedDB Storage

Three object stores are used:
- **cachedData**: Stores cached server responses
- **pendingMutations**: Stores offline mutations to be synced
- **syncMetadata**: Stores sync timestamps and metadata

## Auto-Sync Behavior

The system automatically syncs when:
- Connection is restored after being offline
- Service worker triggers background sync
- Manually triggered via `triggerSync()`
- Every 5 seconds (checks for pending mutations)

## Best Practices

1. **Always cache data after successful fetches** to ensure offline access
2. **Use queueMutation for all write operations** when offline
3. **Handle both online and offline states** in your fetch functions
4. **Provide user feedback** with toasts for offline operations
5. **Test offline behavior** by using browser DevTools Network throttling
6. **Limit cached data size** by only caching essential information
7. **Handle sync conflicts** appropriately for your use case

## Testing Offline Mode

1. Open Chrome DevTools
2. Go to Application > Service Workers
3. Check "Offline" checkbox
4. Test creating/updating/deleting records
5. Uncheck "Offline" to restore connection
6. Verify auto-sync triggers and data syncs successfully

## Troubleshooting

- **Service worker not registering**: Check browser console for errors
- **Data not caching**: Verify `cacheData()` is called after fetches
- **Sync failing**: Check IndexedDB in DevTools Application tab
- **Mutations not queuing**: Ensure `queueMutation()` is called when offline
