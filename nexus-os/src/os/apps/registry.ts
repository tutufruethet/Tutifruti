import type { AppCategory, AppId, AppManifest } from './types';

const APP_ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export class AppRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppRegistryError';
  }
}

export interface AppRegistry {
  get(id: AppId): AppManifest | undefined;
  require(id: AppId): AppManifest;
  list(): readonly AppManifest[];
  byCategory(category: AppCategory): readonly AppManifest[];
}

function validate(manifest: AppManifest): void {
  const { id } = manifest;
  if (!APP_ID_PATTERN.test(id)) throw new AppRegistryError(`Id de app inválido: "${id}" (use kebab-case)`);
  if (!manifest.name.trim()) throw new AppRegistryError(`App "${id}" sem nome`);
  const { defaultSize, minSize } = manifest.window;
  if (minSize.width <= 0 || minSize.height <= 0) throw new AppRegistryError(`App "${id}": tamanho mínimo inválido`);
  if (defaultSize.width < minSize.width || defaultSize.height < minSize.height) {
    throw new AppRegistryError(`App "${id}": tamanho padrão menor que o mínimo`);
  }
}

/** Registro imutável de apps. Valida tudo na criação para falhar cedo. */
export function createAppRegistry(manifests: readonly AppManifest[]): AppRegistry {
  const byId = new Map<AppId, AppManifest>();
  for (const manifest of manifests) {
    validate(manifest);
    if (byId.has(manifest.id)) throw new AppRegistryError(`App duplicado: "${manifest.id}"`);
    byId.set(manifest.id, manifest);
  }
  const all = Object.freeze([...byId.values()]);

  return {
    get: (id) => byId.get(id),
    require: (id) => {
      const manifest = byId.get(id);
      if (!manifest) throw new AppRegistryError(`App não registrado: "${id}"`);
      return manifest;
    },
    list: () => all,
    byCategory: (category) => all.filter((manifest) => manifest.category === category),
  };
}
