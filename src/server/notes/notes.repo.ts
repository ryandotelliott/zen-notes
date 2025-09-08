import { prisma } from '@/server/prisma';
import { Note } from '@/shared/schemas/notes';

export type ServerNoteDTO = Omit<Note, 'updatedAt'>;

async function getAll() {
  return await prisma.note.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });
}

async function get(id: string) {
  return await prisma.note.findUnique({ where: { id } });
}

async function add(note: ServerNoteDTO) {
  return await prisma.note.create({ data: note });
}

async function update(id: string, note: ServerNoteDTO) {
  return await prisma.note.update({ where: { id }, data: note });
}

async function remove(id: string) {
  return await prisma.note.delete({ where: { id } });
}

export { getAll, get, add, update, remove };
