import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Bold, Italic, Underline, Strikethrough, Code, Sparkles, Mic } from 'lucide-react';
import { cn } from '@/shared/lib/ui-utils';
import { useEffect, useMemo, useState } from 'react';

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

type ActiveState = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  code: boolean;
  highlight: boolean;
};

function getActive(editor: Editor): ActiveState {
  return {
    bold: editor.isActive('bold'),
    italic: editor.isActive('italic'),
    underline: editor.isActive('underline'),
    strike: editor.isActive('strike'),
    code: editor.isActive('code'),
    highlight: editor.isActive('highlight'),
  };
}

export default function EditorToolbar({ editor, className }: EditorToolbarProps) {
  const [active, setActive] = useState<ActiveState | null>(null);

  useEffect(() => {
    if (!editor) return;

    const updateActive = () => {
      const next = getActive(editor);
      setActive((prev) => {
        if (!prev) {
          return next;
        }

        // Check if any of the active states have changed
        for (const k in next) {
          if (next[k as keyof ActiveState] !== prev[k as keyof ActiveState]) {
            return next;
          }
        }
        return prev;
      });
    };

    // Only changes that can affect toolbar state
    editor.on('focus', updateActive);
    editor.on('blur', () => setActive(null));
    editor.on('transaction', updateActive);

    // initialize once
    updateActive();

    return () => {
      editor.off('focus', updateActive);
      editor.off('blur', () => setActive(null));
      editor.off('transaction', updateActive);
    };
  }, [editor]);

  const items = useMemo<ToolbarItem[][]>(
    () => [
      [
        {
          icon: Bold,
          label: 'Bold',
          action: () => editor?.chain().focus().toggleBold().run(),
          isActive: active?.bold ?? false,
        },
        {
          icon: Italic,
          label: 'Italic',
          action: () => editor?.chain().focus().toggleItalic().run(),
          isActive: active?.italic ?? false,
        },
        {
          icon: Underline,
          label: 'Underline',
          action: () => editor?.chain().focus().toggleUnderline().run(),
          isActive: active?.underline ?? false,
        },
        {
          icon: Strikethrough,
          label: 'Strikethrough',
          action: () => editor?.chain().focus().toggleStrike().run(),
          isActive: active?.strike ?? false,
        },
        {
          icon: Code,
          label: 'Code',
          action: () => editor?.chain().focus().toggleCode().run(),
          isActive: active?.code ?? false,
        },
      ],
      [
        {
          icon: Sparkles,
          label: 'Highlight',
          action: () => editor?.chain().focus().toggleHighlight().run(),
          isActive: active?.highlight ?? false,
        },
      ],
      [{ icon: Mic, label: 'Voice Input', action: () => {}, isActive: false }],
    ],
    [editor, active],
  );

  if (!editor) return null;

  return (
    <TooltipProvider>
      <div className={cn('flex flex-col', className)}>
        {items.map((section, sectionIndex) => (
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

            {sectionIndex < items.length - 1 && <Separator orientation="horizontal" className="my-2" />}
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}
