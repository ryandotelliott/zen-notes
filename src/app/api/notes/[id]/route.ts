import { notesServerRepository } from '@/server/notes/notes.repo';

export async function GET(params: { params: { id: string } }) {
  const note = await notesServerRepository.get(params.params.id);

  return Response.json(note);
}

export async function PATCH(request: Request, params: { params: { id: string } }) {
  const data = await request.json();
  const note = await notesServerRepository.update(params.params.id, data);

  return Response.json(note);
}

export async function DELETE(params: { params: { id: string } }) {
  const note = await notesServerRepository.remove(params.params.id);

  return Response.json(note);
}
