import type { AppManifest } from '@/os/apps/types';

function normalize(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

/** Filtra apps por nome ou descrição; nome que começa com a busca vem primeiro. */
export function filterApps(apps: readonly AppManifest[], query: string): AppManifest[] {
  const needle = normalize(query);
  if (!needle) return [...apps];
  const scored = apps
    .map((app) => {
      const name = normalize(app.name);
      const description = normalize(app.description);
      const score = name.startsWith(needle) ? 0 : name.includes(needle) ? 1 : description.includes(needle) ? 2 : -1;
      return { app, score };
    })
    .filter(({ score }) => score >= 0);
  return scored.sort((a, b) => a.score - b.score).map(({ app }) => app);
}
