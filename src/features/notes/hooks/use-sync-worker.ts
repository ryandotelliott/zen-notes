import { useEffect, useRef } from 'react';
import { syncWithRemote } from '@/features/notes/data/sync/sync';

type SyncWorkerOptions = {
  onSyncStart?: (reason: string) => void;
  onSyncEnd?: (result: Awaited<ReturnType<typeof syncWithRemote>>) => void;
  onSyncError?: (error: unknown) => void;
};

export function useSyncWorker(options: SyncWorkerOptions = {}) {
  const { onSyncStart, onSyncEnd, onSyncError } = options;
  const isSyncingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    let isUnmounted = false;

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sync-worker.js');

        // Prefer the active controller; otherwise use the SW registration's active worker
        const getController = () =>
          navigator.serviceWorker.controller || registration.active || registration.waiting || registration.installing;

        // Ensure clients are claimed and we can communicate
        if (navigator.serviceWorker.controller) {
          // no-op
        } else {
          // Reload once the new SW takes control
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            // After taking control, request periodic sync setup
            getController()?.postMessage({ type: 'ensure-periodic-sync' });
          });
        }

        // Ask SW to setup periodic sync (best-effort)
        getController()?.postMessage({ type: 'ensure-periodic-sync' });

        // Handle messages from SW to trigger sync
        const onMessage = async (event: MessageEvent) => {
          const data = event.data || {};
          if (data?.type !== 'trigger-sync') return;
          if (isSyncingRef.current) return;
          isSyncingRef.current = true;
          try {
            onSyncStart?.(String(data.reason ?? 'unknown'));
            const result = await syncWithRemote();
            onSyncEnd?.(result);
          } catch (err) {
            onSyncError?.(err);
          } finally {
            isSyncingRef.current = false;
          }
        };

        navigator.serviceWorker.addEventListener('message', onMessage);

        // Trigger a sync request on load to flush any pending operations
        getController()?.postMessage({ type: 'request-sync' });

        return () => {
          navigator.serviceWorker.removeEventListener('message', onMessage);
        };
      } catch (err) {
        // Fallback: run sync periodically in-page if SW registration fails
        if (isUnmounted) return;
        const interval = setInterval(async () => {
          if (isSyncingRef.current) return;
          try {
            isSyncingRef.current = true;
            onSyncStart?.('interval-fallback');
            const result = await syncWithRemote();
            onSyncEnd?.(result);
          } catch (e) {
            onSyncError?.(e);
          } finally {
            isSyncingRef.current = false;
          }
        }, 60_000);
        return () => clearInterval(interval);
      }
    };

    const cleanupPromise = register();

    return () => {
      isUnmounted = true;
      void cleanupPromise;
    };
  }, [onSyncEnd, onSyncError, onSyncStart]);

  const requestImmediateSync = () => {
    try {
      navigator.serviceWorker.controller?.postMessage({ type: 'request-sync' });
    } catch {
      // ignore
    }
  };

  return { requestImmediateSync } as const;
}
