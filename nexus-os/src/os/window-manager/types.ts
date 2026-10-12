import type { AppId, Size } from '@/os/apps/types';

/**
 * Contrato do gerenciador de janelas. A implementação (store Zustand, arrastar,
 * redimensionar, foco e ordem) é a Fase 2. Coordenadas em px do container do
 * OS, nunca da janela do navegador.
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
  /** Posição antes de maximizar, para restaurar. */
  readonly restoreBounds: Bounds | null;
  readonly display: WindowDisplay;
  /** Ordem de empilhamento: maior fica na frente. */
  readonly z: number;
}

export interface WindowManager {
  readonly windows: readonly WindowState[];
  readonly focusedId: string | null;
  open(appId: AppId, options?: { title?: string; bounds?: Partial<Bounds> }): string;
  close(id: string): void;
  focus(id: string): void;
  minimize(id: string): void;
  maximize(id: string): void;
  restore(id: string): void;
  move(id: string, x: number, y: number): void;
  resize(id: string, size: Size): void;
}
