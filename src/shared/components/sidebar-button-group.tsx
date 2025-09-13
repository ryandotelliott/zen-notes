'use client';

import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Plus, Search } from 'lucide-react';
import { useMemo } from 'react';

export default function SidebarButtonGroup() {
  const { state, isMobile, openMobile } = useSidebar();

  const isExpanded = useMemo(() => (isMobile ? openMobile : state === 'expanded'), [state, openMobile, isMobile]);

  return (
    <div className="fixed top-2 left-4 z-40 flex items-center rounded-md bg-sidebar p-1">
      <SidebarTrigger className="rounded-sm" />

      <Button
        variant="ghost"
        size="icon"
        className="size-7 rounded-sm duration-150 ease-in-out data-[expanded=true]:h-0 data-[expanded=true]:w-0 data-[expanded=true]:opacity-0"
        data-expanded={isExpanded}
      >
        <Search />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-7 rounded-sm duration-150 ease-in-out data-[expanded=true]:h-0 data-[expanded=true]:w-0 data-[expanded=true]:opacity-0"
        data-expanded={isExpanded}
      >
        <Plus />
      </Button>
    </div>
  );
}
