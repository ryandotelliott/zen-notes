import { useEditor, EditorContent, JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

import { Placeholder } from '@tiptap/extensions';
import { all, createLowlight } from 'lowlight';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Image from '@tiptap/extension-image';

import { useEffect, useRef } from 'react';
import { cn } from '@/shared/lib/ui-utils';
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
  const activeNote = useNotesStore((s) => s.notes.find((n) => n.id === s.selectedNoteId));

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const titleWrapperRef = useRef<HTMLDivElement | null>(null);
  const spacerRef = useRef<HTMLDivElement | null>(null);

  const debouncedUpdate = useDebouncedCallback((noteId: string, content_json: JSONContent, content_text: string) => {
    updateNoteContent(noteId, content_json, content_text);
  }, AUTOSAVE_DEBOUNCE_MS);

  const lowlight = createLowlight(all);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      CodeBlockLowlight.configure({ lowlight }),
      Placeholder.configure({ placeholder: 'Write something...' }),

      Image,
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'max-w-none focus:outline-none h-full w-full',
      },
    },
    onUpdate: ({ editor }) => {
      const content_json = editor.getJSON();
      const content_text = editor.getText();
      const currentNoteId = useNotesStore.getState().selectedNoteId;
      if (!currentNoteId) return;
      debouncedUpdate(currentNoteId, content_json, content_text);
    },
  });

  // Update editor content when the selected note ID changes
  useEffect(() => {
    if (!editor) return;

    if (selectedNoteId) {
      const notesState = useNotesStore.getState().notes;
      const note = notesState.find((n) => n.id === selectedNoteId);
      const content = note?.content_json && Object.keys(note?.content_json).length > 0 ? note?.content_json : '';
      editor.commands.setContent(content, { emitUpdate: false });
    }

    return () => {
      // Prevent any pending autosaves before our final update
      debouncedUpdate.cancel();

      if (!selectedNoteId || !editor) return;

      updateNoteContent(selectedNoteId, editor.getJSON(), editor.getText());
    };
  }, [editor, selectedNoteId, updateNoteContent, debouncedUpdate]);

  // Keep editor content in sync when Dexie/store updates the active note content
  useEffect(() => {
    if (!editor || !activeNote) return;

    // Avoid unnecessary setContent if text is already in sync
    // This prevents us from changing content when updating the store locally.
    const currentText = editor.getText();
    if (currentText === (activeNote.content_text ?? '')) return;

    const content =
      activeNote.content_json && Object.keys(activeNote.content_json).length > 0 ? activeNote.content_json : '';
    editor.commands.setContent(content, { emitUpdate: false });
  }, [editor, activeNote]);

  // Cancel any pending autosave when switching notes to prevent late writes
  useEffect(() => {
    debouncedUpdate.cancel();
  }, [selectedNoteId, debouncedUpdate]);

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

    const ro = new ResizeObserver(() => {
      const h = titleEl.offsetHeight;
      spacerEl.style.height = `${h}px`;
    });
    ro.observe(titleEl);

    const observer = new IntersectionObserver(
      ([entry]) => {
        const h = entry.boundingClientRect.height;
        spacerEl.style.height = `${h * entry.intersectionRatio}px`;
      },
      {
        root: scrollEl,
        threshold: Array.from({ length: 101 }, (_, i) => i / 100), // Update every 1%
      },
    );

    observer.observe(titleEl);

    return () => {
      ro.disconnect();
      observer.disconnect();
    };
  }, []);

  return (
    <div className={cn('grid h-full min-h-0 grid-cols-[auto_1fr] gap-x-4', className)}>
      <aside className="col-start-1 flex flex-col">
        <div ref={spacerRef} className="shrink-0" aria-hidden />
        <EditorToolbar editor={editor} className="flex-1 rounded px-2" />
      </aside>

      <section ref={scrollContainerRef} className="col-start-2 min-h-0 flex-1 flex-col overflow-y-auto">
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
            <EditorContent
              editor={editor}
              className="h-full max-w-none"
              onBlur={() => {
                // Get the id from the store directly, to avoid cross-note writes on selection change
                const currentNoteId = useNotesStore.getState().selectedNoteId;
                if (currentNoteId && editor) {
                  updateNoteContent(currentNoteId, editor.getJSON(), editor.getText());
                }
              }}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
