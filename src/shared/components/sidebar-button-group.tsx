'use client';

import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Plus, Search } from 'lucide-react';
import { useMemo } from 'react';
import { ClassValue } from 'clsx';
import { cn } from '../lib/ui-utils';

export default function SidebarButtonGroup() {
  const { state, isMobile, openMobile } = useSidebar();

  const isExpanded = useMemo(() => (isMobile ? openMobile : state === 'expanded'), [state, openMobile, isMobile]);

  const buttonStyles: ClassValue = {
    'h-0 w-0 opacity-0': isExpanded,
  };

  return (
    <div className="group/sidebar-button-group fixed top-2 left-2 z-40 flex items-center rounded-md bg-sidebar p-1">
      <SidebarTrigger className="rounded-sm" />

      <Button variant="ghost" size="icon" className={cn('size-7 rounded-sm duration-150 ease-in-out', buttonStyles)}>
        <Search />
      </Button>
      <Button variant="ghost" size="icon" className={cn('size-7 rounded-sm duration-150 ease-in-out', buttonStyles)}>
        <Plus />
      </Button>
    </div>
  );
}
