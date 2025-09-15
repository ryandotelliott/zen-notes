import { LocalNote, NoteDTO } from '@/shared/schemas/notes';

/** Determines which note has the most recent write timestamp */
export function getLWWResolution(local: LocalNote, remote: NoteDTO): 'local' | 'remote' {
  return local.updatedAt > remote.updatedAt ? 'local' : 'remote';
}

/** Checks whether remote has more recent changes than local */
export function needsPull(local: LocalNote | undefined, remote: NoteDTO): boolean {
  if (!local) return true;
  return remote.version > local.baseVersion;
}

/** Checks whether the note is tombstoned (soft-deleted) */
export function isTombstoned(n: Pick<LocalNote, 'deletedAt'>) {
  return !!n.deletedAt;
}
