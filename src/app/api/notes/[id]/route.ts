import { notesServerRepository } from '@/server/notes/notes.repo';

export async function GET(params: { params: { id: string } }) {
  const note = await notesServerRepository.get(params.params.id);

  if (!note) {
    return Response.json({ error: 'Note not found' }, { status: 404 });
  }

  return Response.json(note);
}

export async function PUT(request: Request, params: { params: { id: string } }) {
  try {
    const data = await request.json();
    const note = await notesServerRepository.update(params.params.id, data);

    return Response.json(note);
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'VERSION_CONFLICT') {
        // Return current server state for conflict resolution
        const currentNote = await notesServerRepository.get(params.params.id);
        return Response.json(currentNote, { status: 409 });
      }

      if (error.message.includes('not found')) {
        return Response.json({ error: 'Note not found' }, { status: 404 });
      }
    }

    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, params: { params: { id: string } }) {
  try {
    const url = new URL(request.url);
    const baseVersion = url.searchParams.get('baseVersion');
    const baseVersionNum = baseVersion ? parseInt(baseVersion, 10) : undefined;

    const note = await notesServerRepository.remove(params.params.id, baseVersionNum);

    return Response.json(note);
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'VERSION_CONFLICT') {
        const currentNote = await notesServerRepository.get(params.params.id);
        return Response.json(currentNote, { status: 409 });
      }

      if (error.message.includes('not found')) {
        return Response.json({ error: 'Note not found' }, { status: 404 });
      }
    }

    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
