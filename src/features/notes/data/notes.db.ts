'use client';

import { Note } from '@/shared/schemas/notes';
import Dexie, { EntityTable } from 'dexie';

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
