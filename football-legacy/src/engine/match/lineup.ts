import { FORMATIONS } from "../constants";
import type { GameState, NationId, Player, Pos } from "../types";
import { posRating } from "../world/players";

export function available(p: Player): boolean {
  return !p.injury && p.suspended <= 0 && !p.retired;
}

function formBonus(p: Player): number {
  if (!p.form.length) return 0;
  const avg = p.form.reduce((a, b) => a + b, 0) / p.form.length;
  return (avg - 6.5) * 1.2;
}

export interface LineupResult {
  xi: string[];
  bench: string[];
}

const SLOT_ORDER: Pos[] = ["GOL", "ZAG", "LAT", "VOL", "ATA", "MEI", "PON"];

/** Técnicos da IA dão rodagem a jovens com potencial (e o usuário é um deles). */
export function prospectBonus(g: GameState, p: Player): number {
  const age = (g.day - p.birth) / 364;
  let b = age <= 21 ? Math.max(0, p.potential - p.ovr) / 7 : 0;
  if (p.isUser && g.user.mode === "player") b += 1.5 + (g.user.coachRelation - 50) / 10;
  return b;
}

export function selectionScore(g: GameState, p: Player, slot: Pos): number {
  let s = posRating(p, slot) * (0.72 + 0.28 * (p.fitness / 100)) + formBonus(p);
  if (p.isUser && g.user.mode === "player") s += (g.user.coachRelation - 50) / 12 + 0.8;
  return s;
}

export function autoLineup(g: GameState, playerIds: string[], formation: string): LineupResult {
  const slots = FORMATIONS[formation] ?? FORMATIONS["4-3-3"];
  const pool = playerIds.map((id) => g.players[id]).filter((p) => p && available(p));
  const used = new Set<string>();
  const xi: string[] = new Array(slots.length).fill("");
  const order = slots.map((pos, i) => ({ pos, i })).sort((a, b) => SLOT_ORDER.indexOf(a.pos) - SLOT_ORDER.indexOf(b.pos));
  for (const { pos, i } of order) {
    let best: Player | null = null;
    let bestScore = -1;
    for (const p of pool) {
      if (used.has(p.id)) continue;
      const sc = selectionScore(g, p, pos);
      if (sc > bestScore) { bestScore = sc; best = p; }
    }
    if (best) { xi[i] = best.id; used.add(best.id); }
  }
  const benchScore = (p: Player) => p.ovr * (0.7 + 0.3 * (p.fitness / 100)) + prospectBonus(g, p);
  const rest = pool.filter((p) => !used.has(p.id)).sort((a, b) => benchScore(b) - benchScore(a));
  const bench: string[] = [];
  const gk = rest.find((p) => p.pos === "GOL");
  if (gk) bench.push(gk.id);
  // cobertura: um defensor, um meio e um atacante antes do resto
  for (const group of [["ZAG", "LAT"], ["VOL", "MEI"], ["PON", "ATA"]]) {
    const c = rest.find((p) => group.includes(p.pos) && !bench.includes(p.id));
    if (c) bench.push(c.id);
  }
  for (const p of rest) {
    if (bench.length >= 9) break;
    if (!bench.includes(p.id) && p.pos !== "GOL") bench.push(p.id);
  }
  return { xi: xi.filter(Boolean), bench };
}

/** Garante que a escalação salva do usuário ainda é válida; completa com a automática. */
export function validateLineup(g: GameState, squad: string[], formation: string, chosen?: string[]): LineupResult {
  const slots = FORMATIONS[formation] ?? FORMATIONS["4-3-3"];
  if (!chosen || chosen.length !== slots.length) return autoLineup(g, squad, formation);
  const ok = chosen.every((id) => squad.includes(id) && g.players[id] && available(g.players[id]));
  if (!ok) {
    const auto = autoLineup(g, squad, formation);
    // mantém os escolhidos disponíveis na mesma vaga
    const xi = chosen.map((id, i) => (squad.includes(id) && g.players[id] && available(g.players[id]) ? id : ""));
    const used = new Set(xi.filter(Boolean));
    for (let i = 0; i < xi.length; i++) {
      if (xi[i]) continue;
      const cand = squad
        .map((id) => g.players[id])
        .filter((p) => p && available(p) && !used.has(p.id))
        .sort((a, b) => posRating(b, slots[i]) - posRating(a, slots[i]))[0];
      if (cand) { xi[i] = cand.id; used.add(cand.id); }
    }
    const bench = auto.bench.filter((id) => !used.has(id));
    return { xi: xi.filter(Boolean), bench };
  }
  const used = new Set(chosen);
  const bench = squad
    .map((id) => g.players[id])
    .filter((p) => p && available(p) && !used.has(p.id))
    .sort((a, b) => b.ovr - a.ovr)
    .slice(0, 9)
    .map((p) => p.id);
  return { xi: [...chosen], bench };
}

const NT_QUOTA: Record<Pos, number> = { GOL: 3, ZAG: 4, LAT: 4, VOL: 3, MEI: 3, PON: 3, ATA: 3 };

/** Convocação: os 23 melhores por nacionalidade, com cotas por posição. */
export function nationalSquad(g: GameState, nation: NationId): string[] {
  const all = Object.values(g.players)
    .filter((p) => p.nation === nation && !p.retired && p.clubId && !p.injury)
    .sort((a, b) => b.ovr + formBonus(b) + b.reputation / 40 - (a.ovr + formBonus(a) + a.reputation / 40));
  const picked: string[] = [];
  const count: Record<string, number> = {};
  for (const p of all) {
    if ((count[p.pos] ?? 0) >= NT_QUOTA[p.pos]) continue;
    count[p.pos] = (count[p.pos] ?? 0) + 1;
    picked.push(p.id);
    if (picked.length >= 23) break;
  }
  return picked;
}
