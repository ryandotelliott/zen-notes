'use client';

import React from 'react';
import { ThemeProvider } from './theme-provider';
import { SyncProvider } from '@/features/notes/providers/sync-provider';

type Props = {
  children: React.ReactNode;
};

export function Providers({ children }: Props) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <SyncProvider />
      {children}
    </ThemeProvider>
  );
}
