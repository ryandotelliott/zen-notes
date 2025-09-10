'use client';

import { useEffect } from 'react';
import { getSyncController } from '../data/sync/sync-controller';

export function SyncProvider() {
  useEffect(() => {
    const ctrl = getSyncController();
    ctrl.start();

    return () => ctrl.stop();
  }, []);

  return null;
}
