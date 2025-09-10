'use client';

import { db } from '@/features/notes/data/notes.db';
import { liveQuery, type Observable } from 'dexie';
import type { LocalNote, NoteDTO } from '@/shared/schemas/notes';

export type CreateNoteDTO = Pick<LocalNote, 'title' | 'content_json' | 'content_text'>;
export type UpdateNoteDTO = Partial<Omit<LocalNote, 'id' | 'createdAt' | 'version' | 'baseVersion'>>;

async function getAll(includeDeleted: boolean = false): Promise<LocalNote[]> {
  let collection = db.notes.orderBy('createdAt').reverse();
  if (!includeDeleted) {
    collection = collection.filter((note) => note.deletedAt === null);
  }
  return await collection.toArray();
}

/**
 * Observable stream of notes that emits whenever the underlying table changes.
 */
function observeAll(includeDeleted: boolean = false): Observable<LocalNote[]> {
  return liveQuery(async () => {
    let collection = db.notes.orderBy('createdAt').reverse();
    if (!includeDeleted) {
      collection = collection.filter((note) => note.deletedAt === null);
    }
    return await collection.toArray();
  });
}

async function get(id: string): Promise<LocalNote | undefined> {
  return await db.notes.get(id);
}

async function getUnsyncedNotes(): Promise<LocalNote[]> {
  return await db.notes.where('syncStatus').equals('pending').toArray();
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
    // Preserve baseVersion as the last server-acknowledged version.
    // Local edits must NOT change baseVersion.
    baseVersion: noteToUpdate.baseVersion,
    version: noteToUpdate.version + 1,
  } as const;

  await db.notes.update(id, updatedFields);
  return { ...noteToUpdate, ...updatedFields };
}

/**
 * Marks a note as deleted (tombstoned) in the database.
 */
async function remove(id: string): Promise<void> {
  const noteToUpdate = await db.notes.get(id);
  if (!noteToUpdate) {
    throw new Error(`Note with id ${id} not found`);
  }

  await db.notes.update(id, {
    deletedAt: new Date(),
    syncStatus: 'pending',
    // Preserve baseVersion as the last server-acknowledged version.
    // Local edits must NOT change baseVersion.
    baseVersion: noteToUpdate.baseVersion,
  });
}

/**
 * Erases a note from the database.
 * This is used when a note is deleted before ever being on the server, or if a deleted note is being cleaned.
 */
async function erase(id: string): Promise<void> {
  await db.notes.delete(id);
}

// Syncing Methods
async function updateFromServer(serverNote: NoteDTO): Promise<void> {
  const localNote = await db.notes.get(serverNote.id);

  if (localNote) {
    // Update existing note with server data
    await db.notes.update(serverNote.id, {
      ...serverNote,
      syncStatus: 'synced',
      baseVersion: serverNote.version,
    });
  } else {
    // Add new note from server
    const localNoteData: LocalNote = {
      ...serverNote,
      syncStatus: 'synced',
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
  erase,

  // Syncing
  updateFromServer,
  observeAll,
};
