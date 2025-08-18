'use client';

import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Bold, Italic, Underline, Strikethrough, Code, Sparkles, Type } from 'lucide-react';

interface EditorToolbarProps {
  editor: Editor | null;
}

export default function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) return null;

  const toolbarItems = [
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
    {
      icon: Sparkles,
      label: 'Highlight',
      action: () => editor.chain().focus().toggleHighlight().run(),
      isActive: editor.isActive('highlight'),
    },
    {
      icon: Type,
      label: 'Clear Format',
      action: () => editor.chain().focus().clearNodes().unsetAllMarks().run(),
      isActive: false,
    },
  ];

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-1">
        {toolbarItems.map((item) => {
          const Icon = item.icon;
          return (
            <Tooltip key={item.label}>
              <TooltipTrigger asChild>
                <Button
                  variant={item.isActive ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={item.action}
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
    </TooltipProvider>
  );
}
