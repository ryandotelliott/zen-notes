import { prisma } from '@/server/prisma';
import { NoteDTO, NoteCreateDTO, NotePatchDTO } from '@/shared/schemas/notes';
import { z } from 'zod';
import type { JSONContent } from '@tiptap/react';

const JsonContentZodSchema = z.custom<JSONContent>();

/**
 * Parse the JSON content from the database into a TipTap JSONContent object.
 */
function parseJsonContent(jsonContent: string): JSONContent {
  return JsonContentZodSchema.parse(JSON.parse(jsonContent));
}

async function getAll(): Promise<NoteDTO[]> {
  const notes = await prisma.note.findMany({
    orderBy: [{ listOrderSeq: 'desc' }, { createdAt: 'desc' }],
  });

  return notes.map((note) => ({
    ...note,
    content_json: parseJsonContent(note.content_json),
  }));
}

async function getUpdatedSince(since: Date, cutoff: Date): Promise<NoteDTO[]> {
  const notes = await prisma.note.findMany({
    where: {
      updatedAt: {
        gt: since,
        lte: cutoff,
      },
    },
    orderBy: {
      updatedAt: 'asc',
    },
  });

  return notes.map((note) => ({
    ...note,
    content_json: parseJsonContent(note.content_json),
  }));
}

async function get(id: string): Promise<NoteDTO | null> {
  const note = await prisma.note.findUnique({ where: { id } });
  if (!note) {
    return null;
  }
  return {
    ...note,
    content_json: parseJsonContent(note.content_json),
  };
}

async function add(note: NoteCreateDTO): Promise<NoteDTO> {
  const createdNote = await prisma.note.create({
    data: {
      id: note.id,
      title: note.title,
      content_text: note.content_text,
      content_json: JSON.stringify(note.content_json),
      listOrderSeq: note.listOrderSeq,
      version: 1,
      deletedAt: null,
    },
  });

  return {
    ...createdNote,
    content_json: parseJsonContent(createdNote.content_json),
  };
}

async function update(id: string, updateData: NotePatchDTO): Promise<NoteDTO> {
  // Check version for optimistic concurrency
  const currentNote = await prisma.note.findUnique({ where: { id } });
  if (!currentNote) {
    throw new Error(`Note ${id} not found`);
  }

  if (currentNote.version !== updateData.baseVersion) {
    // Version conflict - return current server state for conflict resolution
    throw new Error('VERSION_CONFLICT');
  }

  if (currentNote.deletedAt) {
    // Block updates to deleted notes
    throw new Error('VERSION_CONFLICT');
  }

  // Enforce monotonic listOrderSeq: only allow increasing values to be applied
  const { listOrderSeq: incomingSeq, ...rest } = updateData;

  const fieldUpdates: Record<string, unknown> = {};
  if (rest.title !== undefined) fieldUpdates.title = rest.title;
  if (rest.content_text !== undefined) fieldUpdates.content_text = rest.content_text;
  if (rest.content_json !== undefined) fieldUpdates.content_json = JSON.stringify(rest.content_json);
  if (rest.pinned !== undefined) fieldUpdates.pinned = rest.pinned;

  const applyListOrderSeq =
    typeof incomingSeq === 'number' && incomingSeq > (currentNote.listOrderSeq ?? 0)
      ? { listOrderSeq: incomingSeq }
      : {};

  const updatedNote = await prisma.note.update({
    where: { id },
    data: {
      ...fieldUpdates,
      ...applyListOrderSeq,
      version: { increment: 1 },
    },
  });

  return {
    ...updatedNote,
    content_json: parseJsonContent(updatedNote.content_json),
  };
}

async function remove(id: string, baseVersion?: number): Promise<NoteDTO> {
  const currentNote = await prisma.note.findUnique({ where: { id } });
  if (!currentNote) {
    throw new Error(`Note ${id} not found`);
  }

  if (baseVersion !== undefined && currentNote.version !== baseVersion) {
    throw new Error('VERSION_CONFLICT');
  }

  const removedNote = await prisma.note.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      version: { increment: 1 },
    },
  });

  return {
    ...removedNote,
    content_json: parseJsonContent(removedNote.content_json),
  };
}

export const serverNotesRepository = { getAll, getUpdatedSince, get, add, update, remove };
