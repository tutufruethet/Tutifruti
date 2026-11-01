import { describe, expect, it } from "vitest";
import { sortTable } from "../season/schedule";
import type { GameState } from "../types";
import { coachCareer, playerCareer, run } from "./helpers";

function recomputeTable(g: GameState, compId: string) {
  const rows: Record<string, { p: number; pts: number; gf: number; ga: number }> = {};
  for (const f of Object.values(g.fixtures)) {
    if (f.compId !== compId || !f.played) continue;
    const r = f.result!;
    for (const [id, gf, ga] of [[f.homeId, r.hg, r.ag], [f.awayId, r.ag, r.hg]] as [string, number, number][]) {
      const x = (rows[id] ??= { p: 0, pts: 0, gf: 0, ga: 0 });
      x.p++; x.gf += gf; x.ga += ga; x.pts += gf > ga ? 3 : gf === ga ? 1 : 0;
    }
  }
  return rows;
}

describe("temporada completa", () => {
  const g = playerCareer(31);
  const startClubLeague: Record<string, string> = Object.fromEntries(Object.values(g.clubs).map((c) => [c.id, c.leagueId]));
  run(g, 300); // até depois do fim das ligas

  it("tabelas batem com os resultados", () => {
    for (const comp of Object.values(g.comps).filter((c) => c.type === "league")) {
      const rows = recomputeTable(g, comp.id);
      for (const row of comp.table) {
        const x = rows[row.clubId];
        expect(row.p).toBe(x.p);
        expect(row.pts).toBe(x.pts);
        expect(row.gf).toBe(x.gf);
        expect(row.ga).toBe(x.ga);
      }
      expect(comp.table.every((r) => r.p === 30)).toBe(true);
      expect(comp.finished).toBe(true);
    }
  });

  it("campeões registrados no histórico coincidem com o 1º da tabela", () => {
    for (const comp of Object.values(g.comps).filter((c) => c.type === "league")) {
      const champ = g.history.champions.find((c) => c.compId === comp.id && c.season === 0);
      expect(champ?.winnerId).toBe(sortTable([...comp.table])[0].clubId);
    }
  });

  it("copas e continentais terminam com campeão", () => {
    for (const id of ["C-BRA", "C-ING", "CONT-EU", "CONT-AS", "MUNDIAL", "S-BRA"]) {
      expect(g.comps[id].finished, id).toBe(true);
      expect(g.comps[id].winnerId, id).toBeDefined();
    }
  });

  it("artilharia da liga bate com gols nos jogos", () => {
    const comp = g.comps["L-BRA-1"];
    let fromFixtures = 0;
    for (const f of Object.values(g.fixtures)) if (f.compId === comp.id && f.played) fromFixtures += f.result!.hg + f.result!.ag;
    let fromPlayers = 0;
    for (const p of Object.values(g.players)) fromPlayers += p.compStats[comp.id]?.g ?? 0;
    expect(fromPlayers).toBe(fromFixtures);
  });

  it("prêmios da temporada foram dados", () => {
    expect(g.history.awards.some((a) => a.award === "Bola de Ouro Legacy")).toBe(true);
    expect(g.history.awards.some((a) => a.award.startsWith("Artilheiro"))).toBe(true);
  });

  it("vira a temporada com acesso e rebaixamento", () => {
    run(g, 70);
    expect(g.season).toBe(1);
    const moved = Object.values(g.clubs).filter((c) => c.leagueId !== startClubLeague[c.id]);
    expect(moved.length).toBe(12); // 3 sobem e 3 descem em BRA e ING
    for (const c of Object.values(g.comps).filter((c) => c.type === "league")) expect(c.teamIds.length).toBe(16);
    expect(Object.values(g.fixtures).every((f) => f.season === 1)).toBe(true);
  });

  it("o save sobrevive a JSON e continua jogável", () => {
    const copy: GameState = JSON.parse(JSON.stringify(g));
    run(copy, 20);
    expect(copy.day).toBe(g.day + 20);
  });
});

describe("várias temporadas no modo treinador", () => {
  it("roda 3 temporadas sem quebrar e mantém elencos saudáveis", () => {
    const g = coachCareer(5);
    run(g, 364 * 3 + 5);
    expect(g.season).toBe(3);
    for (const c of Object.values(g.clubs)) {
      expect(c.squad.length).toBeGreaterThanOrEqual(16);
      expect(c.squad.length).toBeLessThanOrEqual(40);
      for (const id of c.squad) expect(g.players[id]?.clubId).toBe(c.id);
    }
    expect(g.history.userSeasons.length + g.user.firedCount).toBeGreaterThanOrEqual(1);
    expect(g.history.transfers.length).toBeGreaterThan(30);
    expect(Object.keys(g.players).length).toBeLessThan(5200);
  });
});
