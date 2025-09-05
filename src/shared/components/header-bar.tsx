import { cn } from '@/shared/lib/ui-utils';
import React from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import NotesHeader from '@/features/notes/components/header/notes-header';

type Props = {
  className?: string;
};

export default function HeaderBar({ className }: Props) {
  return (
    <div className={cn('flex w-full items-center justify-between p-4', className)}>
      <SidebarTrigger className="h-10 w-10" />
      <NotesHeader />
    </div>
  );
}
