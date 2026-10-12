import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { createAppRegistry } from '@/os/apps/registry';
import type { AppId, AppManifest, AppProps } from '@/os/apps/types';

/**
 * Apps instalados. Só entram aqui apps que funcionam de verdade; os da Fase 6
 * (Browser, Music, Nexus AI, Calendar, Code Studio, System Monitor) entram
 * quando existirem, nunca como botão decorativo.
 */
export const APP_IDS = {
  files: 'files' as AppId,
  terminal: 'terminal' as AppId,
  notes: 'notes' as AppId,
  settings: 'settings' as AppId,
} as const;

const manifests: readonly AppManifest[] = [
  {
    id: APP_IDS.files,
    name: 'Files',
    description: 'Pastas e arquivos do sistema virtual',
    category: 'system',
    icon: 'folder',
    permissions: ['vfs:read', 'vfs:write', 'notifications'],
    window: { defaultSize: { width: 780, height: 480 }, minSize: { width: 420, height: 300 }, resizable: true, singleInstance: false },
    load: () => import('./files/FilesApp'),
  },
  {
    id: APP_IDS.terminal,
    name: 'Terminal',
    description: 'Linha de comando do sistema virtual',
    category: 'development',
    icon: 'terminal',
    permissions: ['vfs:read', 'vfs:write'],
    window: { defaultSize: { width: 680, height: 420 }, minSize: { width: 380, height: 240 }, resizable: true, singleInstance: false },
    load: () => import('./terminal/TerminalApp'),
  },
  {
    id: APP_IDS.notes,
    name: 'Notes',
    description: 'Notas com salvamento automático',
    category: 'productivity',
    icon: 'note',
    permissions: ['vfs:read', 'vfs:write'],
    window: { defaultSize: { width: 780, height: 500 }, minSize: { width: 420, height: 300 }, resizable: true, singleInstance: true },
    load: () => import('./notes/NotesApp'),
  },
  {
    id: APP_IDS.settings,
    name: 'Settings',
    description: 'Aparência, gráficos, movimento e atalhos',
    category: 'system',
    icon: 'settings',
    permissions: [],
    window: { defaultSize: { width: 660, height: 520 }, minSize: { width: 420, height: 360 }, resizable: true, singleInstance: true },
    load: () => import('./settings/SettingsApp'),
  },
];

export const appRegistry = createAppRegistry(manifests);

/** Componentes carregados sob demanda, criados uma vez (fora da renderização). */
export const appComponents: Readonly<Record<string, LazyExoticComponent<ComponentType<AppProps>>>> =
  Object.fromEntries(manifests.map((manifest) => [manifest.id, lazy(manifest.load)]));
