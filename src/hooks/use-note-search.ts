import { useMemo } from 'react';
import { useNotesStore } from '@/stores/notes-store';

export function useNoteSearch(searchQuery: string) {
  const notes = useNotesStore((state) => state.notes);

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) {
      return notes;
    }

    const query = searchQuery.toLowerCase().trim();
    return notes.filter((note) => note.title.toLowerCase().includes(query));
  }, [notes, searchQuery]);

  return filteredNotes;
}
