import { notesApi, ApiResult } from '@/features/notes/api';
import { localNotesRepository } from '@/features/notes/data/notes.repo';
import { getLWWResolution, isTombstoned, needsPull } from '@/features/notes/data/sync/policy';
import { NoteDTO } from '@/shared/schemas/notes';
import plimit from 'p-limit';

export async function syncWithRemote(): Promise<{
  pushed: number;
  pulled: number;
  conflicts: number;
  success: boolean;
}> {
  let pushed = 0;
  let pulled = 0;
  let conflicts = 0;

  const unsyncedNotes = await localNotesRepository.getUnsyncedNotes();

  const limit = plimit(4);

  await Promise.all(
    unsyncedNotes.map((note) =>
      limit(async () => {
        const baseVersion = note.baseVersion;
        const isDeleted = isTombstoned(note);

        // Decide create vs update based on last server-acknowledged version
        const doCreate = baseVersion === 0 && !isDeleted;
        const doUpdate = baseVersion > 0 && !isDeleted;

        let res: ApiResult<NoteDTO>;

        if (doCreate) {
          res = await notesApi.create({
            id: note.id,
            title: note.title,
            content_text: note.content_text,
            content_json: note.content_json,
          });
        } else if (doUpdate) {
          // Send update DTO shape with baseVersion for optimistic concurrency
          res = await notesApi.update(note.id, {
            title: note.title,
            content_text: note.content_text,
            content_json: note.content_json,
            baseVersion,
          });
        } else {
          // If the note was never on server and is now deleted locally, just erase it locally
          if (baseVersion === 0) {
            await localNotesRepository.erase(note.id);
            pushed++;
            return;
          }
          res = await notesApi.remove(note.id, baseVersion);
        }

        if (res.ok) {
          await localNotesRepository.updateFromServer(res.data);
          pushed++;
          return;
        }

        if (res.code === 'conflict') {
          const serverNote = res.data;
          conflicts++;

          if (serverNote) {
            const winner = getLWWResolution(note, serverNote);

            if (winner === 'local') {
              if (doUpdate) {
                const retry = await notesApi.update(note.id, {
                  title: note.title,
                  content_text: note.content_text,
                  content_json: note.content_json,
                  // Use server version as new baseVersion to force overwrite
                  baseVersion: serverNote.version,
                });
                if (retry.ok) {
                  // Update the local note to match the remote to ensure they're now in sync
                  await localNotesRepository.updateFromServer(retry.data);
                  pushed++;
                  return;
                }
              } else {
                // The only other way we'd have a conflict is if the note was deleted locally, but not on the server
                // Remove the note from the server - use the remote version to overcome the conflict error
                const delRetry = await notesApi.remove(note.id, serverNote.version);
                if (delRetry.ok) {
                  await localNotesRepository.updateFromServer(delRetry.data);
                }
                pushed++;
                return;
              }
            }

            // Otherwise, it's a remove conflict, so pull remote changes to local
            await localNotesRepository.updateFromServer(serverNote);
            pulled++;
            return;
          }
        }

        // Handle not_found outcomes:
        if (res.code === 'not_found') {
          if (doCreate) {
            // Creating but got 404 (shouldn't happen on POST); leave pending to retry
          } else if (doUpdate) {
            // Remote missing; create it from local state
            const createRes = await notesApi.create({
              id: note.id,
              title: note.title,
              content_text: note.content_text,
              content_json: note.content_json,
            });
            if (createRes.ok) {
              await localNotesRepository.updateFromServer(createRes.data);
              pushed++;
              return;
            }
          } else {
            // Deleting, but server already doesn't have it; erase locally
            await localNotesRepository.erase(note.id);
            pushed++;
            return;
          }
        }

        // If we get here, the request failed for some reason other than a conflict
        // Just leave the note as pending, and it will be retried later
      }),
    ),
  );

  const pullRes = await notesApi.getAll();
  if (!pullRes.ok) {
    return { pushed, pulled, conflicts, success: false };
  }

  for (const remote of pullRes.data) {
    const local = await localNotesRepository.get(remote.id);
    if (!local) {
      await localNotesRepository.updateFromServer(remote);
      pulled++;
      continue;
    }

    if (!needsPull(local, remote)) {
      continue;
    }

    if (local.syncStatus === 'synced') {
      await localNotesRepository.updateFromServer(remote);
      pulled++;
    } else {
      const winner = getLWWResolution(local, remote);
      if (winner === 'remote') {
        await localNotesRepository.updateFromServer(remote);
        pulled++;
        conflicts++;
      }
      // else keep local as pending; it will push next sync
    }
  }

  return { success: true, pushed, pulled, conflicts };
}
