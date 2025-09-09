/*
  Service Worker for zen-notes
  - Acts as a lightweight scheduler/orchestrator
  - Uses Background Sync / Periodic Background Sync when available
  - Notifies open clients to run the actual sync logic in the page context
*/

// Note: SW runs in its own global scope; avoid DOM-specific APIs here.

const ONE_HOUR = 60 * 60 * 1000;
const SYNC_TAG = 'notes-sync';
const PERIODIC_SYNC_TAG = 'notes-periodic-sync';

self.addEventListener('install', () => {
  // Immediately activate the new service worker
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Gain control of uncontrolled clients ASAP
  event.waitUntil(self.clients.claim());
});

async function notifyClients(message) {
  const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of allClients) {
    client.postMessage(message);
  }
}

// One-off Background Sync
self.addEventListener('sync', (event) => {
  if (!event.tag || event.tag !== SYNC_TAG) return;
  event.waitUntil(
    (async () => {
      await notifyClients({ type: 'trigger-sync', reason: 'background-sync' });
    })(),
  );
});

// Periodic Background Sync (where supported)
self.addEventListener('periodicsync', (event) => {
  if (!event.tag || event.tag !== PERIODIC_SYNC_TAG) return;
  event.waitUntil(
    (async () => {
      await notifyClients({ type: 'trigger-sync', reason: 'periodic-sync' });
    })(),
  );
});

// Message channel from clients
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'request-sync') {
    event.waitUntil(
      (async () => {
        try {
          const reg = await self.registration;
          if (reg && reg.sync && typeof reg.sync.register === 'function') {
            await reg.sync.register(SYNC_TAG);
            return; // The 'sync' event will fire later when online
          }
        } catch {
          // Fall through to immediate message
        }
        // Fallback: ask clients to sync immediately
        await notifyClients({ type: 'trigger-sync', reason: 'message-fallback' });
      })(),
    );
  }

  if (data.type === 'ensure-periodic-sync') {
    event.waitUntil(
      (async () => {
        try {
          const reg = await self.registration;
          if ('periodicSync' in reg) {
            // @ts-expect-error periodic-background-sync permission type not in lib DOM
            const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
            if (status.state === 'granted') {
              // @ts-expect-error periodicSync not in lib types in SW context
              await reg.periodicSync.register(PERIODIC_SYNC_TAG, { minInterval: ONE_HOUR });
            }
          }
        } catch {
          // Ignore unsupported browsers
        }
      })(),
    );
  }
});
