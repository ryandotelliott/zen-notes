'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import { Placeholder } from '@tiptap/extensions';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import EditorToolbar from './EditorToolbar';

type BasicEditorProps = {
  initialContent?: string;
  className?: string;
};

export default function BasicEditor({ initialContent, className }: BasicEditorProps) {
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

  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  return (
    <div className={cn('grid h-full min-h-0 grid-cols-[auto_1fr] grid-rows-[auto_1fr] gap-x-4 gap-y-2', className)}>
      <header className="col-start-2 row-start-1">
        <h1 className="text-3xl font-bold">Hello TipTap 👋</h1>
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
