import { describe, it, expect } from 'vitest';
import { getLWWResolution, needsPull, isTombstoned } from './policy';
import { addSecs } from '@/shared/lib/date-utils';
import { createMockLocalNote, createMockNoteDTO, DEFAULT_NOTE_DATE } from '@/test/factories/notes';

describe('getLWWResolution', () => {
  it('returns "local" when local updatedAt is newer than remote updatedAt', () => {
    const local = createMockLocalNote({
      updatedAt: addSecs(DEFAULT_NOTE_DATE, 1),
    });
    const remote = createMockNoteDTO({
      updatedAt: DEFAULT_NOTE_DATE,
    });

    expect(getLWWResolution(local, remote)).toBe('local');
  });

  it('returns "remote" when remote updatedAt is newer than local updatedAt', () => {
    const local = createMockLocalNote({
      updatedAt: DEFAULT_NOTE_DATE,
    });
    const remote = createMockNoteDTO({
      updatedAt: addSecs(DEFAULT_NOTE_DATE, 1),
    });

    expect(getLWWResolution(local, remote)).toBe('remote');
  });

  it('returns "remote" when timestamps are equal (tie goes to remote)', () => {
    const local = createMockLocalNote({ updatedAt: DEFAULT_NOTE_DATE });
    const remote = createMockNoteDTO({ updatedAt: DEFAULT_NOTE_DATE });

    expect(getLWWResolution(local, remote)).toBe('remote');
  });

  it('returns "local" when local is deleted but has newer deletedAt than remote updatedAt', () => {
    const local = createMockLocalNote({
      updatedAt: addSecs(DEFAULT_NOTE_DATE, 1),
      deletedAt: addSecs(DEFAULT_NOTE_DATE, 1),
    });
    const remote = createMockNoteDTO({
      updatedAt: DEFAULT_NOTE_DATE,
      deletedAt: null,
    });

    expect(getLWWResolution(local, remote)).toBe('local');
  });

  it('returns "remote" when remote is deleted but has newer deletedAt than local updatedAt', () => {
    const local = createMockLocalNote({
      updatedAt: DEFAULT_NOTE_DATE,
      deletedAt: null,
    });
    const remote = createMockNoteDTO({
      updatedAt: addSecs(DEFAULT_NOTE_DATE, 1),
      deletedAt: addSecs(DEFAULT_NOTE_DATE, 1),
    });

    expect(getLWWResolution(local, remote)).toBe('remote');
  });

  it('returns "local" when both deleted but local deletedAt is newer', () => {
    const local = createMockLocalNote({
      updatedAt: addSecs(DEFAULT_NOTE_DATE, 1),
      deletedAt: addSecs(DEFAULT_NOTE_DATE, 1),
    });
    const remote = createMockNoteDTO({
      updatedAt: DEFAULT_NOTE_DATE,
      deletedAt: DEFAULT_NOTE_DATE,
    });

    expect(getLWWResolution(local, remote)).toBe('local');
  });

  it('returns "remote" when both deleted but remote deletedAt is newer', () => {
    const local = createMockLocalNote({
      updatedAt: DEFAULT_NOTE_DATE,
      deletedAt: DEFAULT_NOTE_DATE,
    });
    const remote = createMockNoteDTO({
      updatedAt: addSecs(DEFAULT_NOTE_DATE, 1),
      deletedAt: addSecs(DEFAULT_NOTE_DATE, 1),
    });

    expect(getLWWResolution(local, remote)).toBe('remote');
  });

  it('returns "local" when local updatedAt is newer than remote deletedAt', () => {
    const local = createMockLocalNote({
      updatedAt: addSecs(DEFAULT_NOTE_DATE, 1),
      deletedAt: null,
    });
    const remote = createMockNoteDTO({
      updatedAt: DEFAULT_NOTE_DATE,
      deletedAt: DEFAULT_NOTE_DATE,
    });

    expect(getLWWResolution(local, remote)).toBe('local');
  });

  it('returns "remote" when remote deletedAt is newer than local updatedAt', () => {
    const local = createMockLocalNote({
      updatedAt: DEFAULT_NOTE_DATE,
      deletedAt: null,
    });
    const remote = createMockNoteDTO({
      updatedAt: addSecs(DEFAULT_NOTE_DATE, 1),
      deletedAt: addSecs(DEFAULT_NOTE_DATE, 1),
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
    const local = createMockLocalNote({ baseVersion: 1 });
    const remote = createMockNoteDTO({ version: 2 });

    expect(needsPull(local, remote)).toBe(true);
  });

  it('returns false when remote version is lower than local baseVersion', () => {
    const local = createMockLocalNote({ baseVersion: 2 });
    const remote = createMockNoteDTO({ version: 1 });

    expect(needsPull(local, remote)).toBe(false);
  });

  it('returns false when remote version equals local baseVersion', () => {
    const local = createMockLocalNote({ baseVersion: 1 });
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
    const note = { deletedAt: DEFAULT_NOTE_DATE };

    expect(isTombstoned(note)).toBe(true);
  });
});
