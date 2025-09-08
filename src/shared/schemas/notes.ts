import { JSONContent } from '@tiptap/react';
import { z } from 'zod';

export interface BaseNote {
  id: string;
  title: string;
  content_json: JSONContent;
  content_text: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  version: number;
}

export interface LocalNote extends BaseNote {
  content_json: JSONContent;
  syncStatus: 'pending' | 'synced' | 'conflict';
  lastSyncedAt?: Date;
  baseVersion: number; // last server-acknowledged version
}

export type NoteDTO = BaseNote;
export type NoteCreateDTO = Pick<BaseNote, 'id' | 'title' | 'content_text' | 'content_json'>;
export type NoteUpdateDTO = Pick<BaseNote, 'title' | 'content_text' | 'content_json'> & {
  baseVersion: number; // client's last known server version
};

export const NotesSchema = z.object({
  id: z.string(),
  title: z.string(),
  content_text: z.string(),
  content_json: z.custom<JSONContent>(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
  version: z.number(),
});

export const JsonContentSchema = z.custom<JSONContent>();
