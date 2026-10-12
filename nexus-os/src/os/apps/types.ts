import type { ComponentType } from 'react';
import type { SystemBridge } from '@/system/bridge';

export type AppId = string & { readonly __brand: 'AppId' };

export type AppCategory = 'system' | 'productivity' | 'media' | 'development' | 'ai';

/** Permissões declaradas pelo app; o shell só entrega o que foi declarado. */
export type AppPermission =
  | 'vfs:read'
  | 'vfs:write'
  | 'network'
  | 'ai'
  | 'audio'
  | 'notifications'
  | 'clipboard';

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface AppWindowOptions {
  readonly defaultSize: Size;
  readonly minSize: Size;
  readonly resizable: boolean;
  /** Abrir de novo foca a janela existente em vez de criar outra. */
  readonly singleInstance: boolean;
}

export interface AppProps {
  readonly windowId: string;
  readonly bridge: SystemBridge;
  readonly launchArgs?: Readonly<Record<string, string>>;
}

export interface AppManifest {
  readonly id: AppId;
  readonly name: string;
  readonly description: string;
  readonly category: AppCategory;
  /** Nome do glifo no conjunto de ícones do sistema (Fase 2). */
  readonly icon: string;
  readonly window: AppWindowOptions;
  readonly permissions: readonly AppPermission[];
  /** Carregamento sob demanda: o código do app só baixa quando ele abre. */
  readonly load: () => Promise<{ default: ComponentType<AppProps> }>;
}
