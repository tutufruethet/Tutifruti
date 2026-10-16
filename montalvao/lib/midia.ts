import manifesto from "@/content/midia.json";

export type InfoFoto = { largura: number; altura: number; larguras: number[]; cor: string; alt: string; foco: string };

const fotos = manifesto as unknown as Record<string, InfoFoto>;

export function foto(id: string): InfoFoto {
  const info = fotos[id];
  if (!info || !("larguras" in info)) throw new Error(`Foto "${id}" não está em content/midia.json. Rode npm run midia.`);
  return info;
}

export const srcFoto = (id: string, largura: number, formato: "avif" | "webp") => `/midia/${id}-${largura}.${formato}`;
