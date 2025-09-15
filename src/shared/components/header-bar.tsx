import { cn } from '@/shared/lib/ui-utils';
import React from 'react';
import NotesHeader from '@/features/notes/components/header/notes-header';

type Props = {
  className?: string;
};

export default function HeaderBar({ className }: Props) {
  return (
    <div className={cn('hidden w-full items-center p-4 md:flex', className)}>
      <NotesHeader />
    </div>
  );
}
