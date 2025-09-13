'use client';

import React, { useEffect, useState } from 'react';
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
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Plus } from 'lucide-react';
import { useNoteSearch } from '@/features/notes/hooks/use-note-search';
import { useNotesStore } from '@/features/notes/state/notes.store';
import NoteSidebarItem from '@/features/notes/components/sidebar/note-sidebar-item';
import ZenLogo from './zen-icons';

export default function NotesSidebar() {
  const selectedNoteId = useNotesStore((s) => s.selectedNoteId);
  const fetchNotes = useNotesStore((s) => s.fetchNotes);
  const addNote = useNotesStore((s) => s.addNote);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredNotes = useNoteSearch(searchQuery);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  return (
    <Sidebar side="left" variant="inset" collapsible="offcanvas">
      <SidebarHeader className="flex flex-col gap-y-4">
        <div className="flex items-center justify-center">
          <ZenLogo className="h-5 w-8 text-muted-foreground" />
        </div>
        <SidebarInput
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Notes</SidebarGroupLabel>
          <SidebarGroupAction onClick={() => addNote({ title: '', content_json: {}, content_text: '' })}>
            <Plus />
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu className="gap-y-1">
              {filteredNotes.map((note) => (
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
