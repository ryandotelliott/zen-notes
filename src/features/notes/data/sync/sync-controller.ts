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

const VISIBLE_PULL_CADENCE_MS = 30_000;
const IDLE_PULL_CADENCE_MS = 120_000;
const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 60_000;

export function getSyncController(): SyncController {
  if (instance) return instance;

  const LOCK_NAME = 'notes-sync-leader';
  let running = false;
  let stopped = false;
  let timer: number | null = null;

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

    if (timer) {
      clearTimeout(timer);
      timer = null;
    }

    loopTick(true);
  }

  async function loopTick(immediate = false) {
    if (!running || stopped) return;

    // collapse multiple calls
    if (!immediate && timer) return;

    let backoff = INITIAL_BACKOFF_MS;

    const doTick = async () => {
      try {
        if (navigator.onLine) {
          await syncOnce();
          backoff = INITIAL_BACKOFF_MS;
        }
      } catch {
        backoff = Math.min(backoff * 2, MAX_BACKOFF_MS); // 1s..60s
      } finally {
        const visible = !document.hidden;
        const next = visible ? VISIBLE_PULL_CADENCE_MS : IDLE_PULL_CADENCE_MS; // idle pull cadence
        timer = window.setTimeout(() => loopTick(false), Math.max(backoff, next));
      }
    };

    await doTick();
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

    // Initial kicks
    scheduleImmediate();

    // Cleanup hook
    const stopLeader = () => {
      running = false;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisibility);
    };

    // Keep a reference so stop() can call it
    if (instance) {
      instance._stopLeader = stopLeader;
    }
  }

  instance = {
    start() {
      if (stopped) stopped = false;

      if (navigator.locks.request) {
        navigator.locks
          .request(LOCK_NAME, { ifAvailable: true }, async (lock: Lock | null) => {
            if (!lock) return; // another tab is leader
            await runAsLeader();
            // keep the lock implicitly while we run; if page hidden, the lock persists
            await new Promise(() => {}); // never resolve; the UA releases on unload
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
      scheduleImmediate();
    },
    _stopLeader: () => {},
  };

  return instance;
}
