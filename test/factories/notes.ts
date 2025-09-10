import { JSONContent } from '@tiptap/react';
import { BaseNote, NoteCreateDTO, NoteDTO, NoteUpdateDTO, type LocalNote } from '@/shared/schemas/notes';

export const DEFAULT_NOTE_DATE = new Date('2025-01-01T00:00:00Z');

export const createMockBaseNote = (overrides?: Partial<BaseNote>): BaseNote => ({
  id: 'test-note',
  title: 'Test Note',
  content_json: { type: 'doc', content: [] } as JSONContent,
  content_text: 'Test content',
  createdAt: DEFAULT_NOTE_DATE,
  updatedAt: DEFAULT_NOTE_DATE,
  deletedAt: null,
  version: 1,
  ...overrides,
});

export const createMockLocalNote = (overrides?: Partial<LocalNote>): LocalNote => ({
  id: 'test-note',
  title: 'Test Note',
  content_json: { type: 'doc', content: [] } as JSONContent,
  content_text: 'Test content',
  createdAt: DEFAULT_NOTE_DATE,
  updatedAt: DEFAULT_NOTE_DATE,
  deletedAt: null,
  version: 1,
  syncStatus: 'synced',
  baseVersion: 0,
  ...overrides,
});

export const createMockNoteDTO = (overrides?: Partial<NoteDTO>): NoteDTO => ({
  id: 'test-note',
  title: 'Test Note',
  content_json: { type: 'doc', content: [] } as JSONContent,
  content_text: 'Test content',
  createdAt: DEFAULT_NOTE_DATE,
  updatedAt: DEFAULT_NOTE_DATE,
  deletedAt: null,
  version: 1,
  ...overrides,
});

export const createMockNoteCreateDTO = (overrides?: Partial<NoteCreateDTO>): NoteCreateDTO => ({
  id: 'test-note',
  title: 'Test Note',
  content_json: { type: 'doc', content: [] } as JSONContent,
  content_text: 'Test content',
  ...overrides,
});

export const createMockNoteUpdateDTO = (overrides?: Partial<NoteUpdateDTO>): NoteUpdateDTO => ({
  title: 'Test Note',
  content_json: { type: 'doc', content: [] } as JSONContent,
  content_text: 'Test content',
  baseVersion: 0,
  ...overrides,
});
