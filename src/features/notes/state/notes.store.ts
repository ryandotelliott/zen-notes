'use client';

import { JSONContent } from '@tiptap/react';
import { Note } from '@/shared/schemas/notes';
import { CreateNoteDTO, notesRepository } from '../data/notes.repo';
import { create } from 'zustand';
import { hashJsonStable, hashStringSHA256 } from '@/shared/lib/hashing-utils';
import { sortArrayByKey } from '@/shared/lib/sorting-utils';

interface NotesState {
  notes: Note[];
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

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  selectedNoteId: null,
  isLoading: true,
  error: null,

  fetchNotes: async () => {
    set({ isLoading: true, error: null });
    try {
      const notes = await notesRepository.getAll();
      const noteToSelect = notes.length > 0 ? notes[0].id : null;

      set({ notes, isLoading: false, selectedNoteId: noteToSelect });
    } catch (err) {
      console.error('Failed to fetch notes from IndexedDB:', err);
      set({ error: 'Failed to load notes.', isLoading: false });
    }
  },

  addNote: async (noteDto: CreateNoteDTO) => {
    const tempId = `temp_${Date.now()}`;
    const optimisticNote: Note = {
      id: tempId,
      ...noteDto,
      content_json: noteDto.content_json,
      content_text: noteDto.content_text,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    set((state) => ({
      notes: [optimisticNote, ...state.notes],
      error: null,
    }));

    try {
      const savedNote = await notesRepository.add(noteDto);

      set((state) => {
        const newNotes = state.notes.map((note) => (note.id === tempId ? savedNote : note));
        return {
          notes: sortArrayByKey(newNotes, 'updatedAt', 'desc'),
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
      console.log("Content hasn't changed, skipping update.");
      return;
    }

    set((state) => {
      const newNotes = state.notes.map((note) =>
        note.id === id
          ? { ...note, content_json: content_json, content_text: content_text, updatedAt: new Date() }
          : note,
      );

      return {
        notes: sortArrayByKey(newNotes, 'updatedAt', 'desc'),
      };
    });

    try {
      const updatedNote = await notesRepository.update(id, { content_json: content_json, content_text: content_text });

      set((state) => {
        const newNotes = state.notes.map((note) => (note.id === id ? updatedNote : note));

        return {
          notes: sortArrayByKey(newNotes, 'updatedAt', 'desc'),
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
          notes: sortArrayByKey(newNotes, 'updatedAt', 'desc'),
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
        notes: sortArrayByKey(newNotes, 'updatedAt', 'desc'),
      };
    });

    try {
      const updatedNote = await notesRepository.update(id, { title });

      set((state) => {
        const newNotes = state.notes.map((note) =>
          note.id === id ? { ...note, title: updatedNote.title, updatedAt: updatedNote.updatedAt } : note,
        );
        return {
          notes: sortArrayByKey(newNotes, 'updatedAt', 'desc'),
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
          notes: sortArrayByKey(newNotes, 'updatedAt', 'desc'),
          error: 'Could not save the note title. Please try again.',
        };
      });
    }
  },

  deleteNote: async (id: string) => {
    set((state) => ({
      notes: state.notes.filter((note) => note.id !== id),
      selectedNoteId: state.selectedNoteId === id ? null : state.selectedNoteId,
      error: null,
    }));

    try {
      await notesRepository.remove(id);
    } catch (err) {
      console.error('Failed to delete note from IndexedDB:', err);
      set((state) => ({ error: 'Could not delete the note. Please try again.', notes: state.notes }));
    }
  },
}));
