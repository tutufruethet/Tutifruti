import { describe, expect, it } from 'vitest';
import { AppRegistryError, createAppRegistry } from './registry';
import type { AppId, AppManifest } from './types';

function manifest(overrides: Partial<AppManifest> = {}): AppManifest {
  return {
    id: 'files' as AppId,
    name: 'Files',
    description: 'Arquivos',
    category: 'system',
    icon: 'folder',
    window: {
      defaultSize: { width: 800, height: 520 },
      minSize: { width: 420, height: 300 },
      resizable: true,
      singleInstance: false,
    },
    permissions: ['vfs:read', 'vfs:write'],
    load: async () => ({ default: () => null }),
    ...overrides,
  };
}

describe('createAppRegistry', () => {
  it('lista, busca e filtra por categoria', () => {
    const registry = createAppRegistry([
      manifest(),
      manifest({ id: 'nexus-ai' as AppId, name: 'Nexus AI', category: 'ai' }),
    ]);
    expect(registry.list()).toHaveLength(2);
    expect(registry.get('nexus-ai' as AppId)?.name).toBe('Nexus AI');
    expect(registry.byCategory('ai').map((m) => m.id)).toEqual(['nexus-ai']);
    expect(() => registry.require('nada' as AppId)).toThrow(AppRegistryError);
  });

  it('recusa ids duplicados ou fora do padrão', () => {
    expect(() => createAppRegistry([manifest(), manifest()])).toThrow(/duplicado/);
    expect(() => createAppRegistry([manifest({ id: 'Files App' as AppId })])).toThrow(/kebab-case/);
  });

  it('recusa tamanho padrão menor que o mínimo', () => {
    const broken = manifest({
      window: {
        defaultSize: { width: 300, height: 200 },
        minSize: { width: 420, height: 300 },
        resizable: true,
        singleInstance: false,
      },
    });
    expect(() => createAppRegistry([broken])).toThrow(/mínimo/);
  });
});
