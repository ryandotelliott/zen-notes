'use client';

import React from 'react';
import { useNotesStore } from '../../state/notes.store';
import { cn } from '@/shared/lib/ui-utils';

type Props = {
  className?: string;
};

export default function NotesHeader({ className }: Props) {
  const selectedNoteId = useNotesStore((s) => s.selectedNoteId);
  const selectedNote = useNotesStore((s) => s.notes.find((n) => n.id === selectedNoteId));

  if (!selectedNoteId) {
    return null;
  }

  return (
    <div className={cn('flex w-full items-center justify-center', className)}>
      <p className="text-sm font-medium text-muted-foreground select-none">{selectedNote?.title || 'Untitled'}</p>
    </div>
  );
}
