'use client';

import React, { useState } from 'react';
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
} from '@/components/ui/sidebar';
import { Plus } from 'lucide-react';
import { useNotesStore } from '@/features/notes/state/use-notes-store';
import { useNoteSearch } from '@/shared/hooks/use-note-search';
import { useNotesStore as useNotesStoreNew } from '@/features/notes/state/notes.store';
import NoteSidebarItem from '@/features/notes/components/sidebar/note-sidebar-item';

export default function NotesSidebar() {
  const selectedNoteId = useNotesStore((s) => s.selectedNoteId);
  const addNote = useNotesStoreNew((s) => s.addNote);
  const notes = useNotesStoreNew((s) => s.notes);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const filteredNotes = useNoteSearch(searchQuery);

  return (
    <Sidebar side="left" variant="floating" collapsible="offcanvas">
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
          <SidebarGroupAction onClick={() => addNote({ title: '', content: '' })}>
            <Plus />
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              {notes.map((note) => (
                <NoteSidebarItem
                  key={note.id}
                  id={note.id}
                  title={note.title}
                  isEditing={editingId === note.id}
                  setIsEditing={(editing: boolean) => setEditingId(editing ? note.id : null)}
                  isActive={selectedNoteId === note.id}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
