import { describe, expect, it } from 'vitest';
import type { AppId, AppManifest } from '@/os/apps/types';
import { filterApps } from './launcher-search';

function app(name: string, description: string): AppManifest {
  return {
    id: name.toLowerCase() as AppId,
    name,
    description,
    category: 'system',
    icon: 'file',
    permissions: [],
    load: async () => ({ default: () => null }),
    window: {
      defaultSize: { width: 500, height: 400 },
      minSize: { width: 300, height: 200 },
      resizable: true,
      singleInstance: false,
    },
  };
}

const apps = [app('Files', 'Pastas e arquivos'), app('Notes', 'Notas com salvamento'), app('Terminal', 'Linha de comando')];

describe('filterApps', () => {
  it('sem busca, devolve todos', () => {
    expect(filterApps(apps, '  ')).toHaveLength(3);
  });

  it('nome que começa com a busca vem antes de descrição', () => {
    expect(filterApps(apps, 'no').map((a) => a.name)).toEqual(['Notes']);
    expect(filterApps(apps, 'arquivos').map((a) => a.name)).toEqual(['Files']);
  });

  it('ignora acentos e caixa', () => {
    expect(filterApps(apps, 'LINHA').map((a) => a.name)).toEqual(['Terminal']);
    expect(filterApps(apps, 'notás').map((a) => a.name)).toEqual(['Notes']);
  });
});
