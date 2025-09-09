'use client';

import React from 'react';
import { ThemeProvider } from './theme-provider';
import { useSyncWorker } from '@/features/notes/hooks/use-sync-worker';

type Props = {
  children: React.ReactNode;
};

export function Providers({ children }: Props) {
  // Initialize background sync on app mount
  useSyncWorker();
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </ThemeProvider>
  );
}
