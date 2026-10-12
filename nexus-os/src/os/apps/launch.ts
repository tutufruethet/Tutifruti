import { appRegistry } from '@/apps/catalog';
import { useWindowStore } from '@/os/window-manager/store';
import type { AppId } from './types';

/** Abre (ou foca, se for de instância única) um app instalado. */
export function openApp(appId: AppId, launchArgs?: Readonly<Record<string, string>>): string {
  const manifest = appRegistry.require(appId);
  return useWindowStore.getState().open(manifest, { launchArgs });
}
