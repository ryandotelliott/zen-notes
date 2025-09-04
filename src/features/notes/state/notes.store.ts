'use client';

import { JSONContent } from '@tiptap/react';
import { Note } from '../data/local/notes.db';
import { CreateNoteDTO, notesRepository } from '../data/local/notes.repo';
import { create } from 'zustand';
import { hashJsonStable, hashStringSHA256 } from '@/shared/utils/hashing-utils';

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
  renameNote: (id: string, title: string) => Promise<void>;
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
      set({ notes, isLoading: false });
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
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    set((state) => ({
      notes: [optimisticNote, ...state.notes],
      error: null,
    }));

    try {
      const savedNote = await notesRepository.add(noteDto);

      // On success, replace the temporary note with the real one
      set((state) => ({
        notes: state.notes.map((note) => (note.id === tempId ? savedNote : note)),
        selectedNoteId: savedNote.id,
      }));
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
      console.error(`Note with id ${id} not found in the store.`);
      set({
        error: 'Could not update the note content, because it was not found.',
      });
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

    set((state) => ({
      notes: state.notes.map((note) =>
        note.id === id
          ? { ...note, content_json: content_json, content_text: content_text, updatedAt: Date.now() }
          : note,
      ),
    }));

    try {
      const updatedNote = await notesRepository.update(id, { content_json: content_json, content_text: content_text });

      set((state) => ({
        notes: state.notes.map((note) =>
          note.id === id
            ? {
                ...note,
                content_json: updatedNote.content_json,
                content_text: updatedNote.content_text,
                updatedAt: updatedNote.updatedAt,
              }
            : note,
        ),
        error: null,
      }));
    } catch (err) {
      console.error('Failed to update note content in IndexedDB:', err);
      set((state) => ({
        error: 'Could not save the note content. Please try again.',
        notes: state.notes.map((note) =>
          note.id === id
            ? {
                ...note,
                content_json: originalContent,
                content_text: originalContentText,
                updatedAt: originalUpdatedAt,
              }
            : note,
        ),
      }));
    }
  },

  updateNoteTitle: async (id: string, title: string) => {
    const originalNote = get().notes.find((note) => note.id === id);
    if (!originalNote) {
      console.error(`Note with id ${id} not found in the store.`);
      set({
        error: 'Could not update the note title, because it was not found.',
      });
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

    set((state) => ({
      notes: state.notes.map((note) => (note.id === id ? { ...note, title, updatedAt: Date.now() } : note)),
    }));

    try {
      const updatedNote = await notesRepository.update(id, { title });

      set((state) => ({
        notes: state.notes.map((note) =>
          note.id === id ? { ...note, title: updatedNote.title, updatedAt: updatedNote.updatedAt } : note,
        ),
        error: null,
      }));
    } catch (err) {
      console.error('Failed to update note content in IndexedDB:', err);
      set((state) => ({
        error: 'Could not save the note title. Please try again.',
        notes: state.notes.map((note) =>
          note.id === id ? { ...note, title: originalTitle, updatedAt: originalUpdatedAt } : note,
        ),
      }));
    }
  },

  renameNote: async (id: string, title: string) => {
    const originalNote = get().notes.find((note) => note.id === id);
    if (!originalNote) {
      console.error(`Note with id ${id} not found in the store.`);
      set({
        error: 'Could not rename the note, because it was not found.',
      });
      return;
    }
    const originalTitle = originalNote.title;
    const originalUpdatedAt = originalNote.updatedAt;

    set((state) => ({
      notes: state.notes.map((note) => (note.id === id ? { ...note, title, updatedAt: Date.now() } : note)),
    }));

    try {
      const updatedNote = await notesRepository.update(id, { title });

      set((state) => ({
        notes: state.notes.map((note) =>
          note.id === id ? { ...note, title: updatedNote.title, updatedAt: updatedNote.updatedAt } : note,
        ),
        error: null,
      }));
    } catch (err) {
      console.error('Failed to rename note in IndexedDB:', err);
      set((state) => ({
        error: 'Could not rename the note. Please try again.',
        notes: state.notes.map((note) =>
          note.id === id ? { ...note, title: originalTitle, updatedAt: originalUpdatedAt } : note,
        ),
      }));
    }
  },

  deleteNote: async (id: string) => {
    set((state) => ({
      notes: state.notes.filter((note) => note.id !== id),
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
