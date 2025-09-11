import { cn } from '@/shared/lib/ui-utils';
import { useNotesStore } from '@/features/notes/state/notes.store';
import { useDebouncedCallback } from '@/shared/hooks/use-debounced-callback';
import React, { useEffect, useRef, KeyboardEvent } from 'react';

function cleanText(t: string) {
  return t.replace(/\u200B/g, '').trim();
}

const AUTOSAVE_DEBOUNCE_MS = 500;

export default function EditorTitle({
  onKeyDown,
  className,
}: {
  onKeyDown?: (e: KeyboardEvent<HTMLHeadingElement>) => void;
  className?: string;
}) {
  const selectedNoteId = useNotesStore((s) => s.selectedNoteId);
  const activeNote = useNotesStore((s) => s.notes.find((n) => n.id === s.selectedNoteId));
  const updateNoteTitle = useNotesStore((s) => s.updateNoteTitle);

  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const latestTitleRef = useRef<string>('');

  const debouncedUpdate = useDebouncedCallback((noteId: string, title: string) => {
    updateNoteTitle(noteId, title);
  }, AUTOSAVE_DEBOUNCE_MS);

  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;

    const onInput = () => {
      if (el.innerHTML === '<br>' || el.innerHTML === '<div><br></div>') el.innerHTML = '';
      el.dataset.empty = String(cleanText(el.textContent || '') === '');

      latestTitleRef.current = cleanText(el.textContent || '');
      const currentNoteId = useNotesStore.getState().selectedNoteId;
      if (!currentNoteId) return;
      debouncedUpdate(currentNoteId, latestTitleRef.current);
    };

    el.addEventListener('input', onInput);
    return () => el.removeEventListener('input', onInput);
  }, [debouncedUpdate]);

  // Sync title from store whenever the active note or its title changes (including Dexie updates)
  useEffect(() => {
    const newText = cleanText(activeNote?.title ?? '');
    const el = titleRef.current;
    if (!el) return;

    const current = cleanText(el.textContent || '');

    // Only update the title if it has changed.
    // This prevents us from changing content when updating the store locally.
    if (current !== newText) {
      el.textContent = newText;
    }
    el.dataset.empty = String(newText.length === 0);
    latestTitleRef.current = newText; // keep ref in sync
  }, [selectedNoteId, activeNote?.title, activeNote?.updatedAt]);

  // Clear autosave on unmount and when switching notes
  useEffect(() => {
    debouncedUpdate.cancel();

    return () => {
      debouncedUpdate.cancel();

      if (selectedNoteId) {
        debouncedUpdate(selectedNoteId, latestTitleRef.current);
      }
    };
  }, [selectedNoteId, debouncedUpdate]);

  return (
    <h1
      ref={titleRef}
      className={cn(
        'text-3xl font-bold focus:outline-none',
        'before:pointer-events-none before:text-muted-foreground/50',
        'data-[empty=true]:before:content-[attr(data-placeholder)]',
        className,
      )}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label="Title"
      data-placeholder="Untitled"
      onBlur={(e) => {
        const text = cleanText(e.currentTarget.textContent || '');
        e.currentTarget.textContent = text;
        e.currentTarget.dataset.empty = String(text.length === 0);
        latestTitleRef.current = text;

        // Write to the note that had focus at blur time, not any newly selected note
        const currentNoteId = useNotesStore.getState().selectedNoteId;
        if (currentNoteId) {
          updateNoteTitle(currentNoteId, text);
        }
      }}
      onKeyDown={onKeyDown}
    />
  );
}
