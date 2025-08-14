'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';

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
        class: 'prose max-w-none focus:outline-none',
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
    <div className={className}>
      <EditorContent editor={editor} />
    </div>
  );
}
