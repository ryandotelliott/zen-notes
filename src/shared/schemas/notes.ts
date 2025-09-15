import { JSONContent } from '@tiptap/react';
import { z } from 'zod';

export interface BaseNote {
  id: string;
  title: string;
  content_json: JSONContent;
  content_text: string;
  listOrderSeq: number;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  version: number;
}

export interface LocalNote extends BaseNote {
  syncStatus: 'pending' | 'synced';
  baseVersion: number; // last server-acknowledged version
}

export type NoteDTO = BaseNote;
export type NoteCreateDTO = Pick<BaseNote, 'id' | 'title' | 'content_text' | 'content_json' | 'listOrderSeq'>;
export type NotePatchDTO = Partial<
  Pick<BaseNote, 'title' | 'content_text' | 'content_json' | 'listOrderSeq' | 'pinned'>
> & {
  baseVersion: number; // client's last known server version
};

export const NoteSchema = z.object({
  id: z.string(),
  title: z.string(),
  content_text: z.string(),
  content_json: z.custom<JSONContent>(),
  listOrderSeq: z.number(),
  pinned: z.boolean(),
  // Coerce any ISO strings into date objects
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable(),
  version: z.number(),
});
export const NotesSchema = z.array(NoteSchema);

export const JsonContentSchema = z.custom<JSONContent>();
