import { z } from 'zod';
import type { KeyValueStore } from '@/services/persistence/types';

/**
 * Perfis:
 * - `local`: dados no IndexedDB deste navegador. Sem senha (é um site, não um
 *   sistema multiusuário com segredo); serve para separar dados.
 * - `guest`: só memória; some ao sair.
 * - `cloud`: conta do Supabase (quando configurado).
 */
export type ProfileKind = 'local' | 'guest' | 'cloud';

export interface Profile {
  readonly id: string;
  readonly name: string;
  readonly kind: ProfileKind;
  readonly createdAt: number;
}

export const GUEST_PROFILE: Profile = { id: 'guest', name: 'Convidado', kind: 'guest', createdAt: 0 };

const ProfileSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(40),
  kind: z.enum(['local', 'cloud']),
  createdAt: z.number(),
});

const PROFILES_KEY = 'profiles';
const LAST_KEY = 'lastProfileId';

export function cleanProfileName(input: string): string {
  return input.replace(/\s+/g, ' ').trim().slice(0, 40);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? `${parts[0]![0]}${parts.at(-1)![0]}` : (parts[0]?.slice(0, 2) ?? '?');
  return letters.toUpperCase();
}

export interface ProfileRegistry {
  list(): Promise<Profile[]>;
  createLocal(name: string): Promise<Profile>;
  upsert(profile: Profile): Promise<void>;
  remove(id: string): Promise<void>;
  lastProfileId(): Promise<string | null>;
  setLastProfileId(id: string | null): Promise<void>;
}

export function createProfileRegistry(kv: KeyValueStore<unknown>, newId: () => string): ProfileRegistry {
  async function list(): Promise<Profile[]> {
    const parsed = z.array(ProfileSchema).safeParse(await kv.get(PROFILES_KEY));
    return parsed.success ? parsed.data : [];
  }

  async function save(profiles: readonly Profile[]) {
    await kv.set(PROFILES_KEY, profiles.filter((profile) => profile.kind !== 'guest'));
  }

  return {
    list,
    async createLocal(name) {
      const clean = cleanProfileName(name);
      if (!clean) throw new Error('Dê um nome ao perfil');
      const profiles = await list();
      if (profiles.some((profile) => profile.name.toLowerCase() === clean.toLowerCase())) {
        throw new Error(`Já existe um perfil chamado "${clean}"`);
      }
      const profile: Profile = { id: `local-${newId()}`, name: clean, kind: 'local', createdAt: Date.now() };
      await save([...profiles, profile]);
      return profile;
    },
    async upsert(profile) {
      if (profile.kind === 'guest') return;
      const profiles = await list();
      await save([...profiles.filter((item) => item.id !== profile.id), profile]);
    },
    async remove(id) {
      await save((await list()).filter((profile) => profile.id !== id));
      if ((await kv.get(LAST_KEY)) === id) await kv.delete(LAST_KEY);
    },
    async lastProfileId() {
      const value = await kv.get(LAST_KEY);
      return typeof value === 'string' ? value : null;
    },
    async setLastProfileId(id) {
      if (id) await kv.set(LAST_KEY, id);
      else await kv.delete(LAST_KEY);
    },
  };
}
