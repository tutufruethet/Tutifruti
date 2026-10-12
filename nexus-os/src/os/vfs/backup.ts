import { z } from 'zod';
import { isTextMime } from './memory';
import { dirname, resolvePath, ROOT } from './path';
import type { VfsNode, VfsPath, VirtualFileSystem } from './types';

/**
 * Backup do perfil em JSON: arquivos (texto como texto, binários em base64)
 * e preferências. Importar mescla: cria o que falta e sobrescreve caminhos iguais.
 */
export const BACKUP_FORMAT = 'nexus-os-backup';
export const BACKUP_VERSION = 1;
const MAX_BACKUP_BYTES = 60 * 1024 * 1024;

const EntrySchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('directory'), path: z.string().startsWith('/') }),
  z.object({
    kind: z.literal('file'),
    path: z.string().startsWith('/'),
    mime: z.string().max(200),
    encoding: z.enum(['text', 'base64']),
    content: z.string(),
  }),
]);

const BackupSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.literal(BACKUP_VERSION),
  exportedAt: z.string(),
  settings: z.unknown().optional(),
  entries: z.array(EntrySchema).max(50_000),
});

export type Backup = z.infer<typeof BackupSchema>;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function walk(fs: VirtualFileSystem, path: VfsPath, out: VfsNode[]) {
  for (const node of await fs.list(path)) {
    out.push(node);
    if (node.kind === 'directory') await walk(fs, node.path, out);
  }
}

export async function createBackup(fs: VirtualFileSystem, settings: unknown, now = new Date()): Promise<Backup> {
  const nodes: VfsNode[] = [];
  await walk(fs, ROOT, nodes);
  const entries: Backup['entries'] = [];
  for (const node of nodes) {
    if (node.kind === 'directory') {
      entries.push({ kind: 'directory', path: node.path });
    } else if (isTextMime(node.mime)) {
      entries.push({ kind: 'file', path: node.path, mime: node.mime, encoding: 'text', content: await fs.readText(node.path) });
    } else {
      const bytes = new Uint8Array(await (await fs.readBlob(node.path)).arrayBuffer());
      entries.push({ kind: 'file', path: node.path, mime: node.mime, encoding: 'base64', content: bytesToBase64(bytes) });
    }
  }
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: now.toISOString(), settings, entries };
}

/** Lê e valida um backup. Lança erro legível se o arquivo não for um backup do NEXUS. */
export function parseBackup(text: string): Backup {
  if (text.length > MAX_BACKUP_BYTES) throw new Error('Backup grande demais');
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('O arquivo não é um JSON válido');
  }
  const parsed = BackupSchema.safeParse(json);
  if (!parsed.success) throw new Error('O arquivo não é um backup do NEXUS OS');
  return parsed.data;
}

export async function restoreBackup(fs: VirtualFileSystem, backup: Backup): Promise<{ files: number; folders: number }> {
  let files = 0;
  let folders = 0;
  const ordered = [...backup.entries].sort((a, b) => a.path.split('/').length - b.path.split('/').length);
  for (const entry of ordered) {
    const path = resolvePath(entry.path);
    if (path === ROOT) continue;
    if (entry.kind === 'directory') {
      await fs.mkdir(path, { recursive: true });
      folders += 1;
      continue;
    }
    const existing = await fs.stat(path);
    if (existing?.kind === 'directory') continue;
    if (!(await fs.stat(dirname(path)))) await fs.mkdir(dirname(path), { recursive: true });
    if (entry.encoding === 'text') await fs.writeText(path, entry.content);
    else await fs.writeBlob(path, new Blob([base64ToBytes(entry.content)], { type: entry.mime }));
    files += 1;
  }
  return { files, folders };
}
