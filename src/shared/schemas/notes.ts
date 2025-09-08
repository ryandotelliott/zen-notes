import { JSONContent } from '@tiptap/react';

export interface Note {
  id: string;
  title: string;
  content_json: JSONContent;
  content_text: string;
  createdAt: Date;
  updatedAt: Date;
}

export type NoteDTO = {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  deletedAt?: Date | null;
};

export type NoteUpdateDTO = {
  title?: string;
  content?: string;
  baseVersion: number; // client's last known version
};
