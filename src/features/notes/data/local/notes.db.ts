'use client';

import Dexie, { EntityTable } from 'dexie';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

class NotesDB extends Dexie {
  notes!: EntityTable<Note, 'id'>;

  constructor() {
    super('zen-notes');
    this.version(1).stores({
      notes: 'id, title, createdAt, updatedAt',
    });
  }
}

const db = new NotesDB();

export { db };
export type { Note };
