import { cn } from '@/lib/utils';
import { useNotesStore } from '@/stores/notes-store';
import React, { useEffect, useRef } from 'react';

type Props = {
  initialTitle?: string;
};

function isVisiblyEmpty(el: HTMLElement) {
  // textContent without whitespace; ignore lone <br> that contenteditable injects
  const text = (el.textContent || '').replace(/\u200B/g, '').trim(); // strip zero-width too
  return text.length === 0;
}

export default function EditorTitle() {
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
        e.currentTarget.dataset.empty = String(text.length === 0); // Set data-empty
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.preventDefault(); // Prevent newlines
      }}
    >
      {initialTitle || ''}
    </h1>
  );
}
