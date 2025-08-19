'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import { Placeholder } from '@tiptap/extensions';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import EditorToolbar from './EditorToolbar';

type BasicEditorProps = {
  initialContent?: string;
  initialTitle?: string;
  className?: string;
};

function isVisiblyEmpty(el: HTMLElement) {
  // textContent without whitespace; ignore lone <br> that contenteditable injects
  const text = (el.textContent || '').replace(/\u200B/g, '').trim(); // strip zero-width too
  return text.length === 0;
}

export default function BasicEditor({ initialContent, initialTitle, className }: BasicEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, Underline, Highlight, Placeholder.configure({ placeholder: 'Write something...' })],
    content: initialContent ?? '',
    editorProps: {
      attributes: {
        class: 'dark:prose-invert max-w-none focus:outline-none h-full w-full overflow-auto',
      },
    },
  });

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

  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  return (
    <div className={cn('grid h-full min-h-0 grid-cols-[auto_1fr] grid-rows-[auto_1fr] gap-x-4 gap-y-2', className)}>
      <header className="col-start-2 row-start-1">
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
      </header>

      <aside className="col-start-1 row-start-2">
        <EditorToolbar editor={editor} className="rounded p-2" />
      </aside>

      <main className="col-start-2 row-start-2 min-h-0 overflow-hidden">
        <EditorContent editor={editor} className="h-full min-h-0 overflow-auto" />
      </main>
    </div>
  );
}
