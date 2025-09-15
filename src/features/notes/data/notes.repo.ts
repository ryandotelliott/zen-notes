'use client';

import { db } from '@/features/notes/data/notes.db';
import { liveQuery, type Observable } from 'dexie';
import type { LocalNote, NoteDTO } from '@/shared/schemas/notes';

export type CreateNoteDTO = Pick<LocalNote, 'title' | 'contentJson' | 'contentText'>;
export type UpdateNoteDTO = Partial<
  Omit<LocalNote, 'id' | 'createdAt' | 'version' | 'baseVersion' | 'listOrderSeq' | 'syncStatus'>
> & { listOrderSeq?: number };

async function nextListOrderSeq(): Promise<number> {
  // Use a meta key in Dexie to ensure monotonic increasing counter locally
  const counter = await db.table('meta').get('listOrderCounter');
  const current = counter?.value ?? 0;
  const next = current + 1;
  await db.table('meta').put({ key: 'listOrderCounter', value: next });
  return next;
}

async function ensureListOrderCounterAtLeast(value: number): Promise<void> {
  const counter = await db.table('meta').get('listOrderCounter');
  const current = counter?.value ?? 0;
  if (value > current) {
    await db.table('meta').put({ key: 'listOrderCounter', value: value });
  }
}

async function getAll(includeDeleted: boolean = false): Promise<LocalNote[]> {
  let collection = db.notes.orderBy(['listOrderSeq', 'createdAt']).reverse();
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
    let collection = db.notes.orderBy(['listOrderSeq', 'createdAt']).reverse();
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

async function add(noteDto: CreateNoteDTO, opts?: { listOrderSeq?: number }): Promise<LocalNote> {
  const seq = opts?.listOrderSeq ?? (await nextListOrderSeq());
  const newNote: LocalNote = {
    id: crypto.randomUUID(),
    ...noteDto,
    createdAt: new Date(),
    updatedAt: new Date(),
    listOrderSeq: seq,
    pinned: false,
    version: 0,
    syncStatus: 'pending',
    deletedAt: null,
    baseVersion: 0,
  };
  await db.notes.add(newNote);
  return newNote;
}

async function reserveListOrderSeq(): Promise<number> {
  return await nextListOrderSeq();
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
    // Preserve baseVersion as the last server-acknowledged version.
    baseVersion: noteToUpdate.baseVersion,
    version: noteToUpdate.version + 1,
  } as const;

  await db.notes.update(id, updatedFields);
  return { ...noteToUpdate, ...updatedFields };
}

async function bumpListOrderSeq(id: string): Promise<LocalNote> {
  const noteToUpdate = await db.notes.get(id);
  if (!noteToUpdate) {
    throw new Error(`Note with id ${id} not found`);
  }

  const seq = await nextListOrderSeq();
  const updatedFields = {
    listOrderSeq: seq,
    updatedAt: new Date(),
    // bump is an intentional UX event; mark pending so it syncs
    syncStatus: 'pending',
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
    // Update existing note with server data. Never reduce listOrderSeq.
    const nextSeq = Math.max(localNote.listOrderSeq ?? 0, serverNote.listOrderSeq ?? 0);
    await db.notes.update(serverNote.id, {
      ...serverNote,
      listOrderSeq: nextSeq,
      syncStatus: 'synced',
      baseVersion: serverNote.version,
    });
    await ensureListOrderCounterAtLeast(nextSeq);
  } else {
    // Add new note from server
    const localNoteData: LocalNote = {
      ...serverNote,
      syncStatus: 'synced',
      baseVersion: serverNote.version,
    };
    await db.notes.add(localNoteData);
    await ensureListOrderCounterAtLeast(serverNote.listOrderSeq ?? 0);
  }
}

export const localNotesRepository = {
  getAll,
  get,
  getUnsyncedNotes,
  getDeletedNotes,
  add,
  reserveListOrderSeq,
  update,
  bumpListOrderSeq,
  ensureListOrderCounterAtLeast,
  remove,
  erase,

  // Syncing
  updateFromServer,
  observeAll,
};
