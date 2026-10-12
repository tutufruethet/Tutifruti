import { notificationService } from '@/os/notifications/store';
import { MemoryFileSystem } from '@/os/vfs/memory';
import type { VirtualFileSystem } from '@/os/vfs/types';
import type { BridgeCapability, ClipboardService, NotificationService, SystemBridge } from './bridge';

/** Área de transferência do navegador, com memória local quando a permissão falha. */
export function createClipboardService(): ClipboardService {
  let fallback = '';
  return {
    async readText() {
      try {
        return (await navigator.clipboard.readText()) || fallback;
      } catch {
        return fallback;
      }
    },
    async writeText(text) {
      fallback = text;
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        // Sem permissão (ou fora de contexto seguro): fica só na memória do OS.
      }
    },
  };
}

export function createVirtualBridge(parts: {
  fs: VirtualFileSystem;
  notifications: NotificationService;
  clipboard: ClipboardService;
}): SystemBridge {
  const capabilities: ReadonlySet<BridgeCapability> = new Set<BridgeCapability>(['fs', 'notifications', 'clipboard']);
  return { kind: 'virtual', capabilities, ...parts };
}

/** Uma instância por aba: o monitor 3D e a tela cheia compartilham o mesmo sistema. */
export const memoryFileSystem = new MemoryFileSystem();

export const systemBridge: SystemBridge = createVirtualBridge({
  fs: memoryFileSystem,
  notifications: notificationService,
  clipboard: createClipboardService(),
});
