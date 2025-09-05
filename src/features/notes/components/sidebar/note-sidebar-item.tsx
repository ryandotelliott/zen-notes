'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu';
import { SidebarMenuAction, SidebarMenuButton, SidebarMenuItem } from '@/shared/components/ui/sidebar';
import { Input } from '@/shared/components/ui/input';
import { Note } from '../../data/local/notes.db';
import { DropdownMenu } from '@/shared/components/ui/dropdown-menu';
import { Edit, MoreHorizontal, Trash2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useNotesStore } from '../../state/notes.store';

type NoteFields = Pick<Note, 'id' | 'title'>;

interface Props extends NoteFields {
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
  isActive: boolean;
  className?: string;
}

export default function NoteSidebarItem({ id, title, isEditing, setIsEditing, isActive, className }: Props) {
  const [editingTitle, setEditingTitle] = useState<string>(title);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const titleInputRef = useRef<HTMLInputElement>(null);

  const selectNote = useNotesStore((s) => s.selectNote);
  const renameNote = useNotesStore((s) => s.updateNoteTitle);
  const deleteNote = useNotesStore((s) => s.deleteNote);

  const handleSelect = useCallback(() => {
    selectNote(id);
  }, [id, selectNote]);

  const handleRename = useCallback(
    (title: string) => {
      setIsEditing(false);
      renameNote(id, title);
    },
    [id, renameNote, setIsEditing],
  );

  const handleDelete = useCallback(() => {
    deleteNote(id);
  }, [id, deleteNote]);

  useEffect(() => {
    if (isEditing && titleInputRef.current) {
      titleInputRef.current?.focus();
    }
  }, [isEditing]);

  return (
    <SidebarMenuItem key={id} className={className}>
      {isEditing ? (
        <Input
          size="small"
          value={editingTitle}
          onChange={(e) => setEditingTitle(e.target.value)}
          onBlur={() => handleRename(editingTitle)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleRename(editingTitle);
            } else if (e.key === 'Escape') {
              setIsEditing(false);
            }
          }}
          ref={titleInputRef}
        />
      ) : (
        <>
          <SidebarMenuButton isActive={isActive} onClick={handleSelect} title={title || 'Untitled'}>
            <span className="truncate">{title || 'Untitled'}</span>
          </SidebarMenuButton>
          <SidebarMenuAction
            className={cn(
              'hover:bg-transparent',
              isDropdownOpen ? 'opacity-100' : 'opacity-0 group-hover/menu-item:opacity-100',
            )}
          >
            <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-40">
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => {
                    setIsEditing(true);
                  }}
                >
                  <Edit />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <Trash2 className="text-inherit" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuAction>
        </>
      )}
    </SidebarMenuItem>
  );
}
