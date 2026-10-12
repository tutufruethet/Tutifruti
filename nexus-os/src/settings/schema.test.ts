import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, parseSettings } from './schema';
import { useSettingsStore } from './store';

describe('parseSettings', () => {
  it('preenche os padrões quando não há nada salvo', () => {
    expect(parseSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('lixo')).toEqual(DEFAULT_SETTINGS);
  });

  it('mantém campos válidos e corrige só os inválidos', () => {
    const parsed = parseSettings({
      graphicsQuality: 'ultra',
      locale: 'klingon',
      sound: { master: 2, ambient: 0.1, interface: 0.3 },
    });
    expect(parsed.graphicsQuality).toBe('ultra');
    expect(parsed.locale).toBe('pt-BR');
    expect(parsed.sound).toEqual({ master: 0.8, ambient: 0.1, interface: 0.3 });
  });
});

describe('useSettingsStore', () => {
  it('valida alterações parciais', () => {
    useSettingsStore.getState().update({ graphicsQuality: 'low' });
    expect(useSettingsStore.getState().settings.graphicsQuality).toBe('low');
  });
});
