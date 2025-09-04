'use client';

import { cn } from '@/shared/lib/utils';
import { useNotesStore } from '@/features/notes/state/notes.store';
import { useDebouncedCallback } from '@/shared/hooks/use-debounced-callback';
import React, { useEffect, useRef } from 'react';

function cleanText(t: string) {
  return t.replace(/\u200B/g, '').trim();
}

const DEBOUNCE_MS = 500;
export default function EditorTitle({
  onKeyDown,
}: {
  onKeyDown: (e: React.KeyboardEvent<HTMLHeadingElement>) => void;
}) {
  const selectedNoteId = useNotesStore((s) => s.selectedNoteId);
  const updateNoteTitle = useNotesStore((s) => s.updateNoteTitle);

  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const latestTitleRef = useRef<string>('');

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debouncedUpdate = useDebouncedCallback((title: string) => {
    if (selectedNoteId) {
      updateNoteTitle(selectedNoteId, title);
    }
  }, DEBOUNCE_MS);

  const cancelPendingSave = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;

    const onInput = () => {
      if (el.innerHTML === '<br>' || el.innerHTML === '<div><br></div>') el.innerHTML = '';
      el.dataset.empty = String(cleanText(el.textContent || '') === '');

      latestTitleRef.current = cleanText(el.textContent || '');
      debouncedUpdate(latestTitleRef.current);
    };

    el.addEventListener('input', onInput);
    return () => el.removeEventListener('input', onInput);
  }, [debouncedUpdate]);

  // Sync title from store when the selected note changes
  useEffect(() => {
    const state = useNotesStore.getState();
    const selectedNote = state.notes.find((n) => n.id === selectedNoteId);
    const newText = cleanText(selectedNote?.title ?? '');

    if (titleRef.current) {
      const current = cleanText(titleRef.current.textContent || '');
      if (current !== newText) {
        titleRef.current.textContent = newText;
      }
      titleRef.current.dataset.empty = String(newText.length === 0);
      latestTitleRef.current = newText; // keep ref in sync
    }
  }, [selectedNoteId]);

  // Clear autosave on unmount and when switching notes
  useEffect(() => cancelPendingSave(), [selectedNoteId]);

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
        const text = cleanText(e.currentTarget.textContent || '');
        e.currentTarget.textContent = text;
        e.currentTarget.dataset.empty = String(text.length === 0);
        latestTitleRef.current = text;

        if (selectedNoteId) {
          updateNoteTitle(selectedNoteId, text);
        }
      }}
      onKeyDown={onKeyDown}
    />
  );
}
