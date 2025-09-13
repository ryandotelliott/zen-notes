import { NoteDTO, NoteCreateDTO, NoteUpdateDTO, NotesSchema, NoteSchema } from '@/shared/schemas/notes';
import { z } from 'zod';

const API_BASE = '/api/notes';

type ApiOk<T> = { ok: true; data: T };
type ApiErr<T> = {
  ok: false;
  code: 'conflict' | 'not_found' | 'bad_request' | 'server';
  status?: number;
  data?: T;
};
export type ApiResult<T> = ApiOk<T> | ApiErr<T>;
export type ApiResultWithCursor<T> = ApiResult<T> & { nextCursor?: string };

async function parseJsonWithSchema<T>(res: Response, schema: z.ZodType<T>): Promise<ApiResult<T>> {
  if (!res.ok) {
    if (res.status === 404) return { ok: false, code: 'not_found', status: 404 };
    if (res.status === 409) {
      try {
        const data = schema.parse(await res.json());
        return { ok: false, code: 'conflict', status: 409, data };
      } catch {
        return { ok: false, code: 'conflict', status: 409 };
      }
    }
    return { ok: false, code: res.status >= 500 ? 'server' : 'bad_request', status: res.status };
  }

  const data = schema.parse(await res.json());
  return { ok: true, data };
}

function jsonNote(res: Response) {
  return parseJsonWithSchema<NoteDTO>(res, NoteSchema);
}

function jsonNotes(res: Response) {
  return parseJsonWithSchema<NoteDTO[]>(res, NotesSchema);
}

export async function getAll(): Promise<ApiResultWithCursor<NoteDTO[]>> {
  const response = await fetch(API_BASE);

  try {
    const res = await jsonNotes(response);
    const nextCursor = response.headers.get('X-Next-Cursor') ?? undefined;
    if (res.ok) {
      return { ...res, nextCursor };
    }
    return res;
  } catch {
    return { ok: false, code: 'server', status: 500 };
  }
}

export async function getSince(since: string): Promise<ApiResultWithCursor<NoteDTO[]>> {
  const response = await fetch(`${API_BASE}?since=${since}`);

  try {
    const res = await jsonNotes(response);
    const nextCursor = response.headers.get('X-Next-Cursor') ?? undefined;
    if (res.ok) {
      return { ...res, nextCursor };
    }
    return res;
  } catch {
    return { ok: false, code: 'server', status: 500 };
  }
}

export async function getById(id: string): Promise<ApiResult<NoteDTO>> {
  const response = await fetch(`${API_BASE}/${id}`);

  try {
    return await jsonNote(response);
  } catch {
    return { ok: false, code: 'server', status: 500 };
  }
}

export async function create(note: NoteCreateDTO): Promise<ApiResult<NoteDTO>> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    body: JSON.stringify(note),
  });

  try {
    return await jsonNote(response);
  } catch {
    return { ok: false, code: 'server', status: 500 };
  }
}

export async function update(id: string, note: NoteUpdateDTO & { baseVersion: number }): Promise<ApiResult<NoteDTO>> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(note),
  });

  try {
    return await jsonNote(response);
  } catch {
    return { ok: false, code: 'server', status: 500 };
  }
}

export async function remove(id: string, baseVersion?: number): Promise<ApiResult<NoteDTO>> {
  const urlParams = new URLSearchParams();
  if (baseVersion) urlParams.set('baseVersion', baseVersion.toString());

  const response = await fetch(`${API_BASE}/${id}?${urlParams.toString()}`, {
    method: 'DELETE',
  });

  try {
    return await jsonNote(response);
  } catch {
    return { ok: false, code: 'server', status: 500 };
  }
}

export const notesApi = { getAll, getSince, get: getById, create, update, remove };
