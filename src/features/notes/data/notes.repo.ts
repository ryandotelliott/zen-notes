'use client';

import { db } from '@/features/notes/data/notes.db';
import type { LocalNote, NoteDTO } from '@/shared/schemas/notes';

export type CreateNoteDTO = Pick<LocalNote, 'title' | 'content_json' | 'content_text'>;
export type UpdateNoteDTO = Partial<Omit<LocalNote, 'id' | 'createdAt' | 'version' | 'baseVersion'>>;

async function getAll(): Promise<LocalNote[]> {
  return await db.notes.orderBy('createdAt').reverse().toArray();
}

async function get(id: string): Promise<LocalNote | undefined> {
  return await db.notes.get(id);
}

async function getUnsyncedNotes(): Promise<LocalNote[]> {
  return await db.notes.where('syncStatus').anyOf(['pending', 'failed']).toArray();
}

async function getDeletedNotes(): Promise<LocalNote[]> {
  return await db.notes.filter((note) => note.deletedAt !== null).toArray();
}

async function add(noteDto: CreateNoteDTO): Promise<LocalNote> {
  const newNote: LocalNote = {
    id: crypto.randomUUID(),
    ...noteDto,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 0,
    syncStatus: 'pending',
    deletedAt: null,
    baseVersion: 0,
  };
  await db.notes.add(newNote);
  return newNote;
}

async function update(id: string, noteDto: UpdateNoteDTO): Promise<LocalNote> {
  const noteToUpdate = await db.notes.get(id);
  if (!noteToUpdate) {
    throw new Error(`Note with id ${id} not found`);
  }

  const updatedFields = {
    ...noteDto,
    updatedAt: new Date(),
    syncStatus: 'pending',
    deletedAt: null,
    baseVersion: noteToUpdate.version,
    version: noteToUpdate.version + 1,
  } as const;

  await db.notes.update(id, updatedFields);
  return { ...noteToUpdate, ...updatedFields };
}

async function remove(id: string): Promise<void> {
  const noteToUpdate = await db.notes.get(id);
  if (!noteToUpdate) {
    throw new Error(`Note with id ${id} not found`);
  }

  await db.notes.update(id, {
    deletedAt: new Date(),
    syncStatus: 'pending',
    baseVersion: noteToUpdate.version,
  });
}

// Syncing Methods
async function updateFromServer(serverNote: NoteDTO): Promise<void> {
  const localNote = await db.notes.get(serverNote.id);

  if (localNote) {
    // Update existing note with server data
    await db.notes.update(serverNote.id, {
      ...serverNote,
      syncStatus: 'synced',
      lastSyncedAt: new Date(),
      baseVersion: serverNote.version,
    });
  } else {
    // Add new note from server
    const localNoteData: LocalNote = {
      ...serverNote,
      syncStatus: 'synced',
      lastSyncedAt: new Date(),
      baseVersion: serverNote.version,
    };
    await db.notes.add(localNoteData);
  }
}

export const localNotesRepository = {
  getAll,
  get,
  getUnsyncedNotes,
  getDeletedNotes,
  add,
  update,
  remove,

  // Syncing
  updateFromServer,
};
