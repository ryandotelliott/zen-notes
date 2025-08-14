'use client';

import { cn } from '@/lib/utils';
import { MessageCircle, Sidebar } from 'lucide-react';
import React from 'react';
import { Button } from './ui/button';

type Props = {
  className?: string;
};

export default function HeaderBar({ className }: Props) {
  return (
    <div className={cn('flex w-full items-center justify-between p-4', className)}>
      <Button variant="ghost" size="icon">
        <Sidebar />
      </Button>
      <p className="text-sm font-medium text-muted-foreground">Note Name</p>
      <Button variant="ghost" size="icon">
        <MessageCircle />
      </Button>
    </div>
  );
}
