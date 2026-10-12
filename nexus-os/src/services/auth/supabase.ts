import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { CloudBackend, CloudConfig } from './cloud';

/** Tabela `user_settings` (supabase/migrations): uma linha por usuário, protegida por RLS. */
const SETTINGS_TABLE = 'user_settings';

export function createSupabaseBackend(
  config: CloudConfig,
  client: SupabaseClient = createClient(config.url, config.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
  }),
): CloudBackend {
  return {
    provider: 'supabase',

    async getUser() {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      const user = data.session?.user;
      if (!user) return null;
      const name = typeof user.user_metadata?.name === 'string' ? user.user_metadata.name : null;
      return { id: user.id, email: user.email ?? null, name };
    },

    async sendMagicLink(email, redirectTo) {
      const { error } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
      if (error) throw error;
    },

    async signOut() {
      const { error } = await client.auth.signOut();
      if (error) throw error;
    },

    async loadSettings(userId) {
      const { data, error } = await client
        .from(SETTINGS_TABLE)
        .select('data, updated_at')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const row = data as { data: unknown; updated_at: string };
      return { data: row.data, updatedAt: Date.parse(row.updated_at) || 0 };
    },

    async saveSettings(userId, data) {
      const { error } = await client
        .from(SETTINGS_TABLE)
        .upsert({ user_id: userId, data, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
  };
}
