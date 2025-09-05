'use client';

import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Bold, Italic, Underline, Strikethrough, Code, Sparkles, Mic } from 'lucide-react';
import { cn } from '@/shared/lib/ui-utils';
import { useEffect, useReducer } from 'react';

interface ToolbarItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  action: () => void;
  isActive: boolean;
}

interface EditorToolbarProps {
  editor: Editor | null;
  className?: string;
}

export default function EditorToolbar({ editor, className }: EditorToolbarProps) {
  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  useEffect(() => {
    if (!editor) return;

    // NOTE: If we are getting bad performance, we can use requestAnimationFrame
    // to limit the number of rerenders.
    const handler = () => forceUpdate();
    editor.on('transaction', handler);
    editor.on('focus', handler);
    editor.on('blur', handler);

    return () => {
      editor.off('transaction', handler);
      editor.off('focus', handler);
      editor.off('blur', handler);
    };
  }, [editor]);

  if (!editor) return null;

  const toolbarItems: ToolbarItem[][] = [
    [
      {
        icon: Bold,
        label: 'Bold',
        action: () => editor.chain().focus().toggleBold().run(),
        isActive: editor.isActive('bold'),
      },
      {
        icon: Italic,
        label: 'Italic',
        action: () => editor.chain().focus().toggleItalic().run(),
        isActive: editor.isActive('italic'),
      },
      {
        icon: Underline,
        label: 'Underline',
        action: () => editor.chain().focus().toggleUnderline().run(),
        isActive: editor.isActive('underline'),
      },
      {
        icon: Strikethrough,
        label: 'Strikethrough',
        action: () => editor.chain().focus().toggleStrike().run(),
        isActive: editor.isActive('strike'),
      },
      {
        icon: Code,
        label: 'Code',
        action: () => editor.chain().focus().toggleCode().run(),
        isActive: editor.isActive('code'),
      },
    ],
    [
      {
        icon: Sparkles,
        label: 'Highlight',
        action: () => editor.chain().focus().toggleHighlight().run(),
        isActive: editor.isActive('highlight'),
      },
    ],
    [
      {
        icon: Mic,
        label: 'Voice Input',
        action: () => {},
        isActive: false,
      },
    ],
  ];

  return (
    <TooltipProvider>
      <div className={cn('flex flex-col', className)}>
        {toolbarItems.map((section, sectionIndex) => (
          <div key={`section-${sectionIndex}`} className="flex flex-col">
            {/* Section content */}
            <div className="flex flex-col gap-0.5">
              {section.map((item) => {
                const Icon = item.icon;
                return (
                  <Tooltip key={item.label}>
                    <TooltipTrigger asChild>
                      <Button
                        variant={item.isActive ? 'default' : 'ghost'} // TODO: Animate on state change
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={item.action}
                        aria-pressed={item.isActive}
                      >
                        <Icon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{item.label}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>

            {sectionIndex < toolbarItems.length - 1 && <Separator orientation="horizontal" className="my-2" />}
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}
