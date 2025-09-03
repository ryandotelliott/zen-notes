'use client';

import { db, type Note } from './notes.db';

export type CreateNoteDTO = Pick<Note, 'title' | 'content'>;
export type UpdateNoteDTO = Partial<Omit<Note, 'id' | 'createdAt'>>;

async function getAll(): Promise<Note[]> {
  return db.notes.orderBy('createdAt').reverse().toArray();
}

async function add(noteDto: CreateNoteDTO): Promise<Note> {
  const newNote: Note = {
    id: crypto.randomUUID(),
    ...noteDto,
    createdAt: Date.now(),
    updatedAt: Date.now(),
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
    updatedAt: Date.now(),
  };

  await db.notes.update(id, updatedFields);
  return { ...noteToUpdate, ...updatedFields };
}

async function remove(id: string): Promise<void> {
  await db.notes.delete(id);
}

export const notesRepository = {
  getAll,
  add,
  update,
  remove,
};
