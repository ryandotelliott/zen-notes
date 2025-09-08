'use client';

import { notesRepository } from './notes.repo';
import { db } from './notes.db';
import { type NoteDTO, type NoteCreateDTO, type NoteUpdateDTO, LocalNote } from '@/shared/schemas/notes';

const API_BASE = '/api/notes';

// Fetch all notes from server to sync down changes
async function fetchRemoteNotes(): Promise<NoteDTO[]> {
  const response = await fetch(API_BASE);
  if (!response.ok) throw new Error('Failed to fetch remote notes');
  return response.json();
}

// Push a single note to server
async function pushNoteToServer(note: LocalNote): Promise<NoteDTO | null> {
  try {
    if (note.deletedAt) {
      // Handle deletion
      const deleteUrl = `${API_BASE}/${note.id}?baseVersion=${note.baseVersion}`;
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        await notesRepository.updateFromServer(await response.json());
        return null; // Note was deleted
      } else if (response.status === 404) {
        // Note doesn't exist on server, remove locally
        await db.notes.delete(note.id);
        return null;
      } else if (response.status === 409) {
        // Version conflict - mark as conflicted
        await notesRepository.markConflict(note.id);
        return null;
      } else {
        throw new Error(`Delete failed: ${response.status}`);
      }
    } else if (note.version === 0) {
      // Create new note
      const createData: NoteCreateDTO = {
        id: note.id,
        title: note.title,
        content_text: note.content_text,
        content_json: note.content_json,
      };

      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createData),
      });

      if (response.ok) {
        const serverNote = await response.json();
        await notesRepository.updateFromServer(serverNote);
        return serverNote;
      } else {
        throw new Error(`Create failed: ${response.status}`);
      }
    } else {
      // Update existing note
      const updateData: NoteUpdateDTO = {
        title: note.title,
        content_text: note.content_text,
        content_json: note.content_json,
        baseVersion: note.baseVersion,
      };

      const response = await fetch(`${API_BASE}/${note.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        const serverNote = await response.json();
        await notesRepository.updateFromServer(serverNote);
        return serverNote;
      } else if (response.status === 409) {
        // Version conflict - mark as conflicted
        await notesRepository.markConflict(note.id);
        return null;
      } else {
        throw new Error(`Update failed: ${response.status}`);
      }
    }
  } catch (error) {
    console.error('Failed to push note:', note.id, error);
    // Mark as pending for retry
    await db.notes.update(note.id, { syncStatus: 'pending' });
    return null;
  }
}

// Main sync function
export async function syncWithRemote(): Promise<{
  success: boolean;
  pushed: number;
  pulled: number;
  conflicts: number;
}> {
  let pushed = 0;
  let pulled = 0;
  let conflicts = 0;

  try {
    // Push local changes first
    const unsyncedNotes = await notesRepository.getUnsyncedNotes();

    for (const note of unsyncedNotes) {
      const result = await pushNoteToServer(note);
      if (result) pushed++;
    }

    // Pull remote changes
    const remoteNotes = await fetchRemoteNotes();

    for (const remoteNote of remoteNotes) {
      const localNote = await notesRepository.get(remoteNote.id);

      if (!localNote) {
        // New note from server
        await notesRepository.updateFromServer(remoteNote);
        pulled++;
      } else if (localNote.version < remoteNote.version) {
        // Server has newer version
        if (localNote.syncStatus === 'synced') {
          // Safe to update
          await notesRepository.updateFromServer(remoteNote);
          pulled++;
        } else {
          // Local changes exist - conflict
          await notesRepository.markConflict(remoteNote.id);
          conflicts++;
        }
      }
    }

    return { success: true, pushed, pulled, conflicts };
  } catch (error) {
    console.error('Sync failed:', error);
    return { success: false, pushed, pulled, conflicts };
  }
}

/**
 * Resolve conflicts by using last-write-wins strategy.
 */
export async function resolveConflicts(): Promise<number> {
  const conflictedNotes = await notesRepository.getConflictedNotes();
  let resolved = 0;

  for (const note of conflictedNotes) {
    try {
      // Fetch fresh server version
      const response = await fetch(`${API_BASE}/${note.id}`);
      if (response.ok) {
        const serverNote = await response.json();
        await notesRepository.updateFromServer(serverNote);
        resolved++;
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Failed to resolve conflict for:', note.id, error.message);
      } else {
        console.error('Failed to resolve conflict for:', note.id, error);
      }
    }
  }

  return resolved;
}
