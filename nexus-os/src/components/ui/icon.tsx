import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

/**
 * Ícones de linha, pequenos (16 px), no traço do sistema. Sem emoji e sem
 * ícones gigantes (estudo: erros-que-eu-cometia).
 */
const PATHS = {
  folder: 'M2.5 4.5h4l1.5 1.5h5.5v6.5h-11z',
  file: 'M4 2.5h5l3 3v8H4zM9 2.5v3h3',
  terminal: 'M2.5 3.5h11v9h-11zM5 7l2 1.5L5 10M8.5 10.5H11',
  note: 'M3.5 2.5h9v11h-9zM5.5 5.5h5M5.5 8h5M5.5 10.5h3',
  settings: 'M3 4.5h10M3 8h10M3 11.5h10M6 3v3M10 6.5v3M7 10v3',
  bell: 'M4 11V7a4 4 0 0 1 8 0v4l1 1.5H3zM6.5 14h3',
  search: 'M7 11.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM10.3 10.3 13.5 13.5',
  up: 'M8 13V3M4 7l4-4 4 4',
  plus: 'M8 3v10M3 8h10',
  close: 'M4 4l8 8M12 4l-8 8',
  minimize: 'M4 8.5h8',
  maximize: 'M4 4h8v8H4z',
  restore: 'M5.5 5.5h6v6h-6zM4 9.5V4h5.5',
  download: 'M8 2.5v8M4.5 7 8 10.5 11.5 7M3 13.5h10',
  upload: 'M8 10.5v-8M4.5 6 8 2.5 11.5 6M3 13.5h10',
  trash: 'M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.5 9h6l.5-9',
  pencil: 'M3 13l1-3.5 6.5-6.5 2.5 2.5L6.5 12zM9.5 4l2.5 2.5',
  chevronLeft: 'M10 3 5 8l5 5',
  chevronRight: 'M6 3l5 5-5 5',
  grid: 'M3 3h4v4H3zM9 3h4v4H9zM3 9h4v4H3zM9 9h4v4H9z',
} as const;

export type IconName = keyof typeof PATHS;

export function isIconName(value: string): value is IconName {
  return Object.hasOwn(PATHS, value);
}

export function Icon({ name, className, ...props }: { name: IconName } & Omit<ComponentProps<'svg'>, 'children'>) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cn('size-4 shrink-0', className)}
      {...props}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
