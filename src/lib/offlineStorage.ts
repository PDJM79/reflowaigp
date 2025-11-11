/**
 * IndexedDB wrapper for offline storage
 */

const DB_NAME = 'ReflowAIGP_Offline';
const DB_VERSION = 1;

interface OfflineRecord {
  id: string;
  table: string;
  data: any;
  timestamp: number;
  synced: boolean;
}

interface PendingMutation {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  data: any;
  timestamp: number;
  retryCount: number;
}

class OfflineStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store for cached data
        if (!db.objectStoreNames.contains('cachedData')) {
          const cachedStore = db.createObjectStore('cachedData', { keyPath: 'id' });
          cachedStore.createIndex('table', 'table', { unique: false });
          cachedStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Store for pending mutations
        if (!db.objectStoreNames.contains('pendingMutations')) {
          const mutationsStore = db.createObjectStore('pendingMutations', { keyPath: 'id' });
          mutationsStore.createIndex('timestamp', 'timestamp', { unique: false });
          mutationsStore.createIndex('table', 'table', { unique: false });
        }

        // Store for sync metadata
        if (!db.objectStoreNames.contains('syncMetadata')) {
          db.createObjectStore('syncMetadata', { keyPath: 'key' });
        }
      };
    });
  }

  // Cached Data Operations
  async getCachedData(table: string): Promise<any[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cachedData'], 'readonly');
      const store = transaction.objectStore('cachedData');
      const index = store.index('table');
      const request = index.getAll(table);

      request.onsuccess = () => resolve(request.result.map(r => r.data));
      request.onerror = () => reject(request.error);
    });
  }

  async setCachedData(table: string, data: any[]): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cachedData'], 'readwrite');
      const store = transaction.objectStore('cachedData');

      // Clear existing data for this table
      const index = store.index('table');
      const clearRequest = index.openCursor(IDBKeyRange.only(table));
      
      clearRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      // Add new data
      data.forEach((item) => {
        const record: OfflineRecord = {
          id: `${table}_${item.id}`,
          table,
          data: item,
          timestamp: Date.now(),
          synced: true,
        };
        store.put(record);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Pending Mutations Operations
  async addPendingMutation(
    table: string,
    operation: 'insert' | 'update' | 'delete',
    data: any
  ): Promise<string> {
    if (!this.db) await this.init();

    const mutationId = `${table}_${operation}_${Date.now()}_${Math.random()}`;
    const mutation: PendingMutation = {
      id: mutationId,
      table,
      operation,
      data,
      timestamp: Date.now(),
      retryCount: 0,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['pendingMutations'], 'readwrite');
      const store = transaction.objectStore('pendingMutations');
      const request = store.add(mutation);

      request.onsuccess = () => resolve(mutationId);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingMutations(): Promise<PendingMutation[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['pendingMutations'], 'readonly');
      const store = transaction.objectStore('pendingMutations');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async removePendingMutation(mutationId: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['pendingMutations'], 'readwrite');
      const store = transaction.objectStore('pendingMutations');
      const request = store.delete(mutationId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async incrementRetryCount(mutationId: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['pendingMutations'], 'readwrite');
      const store = transaction.objectStore('pendingMutations');
      const getRequest = store.get(mutationId);

      getRequest.onsuccess = () => {
        const mutation = getRequest.result;
        if (mutation) {
          mutation.retryCount += 1;
          store.put(mutation);
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Sync Metadata Operations
  async getLastSyncTime(key: string): Promise<number | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncMetadata'], 'readonly');
      const store = transaction.objectStore('syncMetadata');
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.timestamp : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async setLastSyncTime(key: string, timestamp: number): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncMetadata'], 'readwrite');
      const store = transaction.objectStore('syncMetadata');
      const request = store.put({ key, timestamp });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Clear all offline data
  async clearAll(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        ['cachedData', 'pendingMutations', 'syncMetadata'],
        'readwrite'
      );

      transaction.objectStore('cachedData').clear();
      transaction.objectStore('pendingMutations').clear();
      transaction.objectStore('syncMetadata').clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

export const offlineStorage = new OfflineStorage();
