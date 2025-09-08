import { notesServerRepository } from '@/server/notes/notes.repo';

export async function GET() {
  const notes = await notesServerRepository.getAll();
  return Response.json(notes);
}

export async function POST(request: Request) {
  const data = await request.json();
  const note = await notesServerRepository.add(data);
  return Response.json(note);
}
