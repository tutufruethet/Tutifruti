/** Aplica o estilo de escrita persistente de cada personagem. */
import type { Persona } from "../types";
import type { Rng } from "../rng";

export type Emo = "feliz" | "hype" | "triste" | "raiva" | "neutro" | "carinho" | "duvida";

const EMOJI: Record<Emo, string[]> = {
  feliz: ["😂", "😎", "🙌", "⚽", "😁"],
  hype: ["🔥", "💪", "🔥🔥", "🚀", "😤"],
  triste: ["😔", "😞", "💔", "😢"],
  raiva: ["😤", "🤬", "😠"],
  neutro: ["👀", "😅", "🤙"],
  carinho: ["❤️", "🫂", "🙏", "🤝"],
  duvida: ["🤔", "👀", "😳"],
};

export interface StyleVars {
  [k: string]: string | number | undefined;
}

export function fillVars(t: string, v: StyleVars): string {
  return t.replace(/\{(\w+)\}/g, (_, k) => (v[k] !== undefined ? String(v[k]) : ""));
}

export function stylize(raw: string, p: Persona, rng: Rng, emo: Emo, vars: StyleVars): string {
  const pron = p.slang > 0.62 ? "tu" : p.slang > 0.38 ? "vc" : "você";
  let t = fillVars(raw, { ...vars, a: p.address, l: p.laugh, vc: pron, pet: p.pet });
  t = t.replace(/\s+/g, " ").replace(/\s+([,.!?])/g, "$1").trim();
  if (p.slang > 0.55) {
    t = t.replace(/\bvocê\b/g, pron).replace(/\bestá\b/g, "tá").replace(/\bestou\b/g, "tô").replace(/\bpara\b/g, "pra");
    if (rng.chance(0.5)) t = t.replace(/\bporque\b/g, "pq");
    if (rng.chance(0.4)) t = t.replace(/\btambém\b/g, "tb");
    if (rng.chance(0.3)) t = t.replace(/\bmuito\b/g, "mt");
    if (rng.chance(0.3)) t = t.replace(/\bque\b/g, "q");
    if (rng.chance(0.4)) t = t.replace(/\bnão\b/g, "n");
  }
  if (p.typo > 0.3 && rng.chance(p.typo * 0.5)) {
    t = t.replace(/[ãâáàéêíóôõú]/g, (c) => "aaaaeeiooou"["ãâáàéêíóôõú".indexOf(c)]);
  }
  if (p.type === "timido") {
    t = t.toLowerCase();
    if (rng.chance(0.35) && !t.endsWith("...")) t = t.replace(/[.!]?$/, "...");
  } else if ((emo === "hype" || emo === "raiva") && rng.chance(p.caps * 0.45)) {
    t = t.toUpperCase();
  } else if (p.slang > 0.55 && rng.chance(0.55) && !/^[A-ZÀ-Ú]{2}/.test(t)) {
    t = t.charAt(0).toLowerCase() + t.slice(1);
  }
  if (p.slang > 0.5 && rng.chance(0.65) && !t.endsWith("...")) t = t.replace(/\.$/, "");
  if (rng.chance(p.emoji * 0.55)) t = `${t} ${rng.pick(EMOJI[emo])}`;
  return t;
}
