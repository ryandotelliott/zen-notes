import { beforeEach, describe, expect, it, vi } from 'vitest';
import { syncWithRemote, __ops } from './sync';
import { notesApi } from '@/features/notes/api';
import { localNotesRepository } from '@/features/notes/data/notes.repo';
import { createMockLocalNote, createMockNoteDTO, DEFAULT_NOTE_DATE } from '@/factories/notes';
import { addSecs } from '@/shared/lib/date-utils';

describe('pushLocalChanges', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('creates new note when baseVersion is 0 and not deleted', async () => {
    const local = createMockLocalNote({ baseVersion: 0, deletedAt: null, syncStatus: 'pending' });
    const remote = createMockNoteDTO({ id: local.id, version: 1 });

    vi.spyOn(localNotesRepository, 'getUnsyncedNotes').mockResolvedValue([local]);
    const createSpy = vi.spyOn(notesApi, 'create').mockResolvedValue({ ok: true, data: remote });
    const updateFromServerSpy = vi.spyOn(localNotesRepository, 'updateFromServer').mockResolvedValue();

    const res = await __ops.pushLocalChanges();
    expect(res).toEqual({ success: true, pushed: 1, pulled: 0, conflicts: 0 });
    expect(createSpy).toHaveBeenCalledWith({
      id: local.id,
      title: local.title,
      content_text: local.content_text,
      content_json: local.content_json,
    });
    expect(updateFromServerSpy).toHaveBeenCalledWith(remote);
  });

  it('updates note when baseVersion > 0 and not deleted', async () => {
    const local = createMockLocalNote({ baseVersion: 2, deletedAt: null, syncStatus: 'pending' });
    const remote = createMockNoteDTO({ id: local.id, version: 3 });

    vi.spyOn(localNotesRepository, 'getUnsyncedNotes').mockResolvedValue([local]);
    const updateSpy = vi.spyOn(notesApi, 'update').mockResolvedValue({ ok: true, data: remote });
    const updateFromServerSpy = vi.spyOn(localNotesRepository, 'updateFromServer').mockResolvedValue();

    const res = await __ops.pushLocalChanges();
    expect(res).toEqual({ success: true, pushed: 1, pulled: 0, conflicts: 0 });
    expect(updateSpy).toHaveBeenCalledWith(local.id, {
      title: local.title,
      content_text: local.content_text,
      content_json: local.content_json,
      baseVersion: 2,
    });
    expect(updateFromServerSpy).toHaveBeenCalledWith(remote);
  });

  it('erases local note when never on server (baseVersion 0) and deleted', async () => {
    const local = createMockLocalNote({ baseVersion: 0, deletedAt: DEFAULT_NOTE_DATE, syncStatus: 'pending' });

    vi.spyOn(localNotesRepository, 'getUnsyncedNotes').mockResolvedValue([local]);
    const eraseSpy = vi.spyOn(localNotesRepository, 'erase').mockResolvedValue();
    const removeSpy = vi
      .spyOn(notesApi, 'remove')
      .mockResolvedValue({ ok: true, data: createMockNoteDTO({ id: local.id }) });

    const res = await __ops.pushLocalChanges();
    expect(res).toEqual({ success: true, pushed: 1, pulled: 0, conflicts: 0 });
    expect(eraseSpy).toHaveBeenCalledWith(local.id);
    expect(removeSpy).not.toHaveBeenCalled();
  });

  it('deletes on server when baseVersion > 0 and deleted', async () => {
    const local = createMockLocalNote({ baseVersion: 2, deletedAt: DEFAULT_NOTE_DATE, syncStatus: 'pending' });
    const serverTombstone = createMockNoteDTO({ id: local.id, version: 3, deletedAt: DEFAULT_NOTE_DATE });

    vi.spyOn(localNotesRepository, 'getUnsyncedNotes').mockResolvedValue([local]);
    const removeSpy = vi.spyOn(notesApi, 'remove').mockResolvedValue({ ok: true, data: serverTombstone });
    const updateFromServerSpy = vi.spyOn(localNotesRepository, 'updateFromServer').mockResolvedValue();

    const res = await __ops.pushLocalChanges();
    expect(res).toEqual({ success: true, pushed: 1, pulled: 0, conflicts: 0 });
    expect(removeSpy).toHaveBeenCalledWith(local.id, 2);
    expect(updateFromServerSpy).toHaveBeenCalledWith(serverTombstone);
  });

  it('resolves conflict on update by forcing overwrite with server version (winner local)', async () => {
    const now = DEFAULT_NOTE_DATE;
    const local = createMockLocalNote({
      baseVersion: 2,
      deletedAt: null,
      syncStatus: 'pending',
      updatedAt: addSecs(now, 2),
    });
    const serverNote = createMockNoteDTO({ id: local.id, version: 5, updatedAt: addSecs(now, 1) });
    const afterRetry = createMockNoteDTO({ id: local.id, version: 6, updatedAt: addSecs(now, 3) });

    vi.spyOn(localNotesRepository, 'getUnsyncedNotes').mockResolvedValue([local]);
    const updateSpy = vi
      .spyOn(notesApi, 'update')
      .mockResolvedValueOnce({ ok: false, code: 'conflict', status: 409, data: serverNote })
      .mockResolvedValueOnce({ ok: true, data: afterRetry });
    const updateFromServerSpy = vi.spyOn(localNotesRepository, 'updateFromServer').mockResolvedValue();

    const res = await __ops.pushLocalChanges();
    expect(res).toEqual({ success: true, pushed: 1, pulled: 0, conflicts: 1 });
    expect(updateSpy).toHaveBeenNthCalledWith(1, local.id, {
      title: local.title,
      content_text: local.content_text,
      content_json: local.content_json,
      baseVersion: 2,
    });
    expect(updateSpy).toHaveBeenNthCalledWith(2, local.id, {
      title: local.title,
      content_text: local.content_text,
      content_json: local.content_json,
      baseVersion: serverNote.version,
    });
    expect(updateFromServerSpy).toHaveBeenCalledWith(afterRetry);
  });

  it('resolves conflict on delete by retrying remove with server version (winner local)', async () => {
    const now = DEFAULT_NOTE_DATE;
    const local = createMockLocalNote({
      baseVersion: 2,
      deletedAt: addSecs(now, 2),
      syncStatus: 'pending',
      updatedAt: now,
    });
    const serverNote = createMockNoteDTO({ id: local.id, version: 7, updatedAt: addSecs(now, 1), deletedAt: null });

    vi.spyOn(localNotesRepository, 'getUnsyncedNotes').mockResolvedValue([local]);
    const removeSpy = vi
      .spyOn(notesApi, 'remove')
      .mockResolvedValueOnce({ ok: false, code: 'conflict', status: 409, data: serverNote })
      .mockResolvedValueOnce({ ok: true, data: serverNote });
    const updateFromServerSpy = vi.spyOn(localNotesRepository, 'updateFromServer').mockResolvedValue();

    const res = await __ops.pushLocalChanges();
    expect(res).toEqual({ success: true, pushed: 1, pulled: 0, conflicts: 1 });
    expect(removeSpy).toHaveBeenNthCalledWith(1, local.id, 2);
    expect(removeSpy).toHaveBeenNthCalledWith(2, local.id, serverNote.version);
    expect(updateFromServerSpy).toHaveBeenCalledWith(serverNote);
  });

  it('on conflict where winner is remote, pulls remote changes instead', async () => {
    const now = DEFAULT_NOTE_DATE;
    const local = createMockLocalNote({ baseVersion: 2, deletedAt: null, syncStatus: 'pending', updatedAt: now });
    const serverNote = createMockNoteDTO({ id: local.id, version: 7, updatedAt: addSecs(now, 2) });

    vi.spyOn(localNotesRepository, 'getUnsyncedNotes').mockResolvedValue([local]);
    vi.spyOn(notesApi, 'update').mockResolvedValue({ ok: false, code: 'conflict', status: 409, data: serverNote });
    const updateFromServerSpy = vi.spyOn(localNotesRepository, 'updateFromServer').mockResolvedValue();

    const res = await __ops.pushLocalChanges();
    expect(res).toEqual({ success: true, pushed: 0, pulled: 1, conflicts: 1 });
    expect(updateFromServerSpy).toHaveBeenCalledWith(serverNote);
  });

  it('on not_found during update, creates the note on server', async () => {
    const local = createMockLocalNote({ baseVersion: 3, deletedAt: null, syncStatus: 'pending' });
    const remote = createMockNoteDTO({ id: local.id, version: 1 });

    vi.spyOn(localNotesRepository, 'getUnsyncedNotes').mockResolvedValue([local]);
    const updateSpy = vi.spyOn(notesApi, 'update').mockResolvedValue({ ok: false, code: 'not_found', status: 404 });
    const createSpy = vi.spyOn(notesApi, 'create').mockResolvedValue({ ok: true, data: remote });
    const updateFromServerSpy = vi.spyOn(localNotesRepository, 'updateFromServer').mockResolvedValue();

    const res = await __ops.pushLocalChanges();
    expect(res).toEqual({ success: true, pushed: 1, pulled: 0, conflicts: 0 });
    expect(updateSpy).toHaveBeenCalled();
    expect(createSpy).toHaveBeenCalled();
    expect(updateFromServerSpy).toHaveBeenCalledWith(remote);
  });

  it('on not_found during delete, erases locally', async () => {
    const local = createMockLocalNote({ baseVersion: 3, deletedAt: DEFAULT_NOTE_DATE, syncStatus: 'pending' });

    vi.spyOn(localNotesRepository, 'getUnsyncedNotes').mockResolvedValue([local]);
    vi.spyOn(notesApi, 'remove').mockResolvedValue({ ok: false, code: 'not_found', status: 404 });
    const eraseSpy = vi.spyOn(localNotesRepository, 'erase').mockResolvedValue();

    const res = await __ops.pushLocalChanges();
    expect(res).toEqual({ success: true, pushed: 1, pulled: 0, conflicts: 0 });
    expect(eraseSpy).toHaveBeenCalledWith(local.id);
  });

  it('on create receiving 404 leaves pending (no counters increment)', async () => {
    const local = createMockLocalNote({ baseVersion: 0, deletedAt: null, syncStatus: 'pending' });

    vi.spyOn(localNotesRepository, 'getUnsyncedNotes').mockResolvedValue([local]);
    vi.spyOn(notesApi, 'create').mockResolvedValue({ ok: false, code: 'not_found', status: 404 });

    const res = await __ops.pushLocalChanges();
    expect(res).toEqual({ success: true, pushed: 0, pulled: 0, conflicts: 0 });
  });

  it('on server error leaves pending (no counters increment)', async () => {
    const local = createMockLocalNote({ baseVersion: 4, deletedAt: null, syncStatus: 'pending' });

    vi.spyOn(localNotesRepository, 'getUnsyncedNotes').mockResolvedValue([local]);
    vi.spyOn(notesApi, 'update').mockResolvedValue({ ok: false, code: 'server', status: 500 });

    const res = await __ops.pushLocalChanges();
    expect(res).toEqual({ success: true, pushed: 0, pulled: 0, conflicts: 0 });
  });
});

describe('pullServerChanges', () => {
  it('should return success: false when getAll fails', async () => {
    vi.spyOn(notesApi, 'getAll').mockResolvedValue({ ok: false, code: 'server', status: 500 });

    const res = await __ops.pullServerChanges();
    expect(res).toEqual({ success: false, pulled: 0, conflicts: 0, pushed: 0 });
  });

  it('pulls remote note when local is missing', async () => {
    const remote = createMockNoteDTO({ id: 'r1', version: 1 });

    vi.spyOn(notesApi, 'getAll').mockResolvedValue({ ok: true, data: [remote] });
    vi.spyOn(localNotesRepository, 'get').mockResolvedValue(undefined);
    const updateFromServerSpy = vi.spyOn(localNotesRepository, 'updateFromServer').mockResolvedValue();

    const res = await __ops.pullServerChanges();
    expect(res).toEqual({ success: true, pulled: 1, conflicts: 0, pushed: 0 });
    expect(updateFromServerSpy).toHaveBeenCalledWith(remote);
  });

  it('skips pull when needsPull is false (baseVersion >= remote.version)', async () => {
    const remote = createMockNoteDTO({ id: 'r2', version: 2 });
    const local = createMockLocalNote({ id: 'r2', baseVersion: 2, syncStatus: 'synced' });

    vi.spyOn(notesApi, 'getAll').mockResolvedValue({ ok: true, data: [remote] });
    vi.spyOn(localNotesRepository, 'get').mockResolvedValue(local);
    const updateFromServerSpy = vi.spyOn(localNotesRepository, 'updateFromServer').mockResolvedValue();

    const res = await __ops.pullServerChanges();
    expect(res).toEqual({ success: true, pulled: 0, conflicts: 0, pushed: 0 });
    expect(updateFromServerSpy).not.toHaveBeenCalled();
  });

  it('pulls when local is synced and remote has newer version', async () => {
    const remote = createMockNoteDTO({ id: 'r3', version: 3 });
    const local = createMockLocalNote({ id: 'r3', baseVersion: 2, syncStatus: 'synced' });

    vi.spyOn(notesApi, 'getAll').mockResolvedValue({ ok: true, data: [remote] });
    vi.spyOn(localNotesRepository, 'get').mockResolvedValue(local);
    const updateFromServerSpy = vi.spyOn(localNotesRepository, 'updateFromServer').mockResolvedValue();

    const res = await __ops.pullServerChanges();
    expect(res).toEqual({ success: true, pulled: 1, conflicts: 0, pushed: 0 });
    expect(updateFromServerSpy).toHaveBeenCalledWith(remote);
  });

  it('when local is pending and remote wins, pulls and counts conflict', async () => {
    const now = DEFAULT_NOTE_DATE;
    const remote = createMockNoteDTO({ id: 'r4', version: 5, updatedAt: addSecs(now, 2) });
    const local = createMockLocalNote({ id: 'r4', baseVersion: 4, syncStatus: 'pending', updatedAt: now });

    vi.spyOn(notesApi, 'getAll').mockResolvedValue({ ok: true, data: [remote] });
    vi.spyOn(localNotesRepository, 'get').mockResolvedValue(local);
    const updateFromServerSpy = vi.spyOn(localNotesRepository, 'updateFromServer').mockResolvedValue();

    const res = await __ops.pullServerChanges();
    expect(res).toEqual({ success: true, pulled: 1, conflicts: 1, pushed: 0 });
    expect(updateFromServerSpy).toHaveBeenCalledWith(remote);
  });

  it('when local is pending and local wins, keeps local pending (no changes)', async () => {
    const now = DEFAULT_NOTE_DATE;
    const remote = createMockNoteDTO({ id: 'r5', version: 5, updatedAt: now });
    const local = createMockLocalNote({ id: 'r5', baseVersion: 4, syncStatus: 'pending', updatedAt: addSecs(now, 2) });

    vi.spyOn(notesApi, 'getAll').mockResolvedValue({ ok: true, data: [remote] });
    vi.spyOn(localNotesRepository, 'get').mockResolvedValue(local);
    const updateFromServerSpy = vi.spyOn(localNotesRepository, 'updateFromServer').mockResolvedValue();

    const res = await __ops.pullServerChanges();
    expect(res).toEqual({ success: true, pulled: 0, conflicts: 0, pushed: 0 });
    expect(updateFromServerSpy).not.toHaveBeenCalled();
  });
});

describe('syncWithRemote', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('should return success: true when both push and pull are successful', async () => {
    const pushSpy = vi
      .spyOn(__ops, 'pushLocalChanges')
      .mockResolvedValue({ success: true, pushed: 1, pulled: 0, conflicts: 0 });
    const pullSpy = vi
      .spyOn(__ops, 'pullServerChanges')
      .mockResolvedValue({ success: true, pushed: 0, pulled: 1, conflicts: 0 });

    const res = await syncWithRemote();
    expect(res).toEqual({ success: true, pushed: 1, pulled: 1, conflicts: 0 });
    expect(pushSpy).toHaveBeenCalled();
    expect(pullSpy).toHaveBeenCalled();
  });

  it('should return success: false when push fails', async () => {
    const pushSpy = vi
      .spyOn(__ops, 'pushLocalChanges')
      .mockResolvedValue({ success: false, pushed: 0, pulled: 0, conflicts: 0 });
    const pullSpy = vi
      .spyOn(__ops, 'pullServerChanges')
      .mockResolvedValue({ success: true, pushed: 0, pulled: 0, conflicts: 0 });

    const res = await syncWithRemote();
    expect(res).toEqual({ success: false, pushed: 0, pulled: 0, conflicts: 0 });
    expect(pushSpy).toHaveBeenCalled();
    expect(pullSpy).toHaveBeenCalled();
  });

  it('should return success: false when pull fails', async () => {
    const pushSpy = vi
      .spyOn(__ops, 'pushLocalChanges')
      .mockResolvedValue({ success: true, pushed: 0, pulled: 0, conflicts: 0 });
    const pullSpy = vi
      .spyOn(__ops, 'pullServerChanges')
      .mockResolvedValue({ success: false, pushed: 0, pulled: 0, conflicts: 0 });

    const res = await syncWithRemote();
    expect(res).toEqual({ success: false, pushed: 0, pulled: 0, conflicts: 0 });
    expect(pushSpy).toHaveBeenCalled();
    expect(pullSpy).toHaveBeenCalled();
  });
});
