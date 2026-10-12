import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

export function Kbd({ className, ...props }: ComponentProps<'kbd'>) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-control border border-line px-1',
        'font-mono text-[11px] leading-none text-paper/70',
        className,
      )}
      {...props}
    />
  );
}
