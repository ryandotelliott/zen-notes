'use client';

import React from 'react';
import EditorMain from './editor-main';
import { useNotesStore } from '@/features/notes/state/notes.store';
import EditorEmpty from './editor-empty';
import { cn } from '@/shared/lib/ui-utils';

type Props = {
  className?: string;
};

export default function EditorWrapper({ className }: Props) {
  const selectedNoteId = useNotesStore((s) => s.selectedNoteId);

  return (
    <>
      {selectedNoteId ? (
        <EditorMain className={cn('mx-auto min-h-0 w-full max-w-4xl flex-1 overflow-hidden', className)} />
      ) : (
        <EditorEmpty className={cn('mx-auto min-h-0 w-full max-w-4xl flex-1 overflow-hidden', className)} />
      )}
    </>
  );
}
