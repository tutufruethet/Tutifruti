import { z } from 'zod';

/**
 * Conta na nuvem (Supabase). Fica desligada até existirem as variáveis
 * NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY. A chave anon é
 * pública por desenho: quem protege os dados é o Row Level Security do
 * Postgres (supabase/migrations). Nenhuma chave secreta vai para o navegador.
 */
export interface CloudUser {
  readonly id: string;
  readonly email: string | null;
  readonly name: string | null;
}

export interface CloudSettingsRecord {
  readonly data: unknown;
  readonly updatedAt: number;
}

export interface CloudBackend {
  readonly provider: 'supabase';
  getUser(): Promise<CloudUser | null>;
  sendMagicLink(email: string, redirectTo: string): Promise<void>;
  signOut(): Promise<void>;
  loadSettings(userId: string): Promise<CloudSettingsRecord | null>;
  saveSettings(userId: string, data: unknown): Promise<void>;
}

export interface CloudConfig {
  readonly url: string;
  readonly anonKey: string;
}

const ConfigSchema = z.object({
  url: z.url({ protocol: /^https$/ }),
  anonKey: z.string().min(20),
});

export function readCloudConfig(
  env: { url?: string; anonKey?: string } = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
): CloudConfig | null {
  const parsed = ConfigSchema.safeParse(env);
  return parsed.success ? parsed.data : null;
}

export const EmailSchema = z.email('E-mail inválido');

let backend: Promise<CloudBackend | null> | null = null;

/** Carrega o cliente do Supabase só quando a nuvem está configurada (sem custo de bundle no resto). */
export function getCloudBackend(): Promise<CloudBackend | null> {
  backend ??= (async () => {
    const config = readCloudConfig();
    if (!config) return null;
    const { createSupabaseBackend } = await import('./supabase');
    return createSupabaseBackend(config);
  })();
  return backend;
}

export function isCloudConfigured(): boolean {
  return readCloudConfig() !== null;
}
