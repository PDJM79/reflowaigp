import { offlineStorage } from './offlineStorage';
import { triggerHaptic } from './haptics';

interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

const MAX_RETRIES = 3;

class SyncQueue {
  private isSyncing = false;
  private syncCallbacks: Array<(result: SyncResult) => void> = [];

  async queueMutation(
    table: string,
    operation: 'insert' | 'update' | 'delete',
    data: any
  ): Promise<void> {
    try {
      await offlineStorage.addPendingMutation(table, operation, data);
      console.log(`Queued ${operation} on ${table}:`, data);
    } catch (error) {
      console.error('Failed to queue mutation:', error);
      throw error;
    }
  }

  async syncPendingMutations(): Promise<SyncResult> {
    if (this.isSyncing) {
      console.log('Sync already in progress');
      return { success: false, synced: 0, failed: 0, errors: [] };
    }

    this.isSyncing = true;
    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: [],
    };

    try {
      const mutations = await offlineStorage.getPendingMutations();
      console.log(`Syncing ${mutations.length} pending mutations...`);

      for (const mutation of mutations) {
        if (mutation.retryCount >= MAX_RETRIES) {
          console.error(`Mutation ${mutation.id} exceeded max retries`);
          result.failed++;
          result.errors.push({
            id: mutation.id,
            error: 'Max retries exceeded',
          });
          await offlineStorage.removePendingMutation(mutation.id);
          continue;
        }

        try {
          await this.executeMutation(mutation);
          await offlineStorage.removePendingMutation(mutation.id);
          result.synced++;
          console.log(`Successfully synced mutation ${mutation.id}`);
        } catch (error: any) {
          console.error(`Failed to sync mutation ${mutation.id}:`, error);
          await offlineStorage.incrementRetryCount(mutation.id);
          result.failed++;
          result.errors.push({
            id: mutation.id,
            error: error.message || 'Unknown error',
          });
        }
      }

      await offlineStorage.setLastSyncTime('lastSync', Date.now());

      if (result.synced > 0) {
        triggerHaptic('success');
      } else if (result.failed > 0) {
        triggerHaptic('error');
      }

      this.notifySyncComplete(result);
    } catch (error) {
      console.error('Sync failed:', error);
      result.success = false;
    } finally {
      this.isSyncing = false;
    }

    return result;
  }

  private async executeMutation(mutation: any): Promise<void> {
    const { table, operation, data } = mutation;

    const tableToEndpoint: Record<string, string> = {
      users: 'users',
      employees: 'employees',
      tasks: 'tasks',
      incidents: 'incidents',
      complaints: 'complaints',
      policy_documents: 'policies',
      training_records: 'training-records',
      process_templates: 'process-templates',
      notifications: 'notifications',
    };

    const endpoint = tableToEndpoint[table] || table;
    const practiceId = data.practiceId || data.practice_id;

    if (!practiceId) {
      console.warn(`No practiceId found for mutation on ${table}, skipping`);
      return;
    }

    const baseUrl = `/api/practices/${practiceId}/${endpoint}`;

    switch (operation) {
      case 'insert': {
        const response = await fetch(baseUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(data),
        });
        if (!response.ok) {
          const err = await response.text();
          throw new Error(err || `Insert failed: ${response.status}`);
        }
        break;
      }

      case 'update': {
        const { id, ...updateData } = data;
        const response = await fetch(`${baseUrl}/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(updateData),
        });
        if (!response.ok) {
          const err = await response.text();
          throw new Error(err || `Update failed: ${response.status}`);
        }
        break;
      }

      case 'delete': {
        const response = await fetch(`${baseUrl}/${data.id}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        if (!response.ok) {
          const err = await response.text();
          throw new Error(err || `Delete failed: ${response.status}`);
        }
        break;
      }

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  async getPendingCount(): Promise<number> {
    const mutations = await offlineStorage.getPendingMutations();
    return mutations.length;
  }

  onSyncComplete(callback: (result: SyncResult) => void): () => void {
    this.syncCallbacks.push(callback);
    return () => {
      this.syncCallbacks = this.syncCallbacks.filter((cb) => cb !== callback);
    };
  }

  private notifySyncComplete(result: SyncResult): void {
    this.syncCallbacks.forEach((callback) => callback(result));
  }

  get syncing(): boolean {
    return this.isSyncing;
  }
}

export const syncQueue = new SyncQueue();
