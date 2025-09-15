'use client';

import { useMemo } from 'react';
import { useNotesStore } from '@/features/notes/state/notes.store';

export function useNoteTitleSearch(searchQuery: string) {
  // Only rerender when fields relevant to title search change
  const notes = useNotesStore(
    (state) => state.notes,
    (prev, next) => {
      if (prev === next) return true;
      if (prev.length !== next.length) return false;
      for (let i = 0; i < prev.length; i++) {
        const a = prev[i];
        const b = next[i];
        if (a.id !== b.id) return false;
        if (a.title !== b.title) return false;
        if (a.pinned !== b.pinned) return false;
        if (a.listOrderSeq !== b.listOrderSeq) return false;
        if (a.previewText !== b.previewText) return false;
      }
      return true;
    },
  );

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 3) {
      return notes;
    }

    const query = searchQuery.toLowerCase().trim();
    return notes.filter((note) => note.title.toLowerCase().includes(query));
  }, [notes, searchQuery]);

  return filteredNotes;
}
