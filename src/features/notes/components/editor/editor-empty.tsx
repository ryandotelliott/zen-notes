'use client';

import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';
import { useNotesStore } from '@/features/notes/state/notes.store';
import React from 'react';

type Props = {
  className?: string;
};

export default function EditorEmpty({ className }: Props) {
  const addNote = useNotesStore((s) => s.addNote);

  return (
    <div className={cn('flex h-full flex-col items-center justify-center gap-y-4', className)}>
      <Button variant="outline" onClick={() => addNote({ title: '', content_json: {}, content_text: '' })}>
        Create Note
      </Button>
    </div>
  );
}
