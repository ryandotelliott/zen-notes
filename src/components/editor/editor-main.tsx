'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import { Placeholder } from '@tiptap/extensions';
import { useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import EditorToolbar from './editor-toolbar';
import EditorTitle from './editor-title';
import { useNotesStore } from '@/stores/notes-store';

type EditorBodyProps = {
  className?: string;
};

export default function EditorMain({ className }: EditorBodyProps) {
  const selectedNoteId = useNotesStore((s) => s.selectedNoteId);
  const updateNote = useNotesStore((s) => s.updateNote);

  const setEditorContentGetter = useNotesStore((s) => s.setEditorContentGetter);
  const setHasUnsavedChanges = useNotesStore((s) => s.setHasUnsavedChanges);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const titleWrapperRef = useRef<HTMLDivElement | null>(null);
  const spacerRef = useRef<HTMLDivElement | null>(null);

  const titleHeightRef = useRef(0);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const DEBOUNCE_MS = 500;

  // Schedule a debounced save
  const scheduleSave = useCallback(
    (content: string) => {
      if (!selectedNoteId) {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        return;
      }

      // Clear any pending save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        // Fetch the latest state to ensure we're not using stale data
        const { hasUnsavedChanges } = useNotesStore.getState();

        if (hasUnsavedChanges) {
          updateNote(selectedNoteId, { content });
          setHasUnsavedChanges(false);
        }
      }, DEBOUNCE_MS);
    },
    [selectedNoteId, updateNote, setHasUnsavedChanges],
  );

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
      const content = editor.getHTML();

      setHasUnsavedChanges(true);
      scheduleSave(content);
    },
  });

  // Define the getter so we can get the content from the store
  useEffect(() => {
    setEditorContentGetter(() => editor?.getHTML() ?? '');

    return () => {
      setEditorContentGetter(undefined);
    };
  }, [editor, setEditorContentGetter]);

  // Update editor content only when the selected note ID changes
  useEffect(() => {
    if (!editor) return;

    // Clear any pending saves when switching notes
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    if (selectedNoteId) {
      const state = useNotesStore.getState();
      const note = state.notes.find((n) => n.id === selectedNoteId);
      const content = note?.content ?? '';
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [editor, selectedNoteId]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
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
