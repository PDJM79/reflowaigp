import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { syncQueue } from '@/lib/syncQueue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WifiOff, Wifi, RefreshCw, Cloud, CloudOff } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export function OfflineIndicator() {
  const { isOnline, wasOffline } = useNetworkStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const updateCount = async () => {
      const count = await syncQueue.getPendingCount();
      setPendingCount(count);
    };

    updateCount();
    const interval = setInterval(updateCount, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleSync = async () => {
    if (isSyncing || !isOnline) return;

    setIsSyncing(true);
    try {
      await syncQueue.syncPendingMutations();
      const count = await syncQueue.getPendingCount();
      setPendingCount(count);
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isOnline) {
    return (
      <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2">
        <Badge
          variant="destructive"
          className="px-3 py-2 text-sm font-medium flex items-center gap-2 animate-pulse"
        >
          <CloudOff className="h-4 w-4" />
          Offline Mode
        </Badge>
        {pendingCount > 0 && (
          <Badge variant="outline" className="px-3 py-2 text-sm">
            {pendingCount} pending
          </Badge>
        )}
      </div>
    );
  }

  if (wasOffline) {
    return (
      <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 animate-fade-in">
        <Badge
          variant="default"
          className="px-3 py-2 text-sm font-medium flex items-center gap-2 bg-success"
        >
          <Wifi className="h-4 w-4" />
          Back Online
        </Badge>
        {pendingCount > 0 && (
          <Button
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
            className="h-9"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <Cloud className="h-4 w-4 mr-2" />
                Sync {pendingCount}
              </>
            )}
          </Button>
        )}
      </div>
    );
  }

  // Show sync button if there are pending changes
  if (pendingCount > 0) {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <Button
          size="sm"
          variant="outline"
          onClick={handleSync}
          disabled={isSyncing}
          className="h-9"
        >
          {isSyncing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <Cloud className="h-4 w-4 mr-2" />
              Sync {pendingCount}
            </>
          )}
        </Button>
      </div>
    );
  }

  return null;
}
