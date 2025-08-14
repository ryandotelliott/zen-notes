'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';

type BasicEditorProps = {
  initialContent?: string;
  className?: string;
};

export default function BasicEditor({ initialContent, className }: BasicEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit],
    content: initialContent ?? '<p>Hello TipTap 👋</p>',
    editorProps: {
      attributes: {
        class: 'dark:prose-invert max-w-none focus:outline-none h-full w-full overflow-auto px-4 py-1 md:px-6 md:py-4',
      },
    },
  });

  // Ensure editor is destroyed on unmount in React 19 strict effects
  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <EditorContent editor={editor} className="min-h-0 w-full flex-1 overflow-hidden" />
    </div>
  );
}
