'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu';
import { SidebarMenuAction, SidebarMenuButton, SidebarMenuItem } from '@/shared/components/ui/sidebar';
import { Input } from '@/shared/components/ui/input';
import { BaseNote } from '@/shared/schemas/notes';
import { DropdownMenu } from '@/shared/components/ui/dropdown-menu';
import { Edit, MoreHorizontal, Pin, TextCursor, Trash2 } from 'lucide-react';
import { cn } from '@/shared/lib/ui-utils';
import { useNotesStore } from '@/features/notes/state/notes.store';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/shared/components/ui/context-menu';

type NoteFields = Pick<BaseNote, 'id' | 'title' | 'pinned'>;

interface Props extends NoteFields {
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
  isActive: boolean;
  className?: string;
}

export default function NoteSidebarItem({ id, title, pinned, isEditing, setIsEditing, isActive, className }: Props) {
  const [editingTitle, setEditingTitle] = useState<string>(title);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const selectNote = useNotesStore((s) => s.selectNote);
  const renameNote = useNotesStore((s) => s.updateNoteTitle);
  const deleteNote = useNotesStore((s) => s.deleteNote);
  const pinNote = useNotesStore((s) => s.updateNotePinned);

  // keep local edit state in sync if the title changes externally
  useEffect(() => {
    setEditingTitle(title);
  }, [title]);

  // focus when entering edit mode
  useEffect(() => {
    if (isEditing) titleInputRef.current?.focus();
  }, [isEditing]);

  const handleSelect = () => selectNote(id);

  const handleRename = (raw: string) => {
    const next = raw.trim();
    setIsEditing(false);
    if (!next || next === title) return; // ignore empty or unchanged
    renameNote(id, next);
  };

  const handleDelete = () => deleteNote(id);
  const handlePin = () => pinNote(id, !pinned);

  // Actions to be shared between the dropdown and context menu
  const actions = [
    {
      key: 'pin',
      onClick: handlePin,
      label: pinned ? 'Unpin' : 'Pin',
      Icon: Pin,
      destructive: false,
    },
    {
      key: 'rename',
      onClick: () => setIsEditing(true),
      label: 'Rename',
      Icon: TextCursor,
      destructive: false,
    },
    {
      key: 'delete',
      onClick: handleDelete,
      label: 'Delete',
      Icon: Trash2,
      destructive: true,
    },
  ] as const;

  return (
    <SidebarMenuItem className={className}>
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
          <ContextMenu>
            <ContextMenuTrigger>
              <SidebarMenuButton
                isActive={isActive}
                onClick={handleSelect}
                title={title || 'Untitled'}
                className="h-fit"
              >
                <div className="flex flex-col overflow-hidden">
                  <p className="truncate font-bold">{title || 'Untitled'}</p>
                  {true && (
                    <p className="shrink truncate text-sm text-muted-foreground">
                      Sample text to be replaced when we add the other text
                    </p>
                  )}
                </div>
              </SidebarMenuButton>
            </ContextMenuTrigger>

            <ContextMenuContent>
              {actions.map(({ key, onClick, label, Icon, destructive }) => (
                <ContextMenuItem
                  key={key}
                  onClick={onClick}
                  className={cn('cursor-pointer', destructive && 'text-destructive focus:text-destructive')}
                >
                  <Icon aria-hidden className="text-inherit" />
                  {label}
                </ContextMenuItem>
              ))}
            </ContextMenuContent>
          </ContextMenu>

          <SidebarMenuAction
            className={cn(
              'hover:bg-transparent',
              isDropdownOpen ? 'opacity-100' : 'opacity-0 group-hover/menu-item:opacity-100',
            )}
          >
            <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <MoreHorizontal className="h-4 w-4" aria-hidden />
              </DropdownMenuTrigger>

              <DropdownMenuContent align="start" className="w-40">
                {actions.map(({ key, onClick, label, Icon, destructive }) => (
                  <DropdownMenuItem
                    key={key}
                    onClick={onClick}
                    className={cn('cursor-pointer', destructive && 'text-destructive focus:text-destructive')}
                  >
                    <Icon aria-hidden className="text-inherit" />
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuAction>
        </>
      )}
    </SidebarMenuItem>
  );
}
