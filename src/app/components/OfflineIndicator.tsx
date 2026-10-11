import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { isOnline, addOnlineListener, removeOnlineListener, syncManager } from '../lib/offline';

interface OfflineIndicatorProps {
  className?: string;
}

export default function OfflineIndicator({ className = '' }: OfflineIndicatorProps) {
  const [online, setOnline] = useState(isOnline());
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const handleOnlineChange = (isOnline: boolean) => {
      setOnline(isOnline);
      if (isOnline) {
        // Trigger sync when coming back online
        setSyncing(true);
        syncManager.syncPendingData().finally(() => {
          setSyncing(false);
          updatePendingCount();
        });
      }
    };

    addOnlineListener(handleOnlineChange);

    // Update pending count periodically
    const updateInterval = setInterval(updatePendingCount, 5000);
    updatePendingCount();

    return () => {
      removeOnlineListener(handleOnlineChange);
      clearInterval(updateInterval);
    };
  }, []);

  const updatePendingCount = () => {
    setPendingCount(syncManager.getPendingCount());
  };

  const handleManualSync = async () => {
    if (!online) return;
    setSyncing(true);
    try {
      await syncManager.syncPendingData();
      updatePendingCount();
    } finally {
      setSyncing(false);
    }
  };

  if (online && pendingCount === 0) {
    return null; // Don't show anything when online and no pending syncs
  }

  return (
    <div className={`fixed top-4 right-4 z-50 ${className}`}>
      <div className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg border transition-all duration-300 ${
        online
          ? pendingCount > 0
            ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
            : 'bg-green-50 border-green-200 text-green-800'
          : 'bg-red-50 border-red-200 text-red-800'
      }`}>
        {online ? (
          pendingCount > 0 ? (
            <>
              <Wifi className="w-4 h-4" />
              <span className="text-sm font-medium">
                {pendingCount} alteração{pendingCount !== 1 ? 'ões' : ''} pendente{pendingCount !== 1 ? 's' : ''}
              </span>
              <button
                onClick={handleManualSync}
                disabled={syncing}
                className="ml-2 p-1 rounded hover:bg-yellow-100 transition-colors disabled:opacity-50"
                title="Sincronizar agora"
              >
                <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
              </button>
            </>
          ) : (
            <>
              <Wifi className="w-4 h-4" />
              <span className="text-sm font-medium">Online</span>
            </>
          )
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            <span className="text-sm font-medium">Offline</span>
            {pendingCount > 0 && (
              <span className="text-xs bg-red-100 px-2 py-1 rounded">
                {pendingCount} pendente{pendingCount !== 1 ? 's' : ''}
              </span>
            )}
          </>
        )}
      </div>

      {/* Offline warning banner */}
      {!online && (
        <div className="mt-2 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">
              Modo Offline - As alterações serão sincronizadas quando a conexão for restaurada
            </span>
          </div>
        </div>
      )}
    </div>
  );
}