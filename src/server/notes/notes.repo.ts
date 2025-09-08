import { prisma } from '@/server/prisma';
import { NoteDTO, NoteCreateDTO, NoteUpdateDTO } from '@/shared/schemas/notes';
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
    orderBy: {
      createdAt: 'desc',
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
      ...note,
      version: 1,
      deletedAt: null,
      content_json: JSON.stringify(note.content_json),
    },
  });

  return {
    ...createdNote,
    content_json: parseJsonContent(createdNote.content_json),
  };
}

async function update(id: string, updateData: NoteUpdateDTO): Promise<NoteDTO> {
  // Check version for optimistic concurrency
  const currentNote = await prisma.note.findUnique({ where: { id } });
  if (!currentNote) {
    throw new Error(`Note ${id} not found`);
  }

  if (currentNote.version !== updateData.baseVersion) {
    // Version conflict - return current server state for conflict resolution
    throw new Error('VERSION_CONFLICT');
  }

  const updatedNote = await prisma.note.update({
    where: { id },
    data: {
      ...updateData,
      version: { increment: 1 },
      content_json: JSON.stringify(updateData.content_json),
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

export const notesServerRepository = { getAll, get, add, update, remove };
