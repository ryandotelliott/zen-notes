'use client';

import { cn } from '@/shared/lib/utils';
import { MessageCircle } from 'lucide-react';
import React from 'react';
import { Button } from './ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useNotesStore } from '@/features/notes/state/use-notes-store';

type Props = {
  className?: string;
};

export default function HeaderBar({ className }: Props) {
  const selectedNoteId = useNotesStore((s) => s.selectedNoteId);
  const selectedNote = useNotesStore((s) => s.notes.find((n) => n.id === selectedNoteId));

  return (
    <div className={cn('flex w-full items-center justify-between p-4', className)}>
      <SidebarTrigger className="h-10 w-10" />
      <p className="text-sm font-medium text-muted-foreground">{selectedNote?.title || 'Untitled'}</p>
      <Button variant="ghost" size="icon-lg">
        <MessageCircle />
      </Button>
    </div>
  );
}
