'use client';

import { db } from '@/features/notes/data/notes.db';
import { type Note } from '@/shared/schemas/notes';

export type CreateNoteDTO = Pick<Note, 'title' | 'content_json' | 'content_text'>;
export type UpdateNoteDTO = Partial<Omit<Note, 'id' | 'createdAt'>>;

async function getAll(): Promise<Note[]> {
  return await db.notes.orderBy('createdAt').reverse().toArray();
}

async function get(id: string): Promise<Note | undefined> {
  return await db.notes.get(id);
}

async function add(noteDto: CreateNoteDTO): Promise<Note> {
  const newNote: Note = {
    id: crypto.randomUUID(),
    ...noteDto,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await db.notes.add(newNote);
  return newNote;
}

async function update(id: string, noteDto: UpdateNoteDTO): Promise<Note> {
  const noteToUpdate = await db.notes.get(id);
  if (!noteToUpdate) {
    throw new Error(`Note with id ${id} not found`);
  }

  const updatedFields = {
    ...noteDto,
    updatedAt: new Date(),
  };

  await db.notes.update(id, updatedFields);
  return { ...noteToUpdate, ...updatedFields };
}

async function remove(id: string): Promise<void> {
  await db.notes.delete(id);
}

export const notesRepository = {
  getAll,
  get,
  add,
  update,
  remove,
};
