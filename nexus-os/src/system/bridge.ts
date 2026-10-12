import type { VirtualFileSystem } from '@/os/vfs/types';

/**
 * Ponte entre os apps e o "sistema". Os apps nunca acessam IndexedDB, Supabase
 * ou o computador real diretamente: pedem tudo por aqui.
 *
 * v1 (decisão registrada em docs/arquitetura.md, ADR-006): só existe a ponte
 * virtual. Uma ponte nativa (app desktop com Tauri) pode entrar depois sem
 * reescrever apps, porque eles dependem desta interface, não da implementação.
 */
export type BridgeKind = 'virtual' | 'native';

export type BridgeCapability = 'fs' | 'notifications' | 'clipboard' | 'process';

export interface SystemBridge {
  readonly kind: BridgeKind;
  readonly capabilities: ReadonlySet<BridgeCapability>;
  readonly fs: VirtualFileSystem;
  readonly notifications: NotificationService;
  readonly clipboard: ClipboardService;
  /** Só na ponte nativa. Apps verificam `capabilities.has('process')` antes. */
  readonly process?: ProcessService;
}

export type NotificationTone = 'info' | 'success' | 'warning' | 'error';

export interface NotificationInput {
  readonly title: string;
  readonly body?: string;
  readonly tone?: NotificationTone;
  /** App que originou a notificação. */
  readonly source: string;
}

export interface NotificationService {
  notify(input: NotificationInput): Promise<string>;
  dismiss(id: string): Promise<void>;
}

export interface ClipboardService {
  readText(): Promise<string>;
  writeText(text: string): Promise<void>;
}

/**
 * Execução no computador real (futuro, só ponte nativa). Por desenho não aceita
 * texto livre de shell: só comandos de uma lista permitida, com confirmação do
 * usuário por ação e registro de auditoria.
 */
export interface AllowedCommand {
  readonly id: string;
  readonly description: string;
  readonly requiresConfirmation: true;
}

export interface ProcessResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

export interface ProcessService {
  listAllowed(): Promise<readonly AllowedCommand[]>;
  run(commandId: AllowedCommand['id'], args: readonly string[]): Promise<ProcessResult>;
}
