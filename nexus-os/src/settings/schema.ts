import { z } from 'zod';
import { QUALITY_LEVELS } from '@/engine/quality';

/**
 * Preferências do usuário. Cada campo tem fallback próprio (`.catch`): um valor
 * inválido ou ausente vindo do armazenamento volta ao padrão sem derrubar o resto.
 * A persistência (IndexedDB/Supabase) entra na Fase 3; aqui só o contrato.
 */
const volume = (fallback: number) => z.number().min(0).max(1).catch(fallback);

export const DEFAULT_SETTINGS = {
  locale: 'pt-BR',
  graphicsQuality: 'auto',
  motion: 'system',
  sound: { master: 0.8, ambient: 0.5, interface: 0.6 },
  wallpaper: 'nexus-grid',
  theme: 'nexus-dark',
} as const;

export const SettingsSchema = z.object({
  locale: z.enum(['pt-BR', 'en']).catch(DEFAULT_SETTINGS.locale),
  graphicsQuality: z.enum(['auto', ...QUALITY_LEVELS]).catch(DEFAULT_SETTINGS.graphicsQuality),
  motion: z.enum(['system', 'reduced', 'full']).catch(DEFAULT_SETTINGS.motion),
  sound: z
    .object({
      master: volume(DEFAULT_SETTINGS.sound.master),
      ambient: volume(DEFAULT_SETTINGS.sound.ambient),
      interface: volume(DEFAULT_SETTINGS.sound.interface),
    })
    .catch({ ...DEFAULT_SETTINGS.sound }),
  wallpaper: z.string().min(1).max(200).catch(DEFAULT_SETTINGS.wallpaper),
  theme: z.enum(['nexus-dark']).catch(DEFAULT_SETTINGS.theme),
});

export type Settings = z.infer<typeof SettingsSchema>;
export type GraphicsQualitySetting = Settings['graphicsQuality'];

/** Lê preferências de origem desconhecida (armazenamento, importação). Nunca lança. */
export function parseSettings(input: unknown): Settings {
  const source = typeof input === 'object' && input !== null ? input : {};
  return SettingsSchema.parse(source);
}
