import { afterEach, beforeEach, describe, expect, it, MockInstance, vi } from 'vitest';
import { syncWithRemote, __ops } from './sync';
import { ApiResult, ApiResultWithCursor, notesApi } from '@/features/notes/api';
import { localNotesRepository } from '@/features/notes/data/notes.repo';
import { createMockLocalNote, createMockNoteDTO, DEFAULT_NOTE_DATE } from '@/test/factories/notes';
import { addMins, addSecs } from '@/shared/lib/date-utils';
import { NoteDTO } from '@/shared/schemas/notes';

const apiGetOk = (overrides = {}): ApiResultWithCursor<NoteDTO[]> => ({
  ok: true,
  data: [],
  nextCursor: undefined,
  ...overrides,
});

const apiGetErr = (overrides = {}): ApiResultWithCursor<NoteDTO[]> => ({
  ok: false,
  code: 'server',
  status: 500,
  ...overrides,
});

const apiOk = (overrides = {}): ApiResult<NoteDTO> => ({
  ok: true,
  data: {} as NoteDTO,
  ...overrides,
});

const apiErr = (overrides = {}): ApiResult<NoteDTO> => ({
  ok: false,
  code: 'server',
  status: 500,
  ...overrides,
});

describe('pushLocalChanges', () => {
  let apiCreateSpy: MockInstance<typeof notesApi.create>;
  let apiPatchSpy: MockInstance<typeof notesApi.patch>;
  let apiRemoveSpy: MockInstance<typeof notesApi.remove>;
  let lnGetUnsyncedNotesSpy: MockInstance<typeof localNotesRepository.getUnsyncedNotes>;
  let lnEraseSpy: MockInstance<typeof localNotesRepository.erase>;
  let lnUpdateFromServerSpy: MockInstance<typeof localNotesRepository.updateFromServer>;

  beforeEach(() => {
    apiCreateSpy = vi.spyOn(notesApi, 'create'); // set in each test
    apiPatchSpy = vi.spyOn(notesApi, 'patch'); // set in each test
    apiRemoveSpy = vi.spyOn(notesApi, 'remove'); // set in each test
    lnGetUnsyncedNotesSpy = vi.spyOn(localNotesRepository, 'getUnsyncedNotes'); // set in each test
    lnEraseSpy = vi.spyOn(localNotesRepository, 'erase'); // set in each test
    lnUpdateFromServerSpy = vi.spyOn(localNotesRepository, 'updateFromServer'); // set in each test
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates new note when baseVersion is 0 and not deleted', async () => {
    const local = createMockLocalNote({ baseVersion: 0, deletedAt: null, syncStatus: 'pending' });
    const remote = createMockNoteDTO({ id: local.id, version: 1 });

    lnGetUnsyncedNotesSpy.mockResolvedValue([local]);
    apiCreateSpy.mockResolvedValue(apiOk({ data: remote }));
    lnUpdateFromServerSpy.mockResolvedValue();

    const res = await __ops.pushLocalChanges();
    expect(res).toEqual({ success: true, pushed: 1, pulled: 0, conflicts: 0 });
    expect(apiCreateSpy).toHaveBeenCalledWith({
      id: local.id,
      title: local.title,
      contentText: local.contentText,
      contentJson: local.contentJson,
      listOrderSeq: local.listOrderSeq,
    });
    expect(lnUpdateFromServerSpy).toHaveBeenCalledWith(remote);
  });

  it('updates note when baseVersion > 0 and not deleted', async () => {
    const local = createMockLocalNote({ baseVersion: 2, deletedAt: null, syncStatus: 'pending' });
    const remote = createMockNoteDTO({ id: local.id, version: 3 });

    lnGetUnsyncedNotesSpy.mockResolvedValue([local]);
    apiPatchSpy.mockResolvedValue(apiOk({ data: remote }));
    lnUpdateFromServerSpy.mockResolvedValue();

    const res = await __ops.pushLocalChanges();
    expect(res).toEqual({ success: true, pushed: 1, pulled: 0, conflicts: 0 });
    expect(apiPatchSpy).toHaveBeenCalledWith(local.id, {
      title: local.title,
      contentText: local.contentText,
      contentJson: local.contentJson,
      listOrderSeq: local.listOrderSeq,
      baseVersion: 2,
    });
    expect(lnUpdateFromServerSpy).toHaveBeenCalledWith(remote);
  });

  it('erases local note when never on server (baseVersion 0) and deleted', async () => {
    const local = createMockLocalNote({ baseVersion: 0, deletedAt: DEFAULT_NOTE_DATE, syncStatus: 'pending' });

    lnGetUnsyncedNotesSpy.mockResolvedValue([local]);
    lnEraseSpy.mockResolvedValue();
    apiRemoveSpy.mockResolvedValue(apiOk({ data: createMockNoteDTO({ id: local.id }) }));

    const res = await __ops.pushLocalChanges();
    expect(res).toEqual({ success: true, pushed: 1, pulled: 0, conflicts: 0 });
    expect(lnEraseSpy).toHaveBeenCalledWith(local.id);
    expect(apiRemoveSpy).not.toHaveBeenCalled();
  });

  it('deletes on server when baseVersion > 0 and deleted', async () => {
    const local = createMockLocalNote({ baseVersion: 2, deletedAt: DEFAULT_NOTE_DATE, syncStatus: 'pending' });
    const serverTombstone = createMockNoteDTO({ id: local.id, version: 3, deletedAt: DEFAULT_NOTE_DATE });

    lnGetUnsyncedNotesSpy.mockResolvedValue([local]);
    apiRemoveSpy.mockResolvedValue(apiOk({ data: serverTombstone }));
    lnUpdateFromServerSpy.mockResolvedValue();

    const res = await __ops.pushLocalChanges();
    expect(res).toEqual({ success: true, pushed: 1, pulled: 0, conflicts: 0 });
    expect(apiRemoveSpy).toHaveBeenCalledWith(local.id, 2);
    expect(lnUpdateFromServerSpy).toHaveBeenCalledWith(serverTombstone);
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

    lnGetUnsyncedNotesSpy.mockResolvedValue([local]);
    apiPatchSpy
      .mockResolvedValueOnce(apiErr({ code: 'conflict', status: 409, data: serverNote })) // first call
      .mockResolvedValueOnce(apiOk({ data: afterRetry })); // after retry
    lnUpdateFromServerSpy.mockResolvedValue();

    const res = await __ops.pushLocalChanges();
    expect(res).toEqual({ success: true, pushed: 1, pulled: 0, conflicts: 1 });
    expect(apiPatchSpy).toHaveBeenNthCalledWith(1, local.id, {
      title: local.title,
      contentText: local.contentText,
      contentJson: local.contentJson,
      listOrderSeq: local.listOrderSeq,
      baseVersion: 2,
    });
    expect(apiPatchSpy).toHaveBeenNthCalledWith(2, local.id, {
      title: local.title,
      contentText: local.contentText,
      contentJson: local.contentJson,
      listOrderSeq: local.listOrderSeq,
      baseVersion: serverNote.version,
    });
    expect(lnUpdateFromServerSpy).toHaveBeenCalledWith(afterRetry);
  });

  it('resolves conflict on delete by retrying remove with server version (winner local)', async () => {
    const now = DEFAULT_NOTE_DATE;
    const local = createMockLocalNote({
      baseVersion: 2,
      deletedAt: addSecs(now, 2),
      syncStatus: 'pending',
      updatedAt: addSecs(now, 2),
    });
    const serverNote = createMockNoteDTO({ id: local.id, version: 7, updatedAt: now, deletedAt: null });

    lnGetUnsyncedNotesSpy.mockResolvedValue([local]);
    apiRemoveSpy
      .mockResolvedValueOnce(apiErr({ code: 'conflict', status: 409, data: serverNote })) // first call
      .mockResolvedValueOnce(apiOk({ data: serverNote })); // after retry
    lnUpdateFromServerSpy.mockResolvedValue();

    const res = await __ops.pushLocalChanges();
    expect(res).toEqual({ success: true, pushed: 1, pulled: 0, conflicts: 1 });
    expect(apiRemoveSpy).toHaveBeenNthCalledWith(1, local.id, 2);
    expect(apiRemoveSpy).toHaveBeenNthCalledWith(2, local.id, serverNote.version);
    expect(lnUpdateFromServerSpy).toHaveBeenCalledWith(serverNote);
  });

  it('on conflict where winner is remote, pulls remote changes instead', async () => {
    const now = DEFAULT_NOTE_DATE;
    const local = createMockLocalNote({ baseVersion: 2, deletedAt: null, syncStatus: 'pending', updatedAt: now });
    const serverNote = createMockNoteDTO({ id: local.id, version: 7, updatedAt: addSecs(now, 2) });

    lnGetUnsyncedNotesSpy.mockResolvedValue([local]);
    apiPatchSpy.mockResolvedValue(apiErr({ code: 'conflict', status: 409, data: serverNote }));
    lnUpdateFromServerSpy.mockResolvedValue();

    const res = await __ops.pushLocalChanges();
    expect(res).toEqual({ success: true, pushed: 0, pulled: 1, conflicts: 1 });
    expect(lnUpdateFromServerSpy).toHaveBeenCalledWith(serverNote);
  });

  it('on not_found during update, creates the note on server', async () => {
    const local = createMockLocalNote({ baseVersion: 3, deletedAt: null, syncStatus: 'pending' });
    const remote = createMockNoteDTO({ id: local.id, version: 1 });

    lnGetUnsyncedNotesSpy.mockResolvedValue([local]);
    apiPatchSpy.mockResolvedValue(apiErr({ code: 'not_found', status: 404 }));
    apiCreateSpy.mockResolvedValue(apiOk({ data: remote }));
    lnUpdateFromServerSpy.mockResolvedValue();

    const res = await __ops.pushLocalChanges();
    expect(res).toEqual({ success: true, pushed: 1, pulled: 0, conflicts: 0 });
    expect(apiPatchSpy).toHaveBeenCalled();
    expect(apiCreateSpy).toHaveBeenCalled();
    expect(lnUpdateFromServerSpy).toHaveBeenCalledWith(remote);
  });

  it('on not_found during delete, erases locally', async () => {
    const local = createMockLocalNote({ baseVersion: 3, deletedAt: DEFAULT_NOTE_DATE, syncStatus: 'pending' });

    lnGetUnsyncedNotesSpy.mockResolvedValue([local]);
    apiRemoveSpy.mockResolvedValue(apiErr({ code: 'not_found', status: 404 }));
    lnEraseSpy.mockResolvedValue();

    const res = await __ops.pushLocalChanges();
    expect(res).toEqual({ success: true, pushed: 1, pulled: 0, conflicts: 0 });
    expect(lnEraseSpy).toHaveBeenCalledWith(local.id);
  });

  it('on create receiving 404 leaves pending (no counters increment)', async () => {
    const local = createMockLocalNote({ baseVersion: 0, deletedAt: null, syncStatus: 'pending' });

    lnGetUnsyncedNotesSpy.mockResolvedValue([local]);
    apiCreateSpy.mockResolvedValue(apiErr({ code: 'not_found', status: 404 }));

    const res = await __ops.pushLocalChanges();
    expect(res).toEqual({ success: true, pushed: 0, pulled: 0, conflicts: 0 });
  });

  it('on server error leaves pending (no counters increment)', async () => {
    const local = createMockLocalNote({ baseVersion: 4, deletedAt: null, syncStatus: 'pending' });

    lnGetUnsyncedNotesSpy.mockResolvedValue([local]);
    apiPatchSpy.mockResolvedValue(apiErr({ code: 'server', status: 500 }));

    const res = await __ops.pushLocalChanges();
    expect(res).toEqual({ success: true, pushed: 0, pulled: 0, conflicts: 0 });
  });
});

describe('pullServerChanges', () => {
  const CURSOR_KEY = 'notes:lastPullCursor';

  let storageGetItemSpy: MockInstance<typeof Storage.prototype.getItem>;
  let storageSetItemSpy: MockInstance<typeof Storage.prototype.setItem>;
  let apiGetSinceSpy: MockInstance<typeof notesApi.getSince>;
  let apiGetAllSpy: MockInstance<typeof notesApi.getAll>;
  let lnGetSpy: MockInstance<typeof localNotesRepository.get>;
  let lnUpdateFromServerSpy: MockInstance<typeof localNotesRepository.updateFromServer>;

  beforeEach(() => {
    storageGetItemSpy = vi.spyOn(Storage.prototype, 'getItem');
    storageSetItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
    apiGetSinceSpy = vi.spyOn(notesApi, 'getSince'); // set in each test
    apiGetAllSpy = vi.spyOn(notesApi, 'getAll'); // set in each test
    lnGetSpy = vi.spyOn(localNotesRepository, 'get'); // set in each test
    lnUpdateFromServerSpy = vi.spyOn(localNotesRepository, 'updateFromServer'); // set in each test
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('lastPullCursor handling', () => {
    const DEFAULT_NOTE_DATE_STR = DEFAULT_NOTE_DATE.toISOString();
    const LAST_PULL_CURSOR_STR = addMins(DEFAULT_NOTE_DATE, -5).toISOString();

    it('uses getSince when a cursor is present and passes it through', async () => {
      storageGetItemSpy.mockReturnValue(LAST_PULL_CURSOR_STR);
      apiGetSinceSpy.mockResolvedValue(apiGetOk());
      apiGetAllSpy.mockResolvedValue(apiGetOk());

      const res = await __ops.pullServerChanges();

      expect(res.success).toBe(true);
      expect(storageGetItemSpy).toHaveBeenCalledWith(CURSOR_KEY);
      expect(apiGetSinceSpy).toHaveBeenCalledWith(LAST_PULL_CURSOR_STR);
      expect(apiGetAllSpy).not.toHaveBeenCalled();
    });

    it('uses getAll when no cursor is present', async () => {
      storageGetItemSpy.mockReturnValue(null);
      apiGetSinceSpy.mockResolvedValue(apiGetOk());
      apiGetAllSpy.mockResolvedValue(apiGetOk());

      await __ops.pullServerChanges();

      expect(apiGetAllSpy).toHaveBeenCalled();
      expect(apiGetSinceSpy).not.toHaveBeenCalled();
    });

    it('persists nextCursor when provided', async () => {
      storageGetItemSpy.mockReturnValue(LAST_PULL_CURSOR_STR);
      apiGetSinceSpy.mockResolvedValue(apiGetOk({ nextCursor: DEFAULT_NOTE_DATE_STR }));

      await __ops.pullServerChanges();

      expect(storageSetItemSpy).toHaveBeenCalledWith(CURSOR_KEY, DEFAULT_NOTE_DATE_STR);
    });

    it('does not write when nextCursor is undefined', async () => {
      storageGetItemSpy.mockReturnValue(DEFAULT_NOTE_DATE_STR);
      apiGetSinceSpy.mockResolvedValue(apiGetOk({ nextCursor: undefined }));

      await __ops.pullServerChanges();

      expect(storageSetItemSpy).not.toHaveBeenCalled();
    });

    it('on API error, returns failure and does not write', async () => {
      storageGetItemSpy.mockReturnValue(DEFAULT_NOTE_DATE_STR);
      apiGetSinceSpy.mockResolvedValue(apiGetErr());

      const res = await __ops.pullServerChanges();

      expect(res.success).toBe(false);
      expect(storageSetItemSpy).not.toHaveBeenCalled();
    });
  });

  it('should return success: false when getAll fails', async () => {
    apiGetAllSpy.mockResolvedValue(apiGetErr());

    const res = await __ops.pullServerChanges();
    expect(res).toEqual({ success: false, pulled: 0, conflicts: 0, pushed: 0 });
  });

  it('pulls remote note when local is missing', async () => {
    const remote = createMockNoteDTO({ id: 'r1', version: 1 });

    apiGetAllSpy.mockResolvedValue(apiGetOk({ data: [remote] }));
    lnGetSpy.mockResolvedValue(undefined);
    lnUpdateFromServerSpy.mockResolvedValue();

    const res = await __ops.pullServerChanges();
    expect(res).toEqual({ success: true, pulled: 1, conflicts: 0, pushed: 0 });
    expect(lnUpdateFromServerSpy).toHaveBeenCalledWith(remote);
  });

  it('skips pull when needsPull is false (baseVersion >= remote.version)', async () => {
    const remote = createMockNoteDTO({ id: 'r2', version: 2 });
    const local = createMockLocalNote({ id: 'r2', baseVersion: 2, syncStatus: 'synced' });

    apiGetAllSpy.mockResolvedValue(apiGetOk({ data: [remote] }));
    lnGetSpy.mockResolvedValue(local);
    lnUpdateFromServerSpy.mockResolvedValue();

    const res = await __ops.pullServerChanges();
    expect(res).toEqual({ success: true, pulled: 0, conflicts: 0, pushed: 0 });
    expect(lnUpdateFromServerSpy).not.toHaveBeenCalled();
  });

  it('pulls when local is synced and remote has newer version', async () => {
    const remote = createMockNoteDTO({ id: 'r3', version: 3 });
    const local = createMockLocalNote({ id: 'r3', baseVersion: 2, syncStatus: 'synced' });

    apiGetAllSpy.mockResolvedValue(apiGetOk({ data: [remote] }));
    lnGetSpy.mockResolvedValue(local);
    lnUpdateFromServerSpy.mockResolvedValue();

    const res = await __ops.pullServerChanges();
    expect(res).toEqual({ success: true, pulled: 1, conflicts: 0, pushed: 0 });
    expect(lnUpdateFromServerSpy).toHaveBeenCalledWith(remote);
  });

  it('when local is pending and remote wins, pulls and counts conflict', async () => {
    const now = DEFAULT_NOTE_DATE;
    const remote = createMockNoteDTO({ id: 'r4', version: 5, updatedAt: addSecs(now, 2) });
    const local = createMockLocalNote({ id: 'r4', baseVersion: 4, syncStatus: 'pending', updatedAt: now });

    apiGetAllSpy.mockResolvedValue(apiGetOk({ data: [remote] }));
    lnGetSpy.mockResolvedValue(local);
    lnUpdateFromServerSpy.mockResolvedValue();

    const res = await __ops.pullServerChanges();
    expect(res).toEqual({ success: true, pulled: 1, conflicts: 1, pushed: 0 });
    expect(lnUpdateFromServerSpy).toHaveBeenCalledWith(remote);
  });

  it('when local is pending and local wins, keeps local pending (no changes)', async () => {
    const now = DEFAULT_NOTE_DATE;
    const remote = createMockNoteDTO({ id: 'r5', version: 5, updatedAt: now });
    const local = createMockLocalNote({ id: 'r5', baseVersion: 4, syncStatus: 'pending', updatedAt: addSecs(now, 2) });

    apiGetAllSpy.mockResolvedValue(apiGetOk({ data: [remote] }));
    lnGetSpy.mockResolvedValue(local);
    lnUpdateFromServerSpy.mockResolvedValue();

    const res = await __ops.pullServerChanges();
    expect(res).toEqual({ success: true, pulled: 0, conflicts: 0, pushed: 0 });
    expect(lnUpdateFromServerSpy).not.toHaveBeenCalled();
  });
});

describe('syncWithRemote', () => {
  let pushSpy: MockInstance<typeof __ops.pushLocalChanges>;
  let pullSpy: MockInstance<typeof __ops.pullServerChanges>;

  beforeEach(() => {
    pushSpy = vi.spyOn(__ops, 'pushLocalChanges');
    pullSpy = vi.spyOn(__ops, 'pullServerChanges');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return success: true when both push and pull are successful', async () => {
    pushSpy.mockResolvedValue({ success: true, pushed: 1, pulled: 0, conflicts: 0 });
    pullSpy.mockResolvedValue({ success: true, pushed: 0, pulled: 1, conflicts: 0 });

    const res = await syncWithRemote();
    expect(res).toEqual({ success: true, pushed: 1, pulled: 1, conflicts: 0 });
    expect(pushSpy).toHaveBeenCalled();
    expect(pullSpy).toHaveBeenCalled();
  });

  it('should return success: false when push fails', async () => {
    pushSpy.mockResolvedValue({ success: false, pushed: 0, pulled: 0, conflicts: 0 });
    pullSpy.mockResolvedValue({ success: true, pushed: 0, pulled: 0, conflicts: 0 });

    const res = await syncWithRemote();
    expect(res).toEqual({ success: false, pushed: 0, pulled: 0, conflicts: 0 });
    expect(pushSpy).toHaveBeenCalled();
    expect(pullSpy).toHaveBeenCalled();
  });

  it('should return success: false when pull fails', async () => {
    pushSpy.mockResolvedValue({ success: true, pushed: 0, pulled: 0, conflicts: 0 });
    pullSpy.mockResolvedValue({ success: false, pushed: 0, pulled: 0, conflicts: 0 });

    const res = await syncWithRemote();
    expect(res).toEqual({ success: false, pushed: 0, pulled: 0, conflicts: 0 });
    expect(pushSpy).toHaveBeenCalled();
    expect(pullSpy).toHaveBeenCalled();
  });
});
