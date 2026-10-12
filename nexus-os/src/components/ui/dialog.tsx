'use client';

import { Dialog as DialogPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';
import { usePortalContainer } from './portal-container';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

/**
 * Dentro do OS, o diálogo cobre só o OS (posição absoluta na camada de portal),
 * não a janela do navegador.
 */
export function DialogContent({ className, children, ...props }: ComponentProps<typeof DialogPrimitive.Content>) {
  const container = usePortalContainer();
  const position = container ? 'absolute' : 'fixed';
  return (
    <DialogPrimitive.Portal container={container}>
      <DialogPrimitive.Overlay
        data-slot="dialog-overlay"
        className={cn(position, 'inset-0 bg-veil animate-fade')}
      />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          position,
          'left-1/2 top-1/2 w-[min(32rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2',
          'border border-line bg-ink p-6 text-paper outline-none animate-pop',
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('text-xl font-medium tracking-[-0.02em]', className)}
      {...props}
    />
  );
}

export function DialogDescription({ className, ...props }: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('mt-2 text-sm text-paper/60', className)}
      {...props}
    />
  );
}
