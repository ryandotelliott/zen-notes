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
        class: 'max-w-none focus:outline-none h-full w-full overflow-auto',
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

  return (
    <div className={cn('grid h-full min-h-0 grid-cols-[auto_1fr] grid-rows-[auto_1fr] gap-x-4 gap-y-2', className)}>
      <aside className="col-start-1 row-start-2">
        <EditorToolbar editor={editor} className="rounded p-2" />
      </aside>

      <header className="col-start-2 row-start-1">
        <EditorTitle
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              editor?.chain().focus();
            }
          }}
        />
      </header>

      <main className="col-start-2 row-start-2 min-h-0 overflow-hidden">
        <EditorContent editor={editor} className="h-full min-h-0 overflow-auto" />
      </main>
    </div>
  );
}
