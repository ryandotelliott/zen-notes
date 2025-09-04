'use client';

import React from 'react';
import EditorMain from './editor-main';
import { useNotesStore } from '@/features/notes/state/notes.store';
import EditorEmpty from './editor-empty';
import { cn } from '@/shared/lib/utils';

type Props = {
  className?: string;
};

export default function EditorWrapper({ className }: Props) {
  const notes = useNotesStore((s) => s.notes);

  return (
    <>
      {notes.length === 0 ? (
        <EditorEmpty className={className} />
      ) : (
        <EditorMain className={cn('mx-auto min-h-0 w-full max-w-4xl flex-1 overflow-hidden', className)} />
      )}
    </>
  );
}
