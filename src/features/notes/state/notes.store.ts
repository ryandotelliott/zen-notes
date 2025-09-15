'use client';

import { JSONContent } from '@tiptap/react';
import { LocalNote } from '@/shared/schemas/notes';
import { CreateNoteDTO, localNotesRepository } from '@/features/notes/data/notes.repo';
import { create } from 'zustand';
import { debounce, type DebouncedFunction } from '@/shared/lib/debounce';
import { hashJsonStable, hashStringSHA256 } from '@/shared/lib/hashing-utils';
import { sortObjectArrayByKeys } from '@/shared/lib/sorting-utils';
import { computePreviewText } from '@/features/notes/lib/content-utils';

interface NotesState {
  notes: LocalNote[];
  selectedNoteId: string | null;
  isLoading: boolean;
  error: string | null;
  fetchNotes: () => Promise<void>;
  addNote: (noteDto: CreateNoteDTO) => Promise<void>;
  selectNote: (id: string) => void;
  updateNoteContent: (id: string, contentJson: JSONContent, contentText: string) => Promise<void>;
  updateNoteTitle: (id: string, title: string) => Promise<void>;
  updateNotePinned: (id: string, pinned: boolean) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
}

let hasRepoSubscription = false;

// Per-note debouncers to coalesce rapid edits before persisting to IndexedDB
const contentDebouncers = new Map<string, DebouncedFunction<(json: object, text: string) => void>>();
const titleDebouncers = new Map<string, DebouncedFunction<(t: string) => void>>();

const sortByListOrder = (notes: LocalNote[]) => sortObjectArrayByKeys(notes, ['listOrderSeq', 'createdAt'], 'desc');

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

  const sortedCurrent = sortByListOrder(currentNotes);
  const stillExists = sortedCurrent.some((n) => n.id === currentSelectedId);

  if (stillExists) return currentSelectedId;

  // Find which note was removed by comparing with previous state
  const sortedPrevious = sortByListOrder(previousNotes);
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
            const sorted = sortByListOrder(emittedNotes);
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
      contentJson: noteDto.contentJson,
      contentText: noteDto.contentText,
      previewText: computePreviewText(noteDto.contentText),
      createdAt: new Date(),
      updatedAt: new Date(),
      listOrderSeq: 0,
      pinned: false,
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
      const reservedSeq = await localNotesRepository.reserveListOrderSeq();
      const savedNote = await localNotesRepository.add(noteDto, { listOrderSeq: reservedSeq });
      set(() => {
        return {
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

    set((state) => ({
      selectedNoteId: newNote.id,
      error: null,
      notes: sortByListOrder(state.notes.map((n) => (n.id === newNote.id ? newNote : n))),
    }));
  },

  updateNoteContent: async (id: string, contentJson: object, contentText: string) => {
    const originalNote = get().notes.find((note) => note.id === id);
    if (!originalNote) {
      return;
    }
    const originalContent = originalNote.contentJson;
    const originalContentText = originalNote.contentText;
    const originalUpdatedAt = originalNote.updatedAt;
    const originalListOrderSeq = originalNote.listOrderSeq;
    const [originalHash, nextHash] = await Promise.all([hashJsonStable(originalContent), hashJsonStable(contentJson)]);

    if (originalHash === nextHash) {
      return;
    }

    // Immediate in-memory update for snappy typing UX. Do NOT bump listOrderSeq here.
    set((state) => {
      const newNotes = state.notes.map((note) =>
        note.id === id
          ? {
              ...note,
              contentJson,
              contentText,
              previewText: computePreviewText(contentText),
              updatedAt: new Date(),
            }
          : note,
      );
      return { notes: sortByListOrder(newNotes) };
    });

    // Debounced persistence to IndexedDB; bump listOrderSeq only on save
    const DEBOUNCE_MS_CONTENT = 1000;
    // Lazily create per-note debouncer
    if (!contentDebouncers.has(id)) {
      const debouncedSave = debounce(async (json: object, text: string) => {
        try {
          const nextListOrderSeq = await localNotesRepository.reserveListOrderSeq();
          await localNotesRepository.update(id, {
            contentJson: json,
            contentText: text,
            previewText: computePreviewText(text),
            listOrderSeq: nextListOrderSeq,
          });
          set({ error: null });
        } catch (err) {
          console.error('Failed to persist note content in IndexedDB (debounced):', err);
          set((state) => ({
            error: 'Could not save the note content. Please try again.',
            notes: state.notes.map((note) =>
              note.id === id
                ? {
                    ...note,
                    contentJson: originalContent,
                    contentText: originalContentText,
                    previewText: computePreviewText(originalContentText),
                    updatedAt: originalUpdatedAt,
                    listOrderSeq: originalListOrderSeq,
                  }
                : note,
            ),
          }));
        }
      }, DEBOUNCE_MS_CONTENT);
      contentDebouncers.set(id, debouncedSave);
    }

    contentDebouncers.get(id)!(contentJson, contentText);
  },

  updateNoteTitle: async (id: string, title: string) => {
    const originalNote = get().notes.find((note) => note.id === id);
    if (!originalNote) {
      return;
    }
    const originalTitle = originalNote.title;
    const originalUpdatedAt = originalNote.updatedAt;
    const originalListOrderSeq = originalNote.listOrderSeq;
    const [originalTitleHash, nextTitleHash] = await Promise.all([
      hashStringSHA256(originalTitle ?? ''),
      hashStringSHA256(title ?? ''),
    ]);

    if (originalTitleHash === nextTitleHash) {
      console.log("Title hasn't changed, skipping update.");
      return;
    }

    // Immediate in-memory update without changing list order
    set((state) => {
      const newNotes = state.notes.map((note) => (note.id === id ? { ...note, title, updatedAt: new Date() } : note));
      return { notes: sortByListOrder(newNotes) };
    });

    // Debounced persistence to IndexedDB; bump listOrderSeq only on save
    const DEBOUNCE_MS_TITLE = 500;
    if (!titleDebouncers.has(id)) {
      const debouncedSave = debounce(async (t: string) => {
        try {
          const nextListOrderSeq = await localNotesRepository.reserveListOrderSeq();
          await localNotesRepository.update(id, { title: t, listOrderSeq: nextListOrderSeq });
          set({ error: null });
        } catch (err) {
          console.error('Failed to persist note title in IndexedDB (debounced):', err);
          set((state) => ({
            error: 'Could not save the note title. Please try again.',
            notes: state.notes.map((note) =>
              note.id === id
                ? { ...note, title: originalTitle, updatedAt: originalUpdatedAt, listOrderSeq: originalListOrderSeq }
                : note,
            ),
          }));
        }
      }, DEBOUNCE_MS_TITLE);
      titleDebouncers.set(id, debouncedSave);
    }

    titleDebouncers.get(id)!(title);
  },

  updateNotePinned: async (id: string, pinned: boolean) => {
    const originalNote = get().notes.find((note) => note.id === id);
    if (!originalNote) {
      return;
    }
    const originalPinned = originalNote.pinned;
    const originalUpdatedAt = originalNote.updatedAt;

    set((state) => {
      const newNotes = state.notes.map((note) => (note.id === id ? { ...note, pinned, updatedAt: new Date() } : note));
      return {
        notes: sortByListOrder(newNotes),
      };
    });

    try {
      await localNotesRepository.update(id, { pinned });

      set({
        error: null,
      });
    } catch (err) {
      console.error('Failed to update note pinned in IndexedDB:', err);
      set((state) => {
        const newNotes = state.notes.map((note) =>
          note.id === id ? { ...note, pinned: originalPinned, updatedAt: originalUpdatedAt } : note,
        );
        return {
          notes: sortByListOrder(newNotes),
          error: 'Could not save the note pinned. Please try again.',
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
      notes: sortByListOrder(filteredNotes),
      selectedNoteId: nextSelected,
      error: null,
    });

    try {
      await localNotesRepository.remove(id);
    } catch (err) {
      console.error('Failed to delete note from IndexedDB:', err);
      // Rollback the optimistic update
      set({
        error: 'Could not delete the note. Please try again.',
        notes: previousNotes,
        selectedNoteId: currentSelected,
      });
    }

    // Cancel any pending debounced saves for this note
    if (contentDebouncers.has(id)) {
      contentDebouncers.get(id)!.cancel();
      contentDebouncers.delete(id);
    }
    if (titleDebouncers.has(id)) {
      titleDebouncers.get(id)!.cancel();
      titleDebouncers.delete(id);
    }
  },
}));
