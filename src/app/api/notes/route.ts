import { notesServerRepository } from '@/server/notes/notes.repo';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sinceParam = searchParams.get('since');

  const cutoff = new Date();

  if (sinceParam) {
    const since = new Date(sinceParam);
    if (isNaN(since.getTime())) {
      return Response.json({ error: 'Invalid since parameter' }, { status: 400 });
    }

    const notes = await notesServerRepository.getUpdatedSince(since, cutoff);
    const res = Response.json(notes);
    res.headers.set('X-Next-Cursor', cutoff.toISOString());
    return res;
  }

  const notes = await notesServerRepository.getAll();
  const res = Response.json(notes);
  res.headers.set('X-Next-Cursor', cutoff.toISOString());
  return res;
}

export async function POST(request: Request) {
  const data = await request.json();
  const note = await notesServerRepository.add(data);
  return Response.json(note);
}
