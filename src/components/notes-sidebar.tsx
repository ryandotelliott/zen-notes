'use client';

import React from 'react';
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
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useNotesStore } from '@/stores/notes-store';

export default function NotesSidebar() {
  const notes = useNotesStore((s) => s.notes);
  const selectedNoteId = useNotesStore((s) => s.selectedNoteId);
  const addNote = useNotesStore((s) => s.addNote);
  const selectNote = useNotesStore((s) => s.selectNote);

  const handleAdd = () => {
    const id = crypto.randomUUID();
    addNote({ id, title: 'Untitled', content: '' });
  };

  return (
    <Sidebar side="left" variant="floating" collapsible="offcanvas" className="">
      <SidebarHeader>
        <SidebarInput placeholder="Search notes..." />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Notes</SidebarGroupLabel>
          <SidebarGroupAction>
            <Plus />
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              {notes.map((note) => (
                <SidebarMenuItem key={note.id}>
                  <SidebarMenuButton
                    isActive={selectedNoteId === note.id}
                    onClick={() => selectNote(note.id)}
                    title={note.title || 'Untitled'}
                  >
                    <span className="truncate">{note.title || 'Untitled'}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
