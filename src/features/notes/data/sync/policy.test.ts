import { describe, it, expect } from 'vitest';
import { getLWWResolution, needsPull, isTombstoned } from './policy';
import { LocalNote, NoteDTO } from '@/shared/schemas/notes';
import { JSONContent } from '@tiptap/react';
import { addSecs } from '@/shared/lib/date-utils';

const DEFAULT_DATE = new Date('2025-01-01T00:00:00Z');

// Mock data factory
const createMockNote = (overrides?: Partial<LocalNote>): LocalNote => ({
  id: 'test-note',
  title: 'Test Note',
  content_json: { type: 'doc', content: [] } as JSONContent,
  content_text: 'Test content',
  createdAt: DEFAULT_DATE,
  updatedAt: DEFAULT_DATE,
  deletedAt: null,
  version: 1,
  syncStatus: 'synced',
  baseVersion: 0,
  ...overrides,
});

const createMockNoteDTO = (overrides?: Partial<NoteDTO>): NoteDTO => ({
  id: 'test-note',
  title: 'Test Note',
  content_json: { type: 'doc', content: [] } as JSONContent,
  content_text: 'Test content',
  createdAt: DEFAULT_DATE,
  updatedAt: DEFAULT_DATE,
  deletedAt: null,
  version: 1,
  ...overrides,
});

describe('getLWWResolution', () => {
  it('returns "local" when local updatedAt is newer than remote updatedAt', () => {
    const local = createMockNote({
      updatedAt: addSecs(DEFAULT_DATE, 1),
    });
    const remote = createMockNoteDTO({
      updatedAt: DEFAULT_DATE,
    });

    expect(getLWWResolution(local, remote)).toBe('local');
  });

  it('returns "remote" when remote updatedAt is newer than local updatedAt', () => {
    const local = createMockNote({
      updatedAt: DEFAULT_DATE,
    });
    const remote = createMockNoteDTO({
      updatedAt: addSecs(DEFAULT_DATE, 1),
    });

    expect(getLWWResolution(local, remote)).toBe('remote');
  });

  it('returns "remote" when timestamps are equal (tie goes to remote)', () => {
    const local = createMockNote({ updatedAt: DEFAULT_DATE });
    const remote = createMockNoteDTO({ updatedAt: DEFAULT_DATE });

    expect(getLWWResolution(local, remote)).toBe('remote');
  });

  it('returns "local" when local is deleted but has newer deletedAt than remote updatedAt', () => {
    const local = createMockNote({
      updatedAt: DEFAULT_DATE,
      deletedAt: addSecs(DEFAULT_DATE, 1),
    });
    const remote = createMockNoteDTO({
      updatedAt: DEFAULT_DATE,
      deletedAt: null,
    });

    expect(getLWWResolution(local, remote)).toBe('local');
  });

  it('returns "remote" when remote is deleted but has newer deletedAt than local updatedAt', () => {
    const local = createMockNote({
      updatedAt: DEFAULT_DATE,
      deletedAt: null,
    });
    const remote = createMockNoteDTO({
      updatedAt: DEFAULT_DATE,
      deletedAt: addSecs(DEFAULT_DATE, 1),
    });

    expect(getLWWResolution(local, remote)).toBe('remote');
  });

  it('returns "local" when both deleted but local deletedAt is newer', () => {
    const local = createMockNote({
      updatedAt: DEFAULT_DATE,
      deletedAt: addSecs(DEFAULT_DATE, 1),
    });
    const remote = createMockNoteDTO({
      updatedAt: DEFAULT_DATE,
      deletedAt: DEFAULT_DATE,
    });

    expect(getLWWResolution(local, remote)).toBe('local');
  });

  it('returns "remote" when both deleted but remote deletedAt is newer', () => {
    const local = createMockNote({
      updatedAt: DEFAULT_DATE,
      deletedAt: DEFAULT_DATE,
    });
    const remote = createMockNoteDTO({
      updatedAt: DEFAULT_DATE,
      deletedAt: addSecs(DEFAULT_DATE, 1),
    });

    expect(getLWWResolution(local, remote)).toBe('remote');
  });

  it('returns "local" when local updatedAt is newer than remote deletedAt', () => {
    const local = createMockNote({
      updatedAt: addSecs(DEFAULT_DATE, 1),
      deletedAt: null,
    });
    const remote = createMockNoteDTO({
      updatedAt: DEFAULT_DATE,
      deletedAt: DEFAULT_DATE,
    });

    expect(getLWWResolution(local, remote)).toBe('local');
  });

  it('returns "remote" when remote deletedAt is newer than local updatedAt', () => {
    const local = createMockNote({
      updatedAt: DEFAULT_DATE,
      deletedAt: null,
    });
    const remote = createMockNoteDTO({
      updatedAt: DEFAULT_DATE,
      deletedAt: addSecs(DEFAULT_DATE, 1),
    });

    expect(getLWWResolution(local, remote)).toBe('remote');
  });
});

describe('needsPull', () => {
  it('returns true when local note does not exist', () => {
    const remote = createMockNoteDTO({ version: 1 });

    expect(needsPull(undefined, remote)).toBe(true);
  });

  it('returns true when remote version is higher than local baseVersion', () => {
    const local = createMockNote({ baseVersion: 1 });
    const remote = createMockNoteDTO({ version: 2 });

    expect(needsPull(local, remote)).toBe(true);
  });

  it('returns false when remote version is lower than local baseVersion', () => {
    const local = createMockNote({ baseVersion: 2 });
    const remote = createMockNoteDTO({ version: 1 });

    expect(needsPull(local, remote)).toBe(false);
  });

  it('returns false when remote version equals local baseVersion', () => {
    const local = createMockNote({ baseVersion: 1 });
    const remote = createMockNoteDTO({ version: 1 });

    expect(needsPull(local, remote)).toBe(false);
  });
});

describe('isTombstoned', () => {
  it('returns false when deletedAt is null', () => {
    const note = { deletedAt: null };

    expect(isTombstoned(note)).toBe(false);
  });

  it('returns true when deletedAt is a valid date', () => {
    const note = { deletedAt: DEFAULT_DATE };

    expect(isTombstoned(note)).toBe(true);
  });
});
