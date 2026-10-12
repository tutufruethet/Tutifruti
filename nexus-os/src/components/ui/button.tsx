import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

export const buttonVariants = cva(
  [
    'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-control',
    'font-sans select-none outline-none',
    'transition-[background-color,color,border-color,opacity] duration-(--duration-ui) ease-expo',
    'focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-signal',
    'disabled:pointer-events-none disabled:opacity-40',
  ],
  {
    variants: {
      variant: {
        /** Ação principal: o único lugar com fundo no acento. */
        primary: 'bg-signal text-ink hover:bg-paper',
        /** Contorno fino, superfície plana. */
        line: 'border border-line bg-transparent text-paper hover:border-paper/60',
        /** Sem contorno; acende no hover. */
        ghost: 'bg-transparent text-paper/60 hover:text-paper',
      },
      size: {
        sm: 'h-7 px-2.5 text-sm',
        md: 'h-9 px-3.5 text-sm',
        icon: 'size-8 text-sm',
      },
    },
    defaultVariants: { variant: 'line', size: 'md' },
  },
);

export type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({ className, variant, size, asChild = false, type, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button';
  return (
    <Comp
      data-slot="button"
      type={asChild ? undefined : (type ?? 'button')}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
