import { createCareer } from "../game";
import { advanceDay } from "../season/advance";
import { resolveDecision } from "../career/decisions";
import { Rng } from "../rng";
import { createWorld } from "../world/generate";
import type { GameState } from "../types";

export function playerCareer(seed = 7, league = "L-BRA-2"): GameState {
  const w = createWorld(seed);
  const club = Object.values(w.clubs).find((c) => c.leagueId === league)!;
  return createCareer({ mode: "player", name: "Teste", last: "Souza", nation: "BRA", age: 18, pos: "ATA", foot: "D", height: 180, style: "Artilheiro", clubId: club.id, seed }, w);
}

export function coachCareer(seed = 11, league = "L-ING-1"): GameState {
  const w = createWorld(seed);
  const club = Object.values(w.clubs).filter((c) => c.leagueId === league).sort((a, b) => b.reputation - a.reputation)[3];
  return createCareer({ mode: "coach", name: "Prof. Teste", nation: "BRA", clubId: club.id, seed }, w);
}

/** Avança n dias jogando as partidas do usuário de forma instantânea e decidindo pela primeira opção. */
export function run(g: GameState, days: number) {
  const rng = new Rng(42);
  for (let i = 0; i < days; i++) {
    let r = advanceDay(g);
    if (r.stop === "match") r = advanceDay(g, { autoplayUser: true });
    for (const d of [...g.decisions]) {
      const opt = d.kind === "aposentadoria" ? "continuar" : d.kind === "renovacao" ? "aceitar" : d.options[0].id;
      resolveDecision(g, rng, d.id, opt);
    }
  }
}
