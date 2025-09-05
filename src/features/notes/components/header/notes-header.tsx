'use client';

import { Button } from '@/shared/components/ui/button';
import { MessageCircle } from 'lucide-react';
import React from 'react';
import { useNotesStore } from '../../state/notes.store';

type Props = {
  className?: string;
};

export default function NotesHeader({}: Props) {
  const selectedNoteId = useNotesStore((s) => s.selectedNoteId);
  const selectedNote = useNotesStore((s) => s.notes.find((n) => n.id === selectedNoteId));

  if (!selectedNoteId) {
    return null;
  }

  return (
    <>
      <p className="text-sm font-medium text-muted-foreground">{selectedNote?.title || 'Untitled'}</p>
      <Button variant="ghost" size="icon-lg">
        <MessageCircle />
      </Button>
    </>
  );
}
