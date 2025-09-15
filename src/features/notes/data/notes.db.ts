'use client';

import { type LocalNote } from '@/shared/schemas/notes';
import Dexie, { EntityTable } from 'dexie';

class NotesDB extends Dexie {
  notes!: EntityTable<LocalNote, 'id'>;
  meta!: EntityTable<{ key: string; value: number }, 'key'>;

  constructor() {
    super('zen-notes');
    this.version(1).stores({
      notes: 'id, title, createdAt, updatedAt, syncStatus, version, listOrderSeq, [listOrderSeq+createdAt]',
      meta: 'key',
    });
  }
}

const db = new NotesDB();

export { db };
