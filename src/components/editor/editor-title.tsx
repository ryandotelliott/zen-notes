import { cn } from '@/lib/utils';
import { useNotesStore } from '@/stores/notes-store';
import React, { useEffect, useRef } from 'react';

function isVisiblyEmpty(el: HTMLElement) {
  // textContent without whitespace; ignore lone <br> that contenteditable injects
  const text = (el.textContent || '').replace(/\u200B/g, '').trim(); // strip zero-width too
  return text.length === 0;
}

export default function EditorTitle({
  onKeyDown,
}: {
  onKeyDown?: (e: React.KeyboardEvent<HTMLHeadingElement>) => void;
}) {
  const selectedNoteId = useNotesStore((s) => s.selectedNoteId);
  const selectedNote = useNotesStore((s) => s.notes.find((note) => note.id === selectedNoteId));
  const updateNote = useNotesStore((s) => s.updateNote);
  const titleRef = useRef<HTMLHeadingElement | null>(null);

  // initialize and keep data-empty in sync for title placeholder
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;

    const update = () => {
      if (el.innerHTML === '<br>' || el.innerHTML === '<div><br></div>') {
        el.innerHTML = '';
      }
      el.dataset.empty = String(isVisiblyEmpty(el)); // set data-empty
    };

    update();

    el.addEventListener('input', update);
    return () => {
      el.removeEventListener('input', update);
    };
  }, []);

  // Sync title from store to component
  useEffect(() => {
    if (titleRef.current && selectedNote?.title) {
      titleRef.current.textContent = selectedNote.title;
      titleRef.current.dataset.empty = String(!selectedNote.title.trim());
    }
  }, [selectedNote?.title]);

  const handleTitleChange = (newTitle: string) => {
    if (selectedNoteId) {
      updateNote(selectedNoteId, { title: newTitle });
    }
  };

  return (
    <h1
      ref={titleRef}
      className={cn(
        'text-3xl font-bold focus:outline-none',
        'before:pointer-events-none before:text-muted-foreground/50',
        'data-[empty=true]:before:content-[attr(data-placeholder)]',
      )}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label="Title"
      data-placeholder="Untitled"
      onBlur={(e) => {
        const text = e.currentTarget.textContent?.trim() || '';
        e.currentTarget.textContent = text;
        e.currentTarget.dataset.empty = String(text.length === 0);
        handleTitleChange(text); // Save to store
      }}
      onKeyDown={onKeyDown}
    />
  );
}
