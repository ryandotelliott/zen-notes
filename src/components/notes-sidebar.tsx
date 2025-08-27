'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { MoreHorizontal, Plus, Edit, Trash2 } from 'lucide-react';
import { useNotesStore } from '@/stores/notes-store';
import { useNoteSearch } from '@/hooks/use-note-search';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Input } from './ui/input';
import { cn } from '@/lib/utils';

export default function NotesSidebar() {
  const selectedNoteId = useNotesStore((s) => s.selectedNoteId);
  const addNote = useNotesStore((s) => s.addNote);
  const deleteNote = useNotesStore((s) => s.deleteNote);
  const selectNote = useNotesStore((s) => s.selectNote);
  const updateNote = useNotesStore((s) => s.updateNote);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const filteredNotes = useNoteSearch(searchQuery);

  const [renamingNoteId, setRenamingNoteId] = useState<string | null>(null);
  const [renamingNoteTitle, setRenamingNoteTitle] = useState<string>('');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const renameNoteRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    const id = crypto.randomUUID();
    addNote({ id, title: 'Untitled', content: '', updatedAt: new Date(), createdAt: new Date() });
  };

  useEffect(() => {
    if (renameNoteRef.current && renamingNoteId) {
      renameNoteRef.current.focus();
      renameNoteRef.current.select();
    }
  }, [renamingNoteId]);

  const handleRename = (noteId: string, title: string) => {
    updateNote(noteId, { title });
    setRenamingNoteId(null);
  };

  const handleDelete = (noteId: string) => {
    deleteNote(noteId);
  };

  return (
    <Sidebar side="left" variant="floating" collapsible="offcanvas" className="">
      <SidebarHeader>
        <SidebarInput
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Notes</SidebarGroupLabel>
          <SidebarGroupAction onClick={handleAdd}>
            <Plus />
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNotes.map((note) => (
                <SidebarMenuItem key={note.id}>
                  {renamingNoteId === note.id ? (
                    <Input
                      size="small"
                      value={renamingNoteTitle}
                      onChange={(e) => setRenamingNoteTitle(e.target.value)}
                      onBlur={() => handleRename(note.id, renamingNoteTitle)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleRename(note.id, renamingNoteTitle);
                        } else if (e.key === 'Escape') {
                          setRenamingNoteId(null);
                        }
                      }}
                      ref={renameNoteRef}
                    />
                  ) : (
                    <>
                      <SidebarMenuButton
                        isActive={selectedNoteId === note.id}
                        onClick={() => selectNote(note.id)}
                        title={note.title || 'Untitled'}
                      >
                        <span className="truncate">{note.title || 'Untitled'}</span>
                      </SidebarMenuButton>
                      <SidebarMenuAction
                        className={cn(
                          'hover:bg-transparent',
                          openDropdownId === note.id ? 'opacity-100' : 'opacity-0 group-hover/menu-item:opacity-100',
                        )}
                      >
                        <DropdownMenu
                          open={openDropdownId === note.id}
                          onOpenChange={(open) => setOpenDropdownId(open ? note.id : null)}
                        >
                          <DropdownMenuTrigger asChild>
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-40">
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => {
                                setRenamingNoteId(note.id);
                                setRenamingNoteTitle(note.title);
                                setOpenDropdownId(null);
                              }}
                            >
                              <Edit />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                handleDelete(note.id);
                                setOpenDropdownId(null);
                              }}
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
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
