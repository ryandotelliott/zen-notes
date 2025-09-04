'use client';

import { useEditor, EditorContent, JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import { Placeholder } from '@tiptap/extensions';
import { useEffect, useRef } from 'react';
import { cn } from '@/shared/lib/utils';
import EditorToolbar from './editor-toolbar';
import EditorTitle from './editor-title';
import { useNotesStore } from '@/features/notes/state/notes.store';
import { useDebouncedCallback } from '@/shared/hooks/use-debounced-callback';

type EditorBodyProps = {
  className?: string;
};

const AUTOSAVE_DEBOUNCE_MS = 2000;
export default function EditorMain({ className }: EditorBodyProps) {
  const selectedNoteId = useNotesStore((s) => s.selectedNoteId);
  const updateNoteContent = useNotesStore((s) => s.updateNoteContent);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const titleWrapperRef = useRef<HTMLDivElement | null>(null);
  const spacerRef = useRef<HTMLDivElement | null>(null);
  const titleHeightRef = useRef(0);

  const debouncedUpdate = useDebouncedCallback((content_json: JSONContent, content_text: string) => {
    console.log('debouncedUpdate', selectedNoteId, content_json, content_text);
    if (selectedNoteId) {
      updateNoteContent(selectedNoteId, content_json, content_text);
    }
  }, AUTOSAVE_DEBOUNCE_MS);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, Highlight, Placeholder.configure({ placeholder: 'Write something...' })],
    content: '',
    editorProps: {
      attributes: {
        class: 'max-w-none focus:outline-none h-full w-full',
      },
    },
    onUpdate: ({ editor }) => {
      const content_json = editor.getJSON();
      const content_text = editor.getText();
      debouncedUpdate(content_json, content_text);
    },
  });

  // Update editor content only when the selected note ID changes
  useEffect(() => {
    if (!editor) return;

    if (selectedNoteId) {
      const state = useNotesStore.getState();
      const note = state.notes.find((n) => n.id === selectedNoteId);
      const content = note?.content_json && Object.keys(note?.content_json).length > 0 ? note?.content_json : '';
      editor.commands.setContent(content, { emitUpdate: false });
    }

    return () => {
      if (!selectedNoteId) return;
      updateNoteContent(selectedNoteId, editor.getJSON(), editor.getText());
    };
  }, [editor, selectedNoteId, updateNoteContent]);

  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  // Auto-size the spacer to match the title height, so the toolbar always lines up with the editor.
  useEffect(() => {
    const scrollEl = scrollContainerRef.current;
    const titleEl = titleWrapperRef.current;
    const spacerEl = spacerRef.current;
    if (!scrollEl || !titleEl || !spacerEl) return;

    const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

    // cache title's top offset inside the scroll container
    const titleTop = titleEl.offsetTop;

    const measure = () => {
      const h = titleEl.offsetHeight;
      titleHeightRef.current = h;
      const visible = clamp(titleTop + h - scrollEl.scrollTop, 0, h);
      spacerEl.style.height = `${visible}px`;
    };

    const onScroll = () => {
      const h = titleHeightRef.current;
      const visible = clamp(titleTop + h - scrollEl.scrollTop, 0, h);
      spacerEl.style.height = `${visible}px`;
    };

    const ro = new ResizeObserver(measure);
    ro.observe(titleEl);

    measure();

    scrollEl.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      scrollEl.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
  }, []);

  return (
    <div className={cn('grid h-full min-h-0 grid-cols-[auto_1fr] gap-x-4', className)}>
      <aside className="col-start-1 flex flex-col">
        <div ref={spacerRef} className="shrink-0" aria-hidden />
        <EditorToolbar editor={editor} className="flex-1 rounded px-2" />
      </aside>

      <section className="col-start-2 flex min-h-0 flex-col">
        <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex h-full min-h-0 flex-col">
            <div ref={titleWrapperRef} id="title" className="shrink-0 py-2">
              <EditorTitle
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    editor?.chain().focus();
                  }
                }}
              />
            </div>

            <div className="min-h-0 flex-1">
              <EditorContent editor={editor} className="h-full max-w-none" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
