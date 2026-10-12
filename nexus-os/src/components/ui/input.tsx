import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

export function Input({ className, type = 'text', ...props }: ComponentProps<'input'>) {
  return (
    <input
      data-slot="input"
      type={type}
      className={cn(
        'h-9 w-full min-w-0 border-0 border-b border-line bg-transparent px-0 text-base text-paper',
        'placeholder:text-paper/40 outline-none',
        'transition-[border-color] duration-(--duration-ui) ease-expo',
        'focus-visible:border-signal focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
      {...props}
    />
  );
}
