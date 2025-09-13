'use client';

import { JSONContent } from '@tiptap/react';
import { LocalNote } from '@/shared/schemas/notes';
import { CreateNoteDTO, localNotesRepository } from '../data/notes.repo';
import { create } from 'zustand';
import { hashJsonStable, hashStringSHA256 } from '@/shared/lib/hashing-utils';
import { sortObjectArrayByKeys } from '@/shared/lib/sorting-utils';

interface NotesState {
  notes: LocalNote[];
  selectedNoteId: string | null;
  isLoading: boolean;
  error: string | null;
  fetchNotes: () => Promise<void>;
  addNote: (noteDto: CreateNoteDTO) => Promise<void>;
  selectNote: (id: string) => void;
  updateNoteContent: (id: string, content_json: JSONContent, content_text: string) => Promise<void>;
  updateNoteTitle: (id: string, title: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
}

let hasRepoSubscription = false;

const sortByMostRecent = (notes: LocalNote[]) => sortObjectArrayByKeys(notes, ['updatedAt', 'createdAt'], 'desc');

/**
 * Selects the next appropriate note when the current selection is no longer available.
 * Attempts to maintain position in the sorted list by selecting the note below,
 * then above, then first note as fallback.
 */
const selectNextNote = (
  previousNotes: LocalNote[],
  currentNotes: LocalNote[],
  currentSelectedId: string | null,
): string | null => {
  if (!currentSelectedId) return null;

  const sortedCurrent = sortByMostRecent(currentNotes);
  const stillExists = sortedCurrent.some((n) => n.id === currentSelectedId);

  if (stillExists) return currentSelectedId;

  // Find which note was removed by comparing with previous state
  const sortedPrevious = sortByMostRecent(previousNotes);
  const removedNoteIndex = sortedPrevious.findIndex((note) => !sortedCurrent.some((n) => n.id === note.id));

  if (removedNoteIndex === -1) {
    // No note was removed, just return first note or null
    return sortedCurrent[0]?.id ?? null;
  }

  // Try to select the note at the same position (note below the removed one)
  const noteBelow = sortedCurrent[removedNoteIndex];
  if (noteBelow) return noteBelow.id;

  // If no note below, try the note above
  const noteAbove = removedNoteIndex > 0 ? sortedCurrent[removedNoteIndex - 1] : null;
  if (noteAbove) return noteAbove.id;

  // Final fallback to first note
  return sortedCurrent[0]?.id ?? null;
};

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  selectedNoteId: null,
  isLoading: true,
  error: null,

  fetchNotes: async () => {
    set({ isLoading: true, error: null });
    try {
      const notes = await localNotesRepository.getAll();
      const noteToSelect = notes.length > 0 ? notes[0].id : null;

      set({ notes, isLoading: false, selectedNoteId: noteToSelect });

      // Lazily subscribe once to live updates so store stays in sync with Dexie.
      // This is prevents us from having to publish events when syncing.
      if (!hasRepoSubscription) {
        const observable = localNotesRepository.observeAll();
        observable.subscribe({
          next: (emittedNotes) => {
            const sorted = sortByMostRecent(emittedNotes);
            const currentSelected = get().selectedNoteId;
            const previousNotes = get().notes;
            const nextSelected = selectNextNote(previousNotes, emittedNotes, currentSelected);

            set({ notes: sorted, selectedNoteId: nextSelected, isLoading: false });
          },
          error: (e) => {
            console.error('Live query failed:', e);
          },
        });
        hasRepoSubscription = true;
      }
    } catch (err) {
      console.error('Failed to fetch notes from IndexedDB:', err);
      set({ error: 'Failed to load notes.', isLoading: false });
    }
  },

  addNote: async (noteDto: CreateNoteDTO) => {
    const tempId = `temp_${Date.now()}`;
    const optimisticNote: LocalNote = {
      id: tempId,
      ...noteDto,
      content_json: noteDto.content_json,
      content_text: noteDto.content_text,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      syncStatus: 'pending',
      baseVersion: 0,
      version: 0,
    };

    set((state) => ({
      notes: [optimisticNote, ...state.notes],
      error: null,
    }));

    try {
      const savedNote = await localNotesRepository.add(noteDto);
      set((state) => {
        const newNotes = state.notes.map((note) => (note.id === tempId ? savedNote : note));
        return {
          notes: sortByMostRecent(newNotes),
          selectedNoteId: savedNote.id,
        };
      });
    } catch (err) {
      // On failure, roll back the state and show an error
      console.error('Failed to save note:', err);
      set((state) => ({
        error: 'Could not save the note. Please try again.',
        notes: state.notes.filter((note) => note.id !== tempId),
      }));
    }
  },

  selectNote: (id: string) => {
    if (get().selectedNoteId === id) return;

    const newNote = get().notes.find((note) => note.id === id);
    if (!newNote) {
      console.error(`Note with id ${id} not found in the store.`);
      set({
        error: 'Could not open the note.',
      });
      return;
    }

    set({ selectedNoteId: newNote.id, error: null });
  },

  updateNoteContent: async (id: string, content_json: object, content_text: string) => {
    const originalNote = get().notes.find((note) => note.id === id);
    if (!originalNote) {
      return;
    }
    const originalContent = originalNote.content_json;
    const originalContentText = originalNote.content_text;
    const originalUpdatedAt = originalNote.updatedAt;

    const [originalHash, nextHash] = await Promise.all([hashJsonStable(originalContent), hashJsonStable(content_json)]);

    if (originalHash === nextHash) {
      return;
    }

    set((state) => {
      const newNotes = state.notes.map((note) =>
        note.id === id
          ? { ...note, content_json: content_json, content_text: content_text, updatedAt: new Date() }
          : note,
      );

      return {
        notes: sortByMostRecent(newNotes),
      };
    });

    try {
      const updatedNote = await localNotesRepository.update(id, {
        content_json: content_json,
        content_text: content_text,
      });

      set((state) => {
        const newNotes = state.notes.map((note) => (note.id === id ? updatedNote : note));

        return {
          notes: sortByMostRecent(newNotes),
          error: null,
        };
      });
    } catch (err) {
      console.error('Failed to update note content in IndexedDB:', err);
      set((state) => {
        const newNotes = state.notes.map((note) =>
          note.id === id
            ? {
                ...note,
                content_json: originalContent,
                content_text: originalContentText,
                updatedAt: originalUpdatedAt,
              }
            : note,
        );
        return {
          error: 'Could not save the note content. Please try again.',
          notes: sortByMostRecent(newNotes),
        };
      });
    }
  },

  updateNoteTitle: async (id: string, title: string) => {
    const originalNote = get().notes.find((note) => note.id === id);
    if (!originalNote) {
      return;
    }
    const originalTitle = originalNote.title;
    const originalUpdatedAt = originalNote.updatedAt;

    const [originalTitleHash, nextTitleHash] = await Promise.all([
      hashStringSHA256(originalTitle ?? ''),
      hashStringSHA256(title ?? ''),
    ]);

    if (originalTitleHash === nextTitleHash) {
      console.log("Title hasn't changed, skipping update.");
      return;
    }

    set((state) => {
      const newNotes = state.notes.map((note) => (note.id === id ? { ...note, title, updatedAt: new Date() } : note));
      return {
        notes: sortByMostRecent(newNotes),
      };
    });

    try {
      const updatedNote = await localNotesRepository.update(id, { title });

      set((state) => {
        const newNotes = state.notes.map((note) =>
          note.id === id ? { ...note, title: updatedNote.title, updatedAt: updatedNote.updatedAt } : note,
        );
        return {
          notes: sortByMostRecent(newNotes),
          error: null,
        };
      });
    } catch (err) {
      console.error('Failed to update note title in IndexedDB:', err);
      set((state) => {
        const newNotes = state.notes.map((note) =>
          note.id === id ? { ...note, title: originalTitle, updatedAt: originalUpdatedAt } : note,
        );

        return {
          notes: sortByMostRecent(newNotes),
          error: 'Could not save the note title. Please try again.',
        };
      });
    }
  },

  deleteNote: async (id: string) => {
    const previousNotes = get().notes;
    const filteredNotes = previousNotes.filter((note) => note.id !== id);
    const currentSelected = get().selectedNoteId;
    const nextSelected = selectNextNote(previousNotes, filteredNotes, currentSelected);

    set({
      notes: sortByMostRecent(filteredNotes),
      selectedNoteId: nextSelected,
      error: null,
    });

    try {
      await localNotesRepository.remove(id);
    } catch (err) {
      console.error('Failed to delete note from IndexedDB:', err);
      // Rollback the optimistic update
      set((state) => ({
        error: 'Could not delete the note. Please try again.',
        notes: previousNotes,
        selectedNoteId: currentSelected,
      }));
    }
  },
}));
