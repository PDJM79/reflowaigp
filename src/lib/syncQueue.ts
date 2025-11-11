import { supabase } from '@/integrations/supabase/client';
import { offlineStorage } from './offlineStorage';
import { triggerHaptic } from './haptics';

interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

const MAX_RETRIES = 3;

/**
 * Sync manager for offline-first functionality
 */
class SyncQueue {
  private isSyncing = false;
  private syncCallbacks: Array<(result: SyncResult) => void> = [];

  /**
   * Add mutation to offline queue
   */
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

  /**
   * Sync all pending mutations to server
   */
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
        // Skip if exceeded max retries
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

      // Update last sync time
      await offlineStorage.setLastSyncTime('lastSync', Date.now());

      // Trigger haptic feedback
      if (result.synced > 0) {
        triggerHaptic('success');
      } else if (result.failed > 0) {
        triggerHaptic('error');
      }

      // Notify listeners
      this.notifySyncComplete(result);
    } catch (error) {
      console.error('Sync failed:', error);
      result.success = false;
    } finally {
      this.isSyncing = false;
    }

    return result;
  }

  /**
   * Execute a single mutation
   */
  private async executeMutation(mutation: any): Promise<void> {
    const { table, operation, data } = mutation;

    switch (operation) {
      case 'insert':
        const { error: insertError } = await supabase.from(table).insert(data);
        if (insertError) throw insertError;
        break;

      case 'update':
        const { id, ...updateData } = data;
        const { error: updateError } = await supabase
          .from(table)
          .update(updateData)
          .eq('id', id);
        if (updateError) throw updateError;
        break;

      case 'delete':
        const { error: deleteError } = await supabase
          .from(table)
          .delete()
          .eq('id', data.id);
        if (deleteError) throw deleteError;
        break;

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  /**
   * Get pending mutations count
   */
  async getPendingCount(): Promise<number> {
    const mutations = await offlineStorage.getPendingMutations();
    return mutations.length;
  }

  /**
   * Register callback for sync completion
   */
  onSyncComplete(callback: (result: SyncResult) => void): () => void {
    this.syncCallbacks.push(callback);
    return () => {
      this.syncCallbacks = this.syncCallbacks.filter((cb) => cb !== callback);
    };
  }

  /**
   * Notify all listeners of sync completion
   */
  private notifySyncComplete(result: SyncResult): void {
    this.syncCallbacks.forEach((callback) => callback(result));
  }

  /**
   * Check if currently syncing
   */
  get syncing(): boolean {
    return this.isSyncing;
  }
}

export const syncQueue = new SyncQueue();
