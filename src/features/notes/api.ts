import { NoteDTO, NotesSchema } from '@/shared/schemas/notes';

const API_BASE = '/api/notes';

type ApiOk<T> = { ok: true; data: T };
type ApiErr<T> = {
  ok: false;
  code: 'conflict' | 'not_found' | 'bad_request' | 'server' | 'network';
  status?: number;
  data?: T;
};
export type ApiResult<T> = ApiOk<T> | ApiErr<T>;

async function json<T>(res: Response): Promise<ApiResult<T>> {
  if (!res.ok) {
    if (res.status === 404) return { ok: false, code: 'not_found', status: 404 };
    if (res.status === 409) return { ok: false, code: 'conflict', status: 409, data: await res.json() };
    return { ok: false, code: res.status >= 500 ? 'server' : 'bad_request', status: res.status };
  }

  const data = NotesSchema.parse(await res.json()) as T;
  return { ok: true, data };
}

export async function getAll(): Promise<ApiResult<NoteDTO[]>> {
  const response = await fetch(API_BASE);

  try {
    return await json(response);
  } catch {
    return { ok: false, code: 'server', status: 500 };
  }
}

export async function get(id: string): Promise<ApiResult<NoteDTO>> {
  const response = await fetch(`${API_BASE}/${id}`);

  try {
    return await json(response);
  } catch {
    return { ok: false, code: 'server', status: 500 };
  }
}

export async function create(note: NoteDTO): Promise<ApiResult<NoteDTO>> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    body: JSON.stringify(note),
  });

  try {
    return await json(response);
  } catch {
    return { ok: false, code: 'server', status: 500 };
  }
}

export async function update(id: string, note: NoteDTO): Promise<ApiResult<NoteDTO>> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(note),
  });

  try {
    return await json(response);
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
    return await json(response);
  } catch {
    return { ok: false, code: 'server', status: 500 };
  }
}

export const notesApi = { getAll, get, create, update, remove };
