import { LocalNote, NoteDTO } from '@/shared/schemas/notes';

const lastWriteTs = (n: Pick<LocalNote, 'updatedAt' | 'deletedAt'>) => (n.deletedAt ? n.deletedAt : n.updatedAt);

export function getLWWResolution(local: LocalNote, remote: NoteDTO): 'local' | 'remote' {
  const lt = lastWriteTs(local);
  const rt = lastWriteTs(remote);
  return lt > rt ? 'local' : 'remote';
}

export function needsPull(local: LocalNote | undefined, remote: NoteDTO): boolean {
  if (!local) return true;
  const base = local.baseVersion ?? 0;
  return remote.version > base;
}

export function isTombstoned(n: Pick<LocalNote, 'deletedAt'>) {
  return !!n.deletedAt;
}
