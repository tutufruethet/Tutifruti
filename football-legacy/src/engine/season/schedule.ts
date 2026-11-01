import { INTL_BREAK_WEEKS, LEAGUE_WEEKS, NATIONS, NATION_BY_ID, NATIONAL_TEAMS, SEASON_DAYS } from "../constants";
import { Rng } from "../rng";
import type { Club, Competition, Fixture, GameState, Group, TableRow } from "../types";

export const seasonStart = (s: number) => s * SEASON_DAYS;
/** dow: 0 = sábado, 4 = quarta */
export const dayOf = (s: number, week: number, dow = 0) => seasonStart(s) + week * 7 + dow;

export const newRow = (clubId: string): TableRow => ({ clubId, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, form: [] });

export function sortTable(rows: TableRow[]): TableRow[] {
  return rows.sort((a, b) => b.pts - a.pts || b.gf - b.ga - (a.gf - a.ga) || b.gf - a.gf || b.w - a.w || a.clubId.localeCompare(b.clubId));
}

/** Método do círculo: rodadas de ida e volta. */
export function roundRobin(ids: string[], rng: Rng, double = true): [string, string][][] {
  const teams = rng.shuffle([...ids]);
  if (teams.length % 2) teams.push("BYE");
  const n = teams.length;
  const rounds: [string, string][][] = [];
  const arr = [...teams];
  for (let r = 0; r < n - 1; r++) {
    const round: [string, string][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a === "BYE" || b === "BYE") continue;
      round.push(r % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(round);
    arr.splice(1, 0, arr.pop()!);
  }
  if (double) {
    const second = rounds.map((rd) => rd.map(([h, a]) => [a, h] as [string, string]));
    return [...rounds, ...second];
  }
  return rounds;
}

export function teamName(g: GameState, id: string): string {
  if (id.startsWith("N-")) return g.nations[id.slice(2)]?.name ?? id;
  return g.clubs[id]?.name ?? id;
}
export function teamShort(g: GameState, id: string): string {
  if (id.startsWith("N-")) return id.slice(2);
  return g.clubs[id]?.short ?? id;
}
export function teamColors(g: GameState, id: string): [string, string] {
  if (id.startsWith("N-")) return g.nations[id.slice(2)]?.colors ?? ["#888", "#fff"];
  return g.clubs[id]?.colors ?? ["#888", "#fff"];
}

function addFixture(g: GameState, f: Omit<Fixture, "id" | "played" | "season">): Fixture {
  const fx: Fixture = { ...f, id: `f${g.ids++}`, played: false, season: g.season };
  g.fixtures[fx.id] = fx;
  return fx;
}

function importanceFor(g: GameState, homeId: string, awayId: string, base: number): number {
  const h = g.clubs[homeId];
  if (h && h.rivals.includes(awayId)) return Math.max(base, 2);
  return base;
}

/** Classificação final da temporada anterior (ou reputação na primeira). */
export function previousRanking(g: GameState, leagueId: string): Club[] {
  const clubs = Object.values(g.clubs).filter((c) => c.leagueId === leagueId);
  const prev = g.season - 1;
  return clubs.sort((a, b) => {
    const pa = a.seasonsHistory.find((h) => h.season === prev && h.leagueId === leagueId)?.pos ?? 99;
    const pb = b.seasonsHistory.find((h) => h.season === prev && h.leagueId === leagueId)?.pos ?? 99;
    return pa - pb || b.reputation - a.reputation;
  });
}

function lastChampion(g: GameState, compId: string): string | undefined {
  return g.history.champions.find((c) => c.season === g.season - 1 && c.compId === compId)?.winnerId;
}

const KO_NAMES = (n: number): string[] => {
  const all = ["32 avos", "16 avos", "Oitavas", "Quartas", "Semifinal", "Final"];
  const rounds = Math.log2(n);
  return all.slice(all.length - rounds);
};

export function buildSeason(g: GameState, rng: Rng) {
  const s = g.season;
  g.comps = {};
  // Ligas
  for (const n of NATIONS) {
    for (const lg of n.leagues) {
      const id = `L-${n.id}-${lg.tier}`;
      const teams = Object.values(g.clubs).filter((c) => c.leagueId === id).map((c) => c.id);
      const comp: Competition = {
        id, name: lg.name, short: lg.short, type: "league", nation: n.id, tier: lg.tier, teamIds: teams,
        table: teams.map(newRow), stage: "Rodada 1", finished: false,
        promote: lg.tier === 2 ? 3 : 0, relegate: lg.tier === 1 && n.leagues.length > 1 ? 3 : 0,
        prestige: lg.tier === 1 ? Math.round(lg.strength / 10) : 4,
      };
      g.comps[id] = comp;
      const rounds = roundRobin(teams, rng);
      rounds.forEach((rd, ri) => {
        const day = dayOf(s, LEAGUE_WEEKS[ri], 0);
        for (const [h, a] of rd) addFixture(g, { compId: id, day, homeId: h, awayId: a, round: `Rodada ${ri + 1}`, importance: importanceFor(g, h, a, 1) });
      });
    }
    // Copa nacional
    if (n.cupName) {
      const teams = Object.values(g.clubs).filter((c) => c.nation === n.id).map((c) => c.id);
      const names = KO_NAMES(teams.length);
      const weeks = teams.length === 32 ? [6, 10, 15, 25, 34] : [10, 15, 25, 34];
      const days = weeks.map((w, i) => dayOf(s, w, i === weeks.length - 1 ? 0 : 4));
      const id = `C-${n.id}`;
      g.comps[id] = {
        id, name: n.cupName, short: "Copa", type: "cup", nation: n.id, teamIds: teams, table: [], stage: names[0],
        finished: false, prestige: 5, ko: { names, days, round: 0, alive: rng.shuffle([...teams]), neutralFinal: true },
      };
      scheduleKoRound(g, g.comps[id], rng);
    }
    // Supercopa
    if (n.supercupName) {
      const top = previousRanking(g, `L-${n.id}-1`);
      const a: string | undefined = lastChampion(g, `L-${n.id}-1`) ?? top[0]?.id;
      let b: string | undefined = lastChampion(g, `C-${n.id}`) ?? top[1]?.id;
      if (a === b) b = top.find((c) => c.id !== a)?.id;
      if (a && b && g.clubs[a] && g.clubs[b]) {
        const id = `S-${n.id}`;
        g.comps[id] = { id, name: n.supercupName, short: "Super", type: "supercup", nation: n.id, teamIds: [a, b], table: [], stage: "Final", finished: false, prestige: 3,
          ko: { names: ["Final"], days: [dayOf(s, 1, 0)], round: 0, alive: [a, b], neutralFinal: true } };
        scheduleKoRound(g, g.comps[id], rng);
      }
    }
  }
  // Continentais
  const euTeams = ["ING", "ESP", "ITA", "ALE"].flatMap((n) => previousRanking(g, `L-${n}-1`).slice(0, 4).map((c) => c.id));
  const asTeams = ["BRA", "ARG"].flatMap((n) => previousRanking(g, `L-${n}-1`).slice(0, 4).map((c) => c.id));
  buildContinental(g, rng, "CONT-EU", "Liga dos Campeões Legacy", "EU", euTeams, 4, [dayOf(s, 23, 4), dayOf(s, 28, 4), dayOf(s, 40, 4)], ["Quartas", "Semifinal", "Final"]);
  buildContinental(g, rng, "CONT-AS", "Copa Libertad Legacy", "AS", asTeams, 2, [dayOf(s, 28, 4), dayOf(s, 40, 4)], ["Semifinal", "Final"]);
  g.comps["MUNDIAL"] = {
    id: "MUNDIAL", name: "Mundial de Clubes Legacy", short: "Mundial", type: "intercontinental", region: "MUNDO", teamIds: [], table: [],
    stage: "Aguardando campeões", finished: false, prestige: 8,
    ko: { names: ["Final"], days: [dayOf(s, 42, 4)], round: 0, alive: [], neutralFinal: true },
  };
  // Seleções
  const ntIds = NATIONAL_TEAMS.map((n) => `N-${n}`);
  g.comps["AMISTOSOS"] = { id: "AMISTOSOS", name: "Amistosos Internacionais", short: "Amistoso", type: "friendly", teamIds: ntIds, table: [], stage: "Datas FIFA", finished: false, prestige: 1, isNationalTeams: true };
  for (const w of INTL_BREAK_WEEKS) {
    const order = rng.shuffle([...ntIds]);
    for (let i = 0; i < order.length; i += 2) addFixture(g, { compId: "AMISTOSOS", day: dayOf(s, w, 0), homeId: order[i], awayId: order[i + 1], round: "Amistoso", isNational: true, importance: 0 });
  }
  if (s % 2 === 0) {
    const order = rng.shuffle([...ntIds]);
    const groups: Group[] = [
      { name: "Grupo A", teamIds: order.slice(0, 4), table: order.slice(0, 4).map(newRow) },
      { name: "Grupo B", teamIds: order.slice(4), table: order.slice(4).map(newRow) },
    ];
    g.comps["NACOES"] = {
      id: "NACOES", name: "Copa das Nações Legacy", short: "Nações", type: "national", region: "MUNDO", teamIds: ntIds, table: [], groups, stage: "Fase de grupos",
      finished: false, prestige: 9, isNationalTeams: true,
      ko: { names: ["Semifinal", "Final"], days: [dayOf(s, 44, 4), dayOf(s, 45, 0)], round: 0, alive: [], neutralFinal: true, pendingFrom: "groups" },
    };
    const gDays = [dayOf(s, 43, 0), dayOf(s, 43, 4), dayOf(s, 44, 0)];
    for (const gr of groups) {
      roundRobin(gr.teamIds, rng, false).forEach((rd, ri) => {
        for (const [h, a] of rd) addFixture(g, { compId: "NACOES", day: gDays[ri], homeId: h, awayId: a, round: `${gr.name} · ${ri + 1}ª rodada`, isNational: true, neutral: true, importance: 2 });
      });
    }
  }
}

function buildContinental(g: GameState, rng: Rng, id: string, name: string, region: "EU" | "AS", teams: string[], nGroups: number, koDays: number[], koNames: string[]) {
  const s = g.season;
  // potes: espalha clubes do mesmo país
  const pots: string[][] = [];
  for (let i = 0; i < 4; i++) pots.push(rng.shuffle(teams.filter((_, idx) => idx % 4 === i)));
  const groups: Group[] = [];
  for (let gi = 0; gi < nGroups; gi++) groups.push({ name: `Grupo ${"ABCDEFGH"[gi]}`, teamIds: [], table: [] });
  for (const pot of pots) pot.forEach((t, i) => groups[i % nGroups].teamIds.push(t));
  for (const gr of groups) gr.table = gr.teamIds.map(newRow);
  const comp: Competition = {
    id, name, short: region === "EU" ? "Campeões" : "Libertad", type: "continental", region, teamIds: teams, table: [], groups,
    stage: "Fase de grupos", finished: false, prestige: region === "EU" ? 9 : 8,
    ko: { names: koNames, days: koDays, round: 0, alive: [], neutralFinal: true, pendingFrom: "groups" },
  };
  g.comps[id] = comp;
  const weeks = [3, 4, 7, 8, 11, 12];
  for (const gr of groups) {
    roundRobin(gr.teamIds, rng).forEach((rd, ri) => {
      for (const [h, a] of rd) addFixture(g, { compId: id, day: dayOf(s, weeks[ri], 4), homeId: h, awayId: a, round: `${gr.name} · ${ri + 1}ª rodada`, importance: 2 });
    });
  }
}

/** Cria os jogos da fase atual do mata-mata a partir de ko.alive (já ordenado em pares). */
export function scheduleKoRound(g: GameState, comp: Competition, rng: Rng) {
  const ko = comp.ko!;
  const alive = ko.alive;
  const isFinal = ko.round === ko.names.length - 1;
  void rng;
  for (let i = 0; i + 1 < alive.length; i += 2) {
    const h = alive[i];
    const a = alive[i + 1];
    addFixture(g, {
      compId: comp.id, day: ko.days[ko.round], homeId: h, awayId: a, round: ko.names[ko.round], tieId: `${comp.id}-${ko.round}-${i}`,
      neutral: (isFinal && ko.neutralFinal) || comp.isNationalTeams, isNational: comp.isNationalTeams,
      importance: isFinal ? 3 : comp.type === "continental" || comp.type === "intercontinental" ? 2 : importanceFor(g, h, a, 2),
    });
  }
  comp.stage = ko.names[ko.round];
}

/** Depois de um dia de jogos: avança mata-matas e fecha competições. */
export function updateCompetitions(g: GameState, rng: Rng): { finished: Competition[] } {
  const finished: Competition[] = [];
  for (const comp of Object.values(g.comps)) {
    if (comp.finished) continue;
    const fx = Object.values(g.fixtures).filter((f) => f.compId === comp.id && f.season === g.season);
    if (comp.type === "league") {
      const playedRounds = new Set(fx.filter((f) => f.played).map((f) => f.round)).size;
      comp.stage = `Rodada ${Math.min(playedRounds + 1, 30)}`;
      if (fx.length && fx.every((f) => f.played)) {
        sortTable(comp.table);
        comp.finished = true;
        comp.winnerId = comp.table[0].clubId;
        comp.runnerUpId = comp.table[1].clubId;
        comp.stage = "Encerrada";
        finished.push(comp);
      }
      continue;
    }
    if (comp.type === "friendly") continue;
    const ko = comp.ko;
    if (!ko) continue;
    if (ko.pendingFrom === "groups") {
      const groupFx = fx.filter((f) => !f.tieId);
      if (groupFx.length && groupFx.every((f) => f.played)) {
        const gs = comp.groups!;
        gs.forEach((gr) => sortTable(gr.table));
        const qualified: string[] = [];
        if (gs.length === 4) {
          // A1×B2, C1×D2, B1×A2, D1×C2
          qualified.push(gs[0].table[0].clubId, gs[1].table[1].clubId, gs[2].table[0].clubId, gs[3].table[1].clubId, gs[1].table[0].clubId, gs[0].table[1].clubId, gs[3].table[0].clubId, gs[2].table[1].clubId);
        } else {
          qualified.push(gs[0].table[0].clubId, gs[1].table[1].clubId, gs[1].table[0].clubId, gs[0].table[1].clubId);
        }
        ko.alive = qualified;
        ko.pendingFrom = undefined;
        scheduleKoRound(g, comp, rng);
      }
      continue;
    }
    if (comp.id === "MUNDIAL" && ko.alive.length === 0) {
      const eu = g.comps["CONT-EU"];
      const as = g.comps["CONT-AS"];
      if (eu?.finished && as?.finished && eu.winnerId && as.winnerId) {
        ko.alive = [eu.winnerId, as.winnerId];
        comp.teamIds = [...ko.alive];
        scheduleKoRound(g, comp, rng);
      }
      continue;
    }
    const roundFx = fx.filter((f) => f.tieId?.startsWith(`${comp.id}-${ko.round}-`));
    if (!roundFx.length || !roundFx.every((f) => f.played)) continue;
    const winners = roundFx.sort((a, b) => a.tieId!.localeCompare(b.tieId!, undefined, { numeric: true })).map((f) => fixtureWinner(f));
    if (ko.round === ko.names.length - 1) {
      const final = roundFx[0];
      comp.finished = true;
      comp.winnerId = winners[0];
      comp.runnerUpId = final.homeId === winners[0] ? final.awayId : final.homeId;
      comp.stage = "Encerrada";
      finished.push(comp);
    } else {
      ko.round++;
      ko.alive = winners;
      scheduleKoRound(g, comp, rng);
    }
  }
  return { finished };
}

export function fixtureWinner(f: Fixture): string {
  const r = f.result!;
  if (r.hg !== r.ag) return r.hg > r.ag ? f.homeId : f.awayId;
  if (r.pens) return r.pens[0] > r.pens[1] ? f.homeId : f.awayId;
  return f.homeId;
}

export function compName(g: GameState, compId: string): string {
  return g.comps[compId]?.name ?? compId;
}

export function nationName(id: string): string {
  return NATION_BY_ID[id]?.name ?? id;
}
