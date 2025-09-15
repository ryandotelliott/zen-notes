'use client';

import React, { useEffect, useMemo, useState } from 'react';
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
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Plus } from 'lucide-react';
import { useNoteTitleSearch } from '@/features/notes/hooks/use-note-title-search';
import { useNotesStore } from '@/features/notes/state/notes.store';
import NoteSidebarItem from '@/features/notes/components/sidebar/note-sidebar-item';
import ZenLogo from './zen-icons';

export default function NotesSidebar() {
  const selectedNoteId = useNotesStore((s) => s.selectedNoteId);
  const fetchNotes = useNotesStore((s) => s.fetchNotes);
  const addNote = useNotesStore((s) => s.addNote);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredNotes = useNoteTitleSearch(searchQuery);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const sections = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    const getStartOfWeek = (d: Date) => {
      const date = new Date(d);
      date.setHours(0, 0, 0, 0);
      const day = date.getDay(); // 0=Sun,1=Mon,...
      const diffToMonday = (day + 6) % 7; // Monday-start week
      date.setDate(date.getDate() - diffToMonday);
      return date;
    };

    const startOfThisWeek = getStartOfWeek(new Date());
    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

    const startOfLast30Days = new Date(startOfToday);
    startOfLast30Days.setDate(startOfLast30Days.getDate() - 30);

    type SectionLabel = 'Pinned' | 'Today' | 'Yesterday' | 'This week' | 'Last Week' | 'Last 30 Days' | 'Older';

    const order: SectionLabel[] = ['Pinned', 'Today', 'Yesterday', 'This week', 'Last Week', 'Last 30 Days', 'Older'];

    const buckets = new Map<SectionLabel, typeof filteredNotes>();
    for (const label of order) buckets.set(label, []);

    for (const note of filteredNotes) {
      const updatedAt = new Date(note.updatedAt);
      let label: SectionLabel;

      if (note.pinned) {
        label = 'Pinned';
      } else if (updatedAt >= startOfToday) {
        label = 'Today';
      } else if (updatedAt >= startOfYesterday) {
        label = 'Yesterday';
      } else if (updatedAt >= startOfThisWeek) {
        label = 'This week';
      } else if (updatedAt >= startOfLastWeek) {
        label = 'Last Week';
      } else if (updatedAt >= startOfLast30Days) {
        label = 'Last 30 Days';
      } else {
        label = 'Older';
      }

      buckets.get(label)!.push(note);
    }

    return order.map((label) => ({ label, items: buckets.get(label)! })).filter((section) => section.items.length > 0);
  }, [filteredNotes]);

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
          <SidebarGroupAction onClick={() => addNote({ title: '', contentJson: {}, contentText: '' })}>
            <Plus />
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu className="gap-y-1">
              {sections.map((section) => (
                <React.Fragment key={`section-${section.label}`}>
                  <SidebarMenuItem className="mt-1 first:mt-0">
                    <span className="px-2 py-1 text-xs font-medium text-muted-foreground/80 select-none">
                      {section.label}
                    </span>
                  </SidebarMenuItem>
                  {section.items.map((note) => (
                    <NoteSidebarItem
                      key={note.id}
                      id={note.id}
                      title={note.title}
                      previewText={note.previewText}
                      pinned={note.pinned}
                      isEditing={editingId === note.id}
                      setIsEditing={(editing: boolean) => setEditingId(editing ? note.id : null)}
                      isActive={selectedNoteId === note.id}
                    />
                  ))}
                </React.Fragment>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
