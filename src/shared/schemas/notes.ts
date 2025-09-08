import { JSONContent } from '@tiptap/react';

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
  syncStatus: 'pending' | 'synced' | 'conflict';
  lastSyncedAt?: Date;
  baseVersion: number; // last server-acknowledged version
}

export type NoteDTO = BaseNote;
export type NoteCreateDTO = Pick<BaseNote, 'id' | 'title' | 'content_text' | 'content_json'>;
export type NoteUpdateDTO = Pick<BaseNote, 'title' | 'content_text' | 'content_json'> & {
  baseVersion: number; // client's last known server version
};

export type SyncConflict = {
  id: string;
  local: NoteDTO;
  remote: NoteDTO;
  conflictType: 'update' | 'delete';
};
