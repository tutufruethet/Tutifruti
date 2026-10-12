import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { EmailSchema, readCloudConfig } from './cloud';
import { createSupabaseBackend } from './supabase';

describe('configuração da nuvem', () => {
  it('só liga com URL https e chave', () => {
    expect(readCloudConfig({})).toBeNull();
    expect(readCloudConfig({ url: 'http://x.supabase.co', anonKey: 'a'.repeat(40) })).toBeNull();
    expect(readCloudConfig({ url: 'https://x.supabase.co', anonKey: 'curta' })).toBeNull();
    expect(readCloudConfig({ url: 'https://x.supabase.co', anonKey: 'a'.repeat(40) })).toEqual({
      url: 'https://x.supabase.co',
      anonKey: 'a'.repeat(40),
    });
  });

  it('valida e-mail', () => {
    expect(EmailSchema.safeParse('ana@exemplo.com').success).toBe(true);
    expect(EmailSchema.safeParse('ana@').success).toBe(false);
  });
});

describe('adaptador do Supabase (cliente simulado)', () => {
  function fakeClient() {
    const calls: unknown[][] = [];
    const client = {
      auth: {
        getSession: async () => ({
          data: { session: { user: { id: 'u1', email: 'ana@exemplo.com', user_metadata: { name: 'Ana' } } } },
          error: null,
        }),
        signInWithOtp: async (args: unknown) => {
          calls.push(['otp', args]);
          return { error: null };
        },
        signOut: async () => {
          calls.push(['signOut']);
          return { error: null };
        },
      },
      from: (table: string) => ({
        select: (columns: string) => ({
          eq: (column: string, value: string) => ({
            maybeSingle: async () => {
              calls.push(['select', table, columns, column, value]);
              return { data: { data: { wallpaper: 'void' }, updated_at: '2026-10-12T00:00:00.000Z' }, error: null };
            },
          }),
        }),
        upsert: async (row: unknown) => {
          calls.push(['upsert', table, row]);
          return { error: null };
        },
      }),
    };
    return { client: client as unknown as SupabaseClient, calls };
  }

  const config = { url: 'https://x.supabase.co', anonKey: 'a'.repeat(40) };

  it('lê o usuário da sessão', async () => {
    const { client } = fakeClient();
    expect(await createSupabaseBackend(config, client).getUser()).toEqual({ id: 'u1', email: 'ana@exemplo.com', name: 'Ana' });
  });

  it('envia o link mágico com a URL de volta', async () => {
    const { client, calls } = fakeClient();
    await createSupabaseBackend(config, client).sendMagicLink('ana@exemplo.com', 'https://nexus.app/');
    expect(calls).toContainEqual(['otp', { email: 'ana@exemplo.com', options: { emailRedirectTo: 'https://nexus.app/' } }]);
  });

  it('preferências: lê a linha do próprio usuário e grava com upsert', async () => {
    const { client, calls } = fakeClient();
    const backend = createSupabaseBackend(config, client);
    expect(await backend.loadSettings('u1')).toEqual({ data: { wallpaper: 'void' }, updatedAt: Date.parse('2026-10-12T00:00:00.000Z') });
    await backend.saveSettings('u1', { wallpaper: 'horizon' });
    expect(calls[0]).toEqual(['select', 'user_settings', 'data, updated_at', 'user_id', 'u1']);
    expect(calls[1]).toMatchObject(['upsert', 'user_settings', { user_id: 'u1', data: { wallpaper: 'horizon' } }]);
  });
});
