/** Consultas derivadas do estado, usadas pelas telas (nada aqui muda o jogo). */
import type { Fixture, GameState, Player, TableRow } from "@/engine/types";
import { isUserFixture } from "@/engine/season/apply";
import { sortTable } from "@/engine/season/schedule";
import { ageOf } from "@/engine/world/players";

export const me = (g: GameState): Player | undefined => (g.user.playerId ? g.players[g.user.playerId] : undefined);
export const myClub = (g: GameState) => (g.user.clubId ? g.clubs[g.user.clubId] : undefined);

export function table(g: GameState, compId: string): TableRow[] {
  const c = g.comps[compId];
  return c ? sortTable([...c.table]) : [];
}

export function userResults(g: GameState, n = 5): Fixture[] {
  return Object.values(g.fixtures).filter((f) => f.played && isUserFixture(g, f)).sort((a, b) => b.day - a.day).slice(0, n);
}

export function resultFor(g: GameState, f: Fixture, teamId: string): "V" | "E" | "D" {
  const r = f.result!;
  const home = f.homeId === teamId;
  const gf = home ? r.hg : r.ag, ga = home ? r.ag : r.hg;
  if (gf !== ga) return gf > ga ? "V" : "D";
  if (r.pens) return (home ? r.pens[0] > r.pens[1] : r.pens[1] > r.pens[0]) ? "V" : "D";
  return "E";
}

/** Posição na liga rodada a rodada (recalculada a partir dos jogos). */
export function positionHistory(g: GameState, compId: string, clubId: string): { round: number; pos: number }[] {
  const comp = g.comps[compId];
  if (!comp) return [];
  const rows: Record<string, TableRow> = Object.fromEntries(comp.teamIds.map((id) => [id, { clubId: id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, form: [] }]));
  const byRound = new Map<number, Fixture[]>();
  for (const f of Object.values(g.fixtures)) {
    if (f.compId !== compId || !f.played) continue;
    const r = Number(f.round.replace(/\D/g, ""));
    if (!byRound.has(r)) byRound.set(r, []);
    byRound.get(r)!.push(f);
  }
  const out: { round: number; pos: number }[] = [];
  for (const r of [...byRound.keys()].sort((a, b) => a - b)) {
    for (const f of byRound.get(r)!) {
      const res = f.result!;
      for (const [id, gf, ga] of [[f.homeId, res.hg, res.ag], [f.awayId, res.ag, res.hg]] as [string, number, number][]) {
        const x = rows[id];
        if (!x) continue;
        x.p++; x.gf += gf; x.ga += ga; x.pts += gf > ga ? 3 : gf === ga ? 1 : 0; if (gf > ga) x.w++;
      }
    }
    const sorted = sortTable(Object.values(rows).map((x) => ({ ...x })));
    out.push({ round: r, pos: sorted.findIndex((x) => x.clubId === clubId) + 1 });
  }
  return out;
}

export function scorers(g: GameState, compId: string, key: "g" | "a" = "g", n = 10) {
  return Object.values(g.players)
    .filter((p) => (p.compStats[compId]?.[key] ?? 0) > 0)
    .sort((a, b) => (b.compStats[compId]![key] - a.compStats[compId]![key]) || (b.compStats[compId]![key === "g" ? "a" : "g"] - a.compStats[compId]![key === "g" ? "a" : "g"]))
    .slice(0, n);
}

/** Potencial estimado pelo olheiro: faixa que estreita com a qualidade da base do clube. */
export function potentialRange(g: GameState, p: Player): string {
  if (p.isUser) return `${Math.max(p.ovr, p.potential - 3)}–${Math.min(99, p.potential + 3)}`;
  const club = myClub(g);
  const err = club ? Math.max(2, 9 - club.academy * 1.5) : 8;
  const seed = (p.id.charCodeAt(p.id.length - 1) % 5) - 2;
  const mid = p.potential + seed;
  const lo = Math.max(p.ovr, Math.round(mid - err));
  const hi = Math.min(99, Math.round(mid + err));
  return lo >= hi ? String(lo) : `${lo}–${hi}`;
}

export const age = (g: GameState, p: Player) => ageOf(p, g.day);

export function compsOfClub(g: GameState, clubId: string) {
  return Object.values(g.comps).filter((c) => c.teamIds.includes(clubId) || c.groups?.some((gr) => gr.teamIds.includes(clubId)));
}
