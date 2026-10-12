import type { AppId, Size } from '@/os/apps/types';

/**
 * Tipos do gerenciador de janelas. Coordenadas em px do desktop (o container
 * do OS sem a barra de tarefas), nunca da janela do navegador.
 */
export interface Bounds extends Size {
  readonly x: number;
  readonly y: number;
}

export type WindowDisplay = 'normal' | 'minimized' | 'maximized';

export interface WindowState {
  readonly id: string;
  readonly appId: AppId;
  readonly title: string;
  readonly bounds: Bounds;
  readonly minSize: Size;
  readonly resizable: boolean;
  /** Estado antes de minimizar, para restaurar igual. */
  readonly previousDisplay: Exclude<WindowDisplay, 'minimized'>;
  readonly display: WindowDisplay;
  /** Ordem de empilhamento: maior fica na frente. */
  readonly z: number;
  /** Argumentos de abertura (ex.: arquivo a abrir). Mudam quando o app é reaberto. */
  readonly launchArgs?: Readonly<Record<string, string>>;
}

export interface WindowManagerState {
  readonly windows: readonly WindowState[];
  readonly focusedId: string | null;
  readonly nextZ: number;
  readonly desktop: Size;
}

export type ResizeEdge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
