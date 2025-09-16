'use client';

import { syncWithRemote } from './sync';

type SyncController = {
  start(): void;
  stop(): void;
  /** Trigger an immediate sync */
  poke(): void;
  _stopLeader: () => void;
};

let instance: SyncController | null = null;

const POKE_DEBOUNCE_MS = 1_500;

export function getSyncController(): SyncController {
  if (instance) return instance;

  const LOCK_NAME = 'notes-sync-leader';
  let running = false;
  let stopped = false;
  let debounceTimer: number | null = null;
  let syncInFlight = false;
  let pendingSync = false;
  let releaseLeader: (() => void) | null = null;

  async function syncOnce() {
    const { pulled, pushed, conflicts, success } = await syncWithRemote();

    if (!success) {
      console.error('Failed to sync...');
      return;
    }

    console.log(`Sync results: pulled=${pulled}, pushed=${pushed}, conflicts=${conflicts}`);
  }

  function scheduleImmediate() {
    if (!running) return;
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    runSync();
  }

  function scheduleDebounced() {
    if (!running || stopped) return;
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    debounceTimer = window.setTimeout(() => {
      debounceTimer = null;
      runSync();
    }, POKE_DEBOUNCE_MS);
  }

  async function runSync() {
    if (!running || stopped) return;
    if (!navigator.onLine) return;
    if (syncInFlight) {
      // coalesce multiple triggers; run once more after current finishes
      pendingSync = true;
      return;
    }

    syncInFlight = true;
    try {
      await syncOnce();
    } catch {
      // errors are logged in syncOnce; do not schedule retries automatically
    } finally {
      syncInFlight = false;
      if (pendingSync) {
        pendingSync = false;
        // run one more time to capture batched changes
        runSync();
      }
    }
  }

  /**
   * Run this tab as the leader, insuring it owns the lock.
   * This prevents multiple tabs from syncing at the same time.
   */
  async function runAsLeader() {
    if (running) return;
    running = true;

    const onOnline = () => scheduleImmediate();
    const onVisibility = () => scheduleImmediate();

    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisibility);

    // Initial one-time sync on start
    scheduleImmediate();

    // Cleanup hook
    const stopLeader = () => {
      running = false;
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisibility);
      // Release the Web Lock by resolving the held promise
      releaseLeader?.();
      releaseLeader = null;
    };

    // Keep a reference so stop() can call it
    if (instance) {
      instance._stopLeader = stopLeader;
    }
  }

  instance = {
    start() {
      if (stopped) {
        stopped = false;
      }

      if (navigator.locks.request) {
        navigator.locks
          .request(LOCK_NAME, {}, async (lock: Lock | null) => {
            if (!lock) return; // another tab is leader
            await runAsLeader();
            // Hold the lock until released via stop()
            await new Promise<void>((resolve) => {
              releaseLeader = resolve;
            });
          })
          .catch(() => {
            console.error('Locks API error, sync will not work');
          });
      } else {
        console.error('Locks API not supported, sync will not work');
      }
    },
    stop() {
      stopped = true;
      instance?._stopLeader?.();
    },
    poke() {
      scheduleDebounced();
    },
    _stopLeader: () => {},
  };

  return instance;
}
