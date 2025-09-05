import * as React from 'react';

import { cn } from '@/shared/lib/ui-utils';

const inputVariants = {
  small: 'h-8 px-2 py-1 text-sm',
  default: 'h-9 px-3 py-1 text-base',
};

interface InputProps extends Omit<React.ComponentProps<'input'>, 'size'> {
  size?: 'small' | 'default';
}

function Input({ className, type, size = 'default', ...props }: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'flex w-full min-w-0 rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30',
        'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
        inputVariants[size],
        className,
      )}
      {...props}
    />
  );
}

export { Input };
