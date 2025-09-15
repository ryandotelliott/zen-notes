import { JSONContent } from '@tiptap/react';
import { z } from 'zod';

export interface BaseNote {
  id: string;
  title: string;
  contentJson: JSONContent;
  contentText: string;
  listOrderSeq: number;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  version: number;
}

export interface LocalNote extends BaseNote {
  previewText: string;
  syncStatus: 'pending' | 'synced';
  baseVersion: number; // last server-acknowledged version
}

export type NoteDTO = BaseNote;
export type NoteCreateDTO = Pick<BaseNote, 'id' | 'title' | 'contentText' | 'contentJson' | 'listOrderSeq'>;
export type NotePatchDTO = Partial<
  Pick<BaseNote, 'title' | 'contentText' | 'contentJson' | 'listOrderSeq' | 'pinned'>
> & {
  baseVersion: number; // client's last known server version
};

export const NoteSchema = z.object({
  id: z.string(),
  title: z.string(),
  contentText: z.string(),
  contentJson: z.custom<JSONContent>(),
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
