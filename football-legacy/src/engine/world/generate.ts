import { BASE_YEAR, NATIONS, NATION_BY_ID, NATIONAL_TEAMS, SQUAD_TEMPLATE } from "../constants";
import { CLUB_COLORS, COACH_FIRST, COACH_LAST, clubPattern, townName } from "../data/names";
import { clamp, Rng } from "../rng";
import type { Club, GameState, NationId, Pos, Settings } from "../types";
import { createPlayer, roundMoney } from "./players";

export const DEFAULT_SETTINGS: Settings = {
  typingAnimation: true,
  matchSpeed: 2,
  defaultMatchMode: "ao_vivo",
  advancedAI: false,
  aiDailyLimit: 40,
  aiProvider: "servidor",
  ollamaUrl: "http://localhost:11434",
  ollamaModel: "",
  autosave: true,
};

export function emptyGame(seed: number): GameState {
  return {
    schema: 1,
    id: `save-${seed.toString(36)}-${Date.now().toString(36)}`,
    name: "Nova carreira",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    seed,
    rng: seed,
    day: 0,
    season: 0,
    ids: 1,
    user: {
      mode: "player",
      name: "",
      nation: "BRA",
      clubId: null,
      coachRelation: 50,
      training: { focus: "equilibrado", intensity: 1 },
      reputation: 20,
      boardConfidence: 60,
      objectives: [],
      unemployed: false,
      firedCount: 0,
      seasonsAtClub: 0,
      jobOffers: [],
      retired: false,
      startSeason: 0,
      coachRecord: { w: 0, d: 0, l: 0 },
      lastBenchStreak: 0,
      legacyScore: 0,
      money: 0,
    },
    nations: {},
    clubs: {},
    players: {},
    comps: {},
    fixtures: {},
    news: [],
    decisions: [],
    offers: [],
    history: { champions: [], awards: [], transfers: [], userSeasons: [], records: [], milestones: [] },
    relations: {},
    groups: [],
    chat: { threads: {}, minds: {}, seq: 1, aiUsedToday: 0, aiDay: -1, flags: {} },
    achievements: {},
    settings: { ...DEFAULT_SETTINGS },
    callups: [],
    lastResults: [],
    log: [],
    celebrations: [],
    inbox: [],
  };
}

function shortCode(name: string, used: Set<string>): string {
  const words = name.replace(/^(EC|FC|AA|AC|US|CD|SD|SV|VfL|TSV|SC|CF|1\.)\s+/g, "").split(/\s+/);
  const letters = words.join("").replace(/[^A-Za-zÀ-ú]/g, "").toUpperCase();
  const cands = [letters.slice(0, 3), words.length > 1 ? (words[0][0] + words[1].slice(0, 2)).toUpperCase() : letters.slice(0, 2) + letters.slice(-1), letters.slice(0, 2) + letters[3]];
  for (const c of cands) if (c && c.length === 3 && !used.has(c)) { used.add(c); return c; }
  let i = 1;
  while (used.has(letters.slice(0, 2) + i)) i++;
  const c = letters.slice(0, 2) + i;
  used.add(c);
  return c;
}

export function coachName(rng: Rng): string {
  return `${rng.pick(COACH_FIRST)} ${rng.pick(COACH_LAST)}`;
}

function foreignNation(rng: Rng, home: NationId): NationId {
  const pool = NATIONS.filter((n) => n.id !== home);
  return rng.weighted(pool, (n) => n.exportWeight).id;
}

const AGE_DIST = [17, 18, 19, 20, 21, 22, 23, 23, 24, 24, 25, 25, 26, 26, 27, 27, 28, 28, 29, 30, 31, 32, 33, 34];

/** Gera elenco de um clube em torno de um overall alvo. */
export function fillSquad(g: GameState, rng: Rng, club: Club, target: number, foreignShare: number) {
  const positions: Pos[] = [];
  for (const [pos, n] of Object.entries(SQUAD_TEMPLATE)) for (let i = 0; i < n; i++) positions.push(pos as Pos);
  positions.forEach((pos, idx) => {
    const age = rng.pick(AGE_DIST);
    const starter = idx % 2 === 0;
    let ovr = target + (starter ? rng.normal(1.5, 2.6) : rng.normal(-4, 3.5));
    if (age <= 20) ovr -= (21 - age) * 3.5;
    if (age >= 33) ovr -= 2;
    ovr = clamp(ovr, 40, 90);
    const potential = age <= 23 ? ovr + Math.max(2, rng.normal((24 - age) * 3.2, 5)) : ovr + rng.range(0, 2);
    const nation = rng.chance(foreignShare) ? foreignNation(rng, club.nation) : club.nation;
    const p = createPlayer(g, rng, { nation, pos, age, ovr, potential, clubId: club.id });
    p.clubs.push({ clubId: club.id, clubName: club.name, season: g.season, fee: 0 });
    club.squad.push(p.id);
  });
}

export function createWorld(seed: number): GameState {
  const g = emptyGame(seed);
  const rng = new Rng(seed);
  for (const n of NATIONS) {
    g.nations[n.id] = { id: n.id, name: n.name, adj: n.adj, region: n.region, colors: n.colors, coach: coachName(rng) };
  }
  for (const n of NATIONS) {
    if (!n.leagues.length) continue;
    const used = new Set<string>();
    const shortUsed = new Set<string>();
    let townI = rng.int(0, 50);
    n.leagues.forEach((lg, li) => {
      const leagueId = `L-${n.id}-${lg.tier}`;
      for (let i = 0; i < lg.teams; i++) {
        let town = "";
        do {
          town = townName(n.id, townI, Math.floor(townI * 7 + rng.int(0, 13)));
          townI += rng.int(1, 5);
        } while (used.has(town));
        used.add(town);
        const name = clubPattern(n.id, rng.int(0, 20)).replace("{t}", town);
        // força relativa: topo da liga ~ +8, fundo ~ -7
        const rank = i / (lg.teams - 1);
        const target = clamp(lg.strength + 6 - rank * 13 + rng.normal(0, 1.5), 45, 85);
        const rep = clamp(Math.round((target - 48) * 2.3), 5, 98);
        const c1 = rng.pick(CLUB_COLORS);
        let c2 = rng.pick(CLUB_COLORS);
        while (c2 === c1) c2 = rng.pick(CLUB_COLORS);
        const id = `c${g.ids++}`;
        const budgetBase = Math.pow(1.16, target - 60) * 4_000_000;
        const club: Club = {
          id,
          name,
          short: shortCode(name, shortUsed),
          city: town,
          nation: n.id,
          colors: [c1, c2],
          pattern: rng.pick(["liso", "listras", "faixa", "metade", "cruz"] as const),
          reputation: rep,
          balance: roundMoney(budgetBase * rng.range(1.2, 2)),
          transferBudget: roundMoney(budgetBase * rng.range(0.4, 0.7)),
          wageBudget: 0,
          facilities: clamp(Math.round(rep / 22 + rng.range(0, 1)), 1, 5),
          academy: clamp(Math.round(rep / 25 + rng.range(0, 1.5)), 1, 5),
          stadium: Math.round(clamp(8000 + rep * 600 + rng.normal(0, 5000), 6000, 90000) / 500) * 500,
          squad: [],
          leagueId,
          tactic: { formation: rng.pick(["4-3-3", "4-4-2", "4-2-3-1", "3-5-2", "4-2-3-1", "4-3-3"]), mentality: 0, pressing: 1 },
          cohesion: rng.int(45, 70),
          coachName: coachName(rng),
          coachRep: clamp(rep + rng.int(-10, 10), 5, 95),
          coachPressure: 20,
          rivals: [],
          trophies: {},
          seasonsHistory: [],
          founded: BASE_YEAR - rng.int(40, 130),
        };
        g.clubs[id] = club;
        const foreignShare = n.region === "EU" ? (li === 0 ? 0.32 : 0.2) : 0.1;
        fillSquad(g, rng, club, target, foreignShare);
        for (const pid of club.squad) g.players[pid].persona.hometown = rng.chance(0.5) ? town : g.nations[g.players[pid].nation].name;
        club.wageBudget = roundMoney(club.squad.reduce((s, pid) => s + g.players[pid].contract.wage, 0) * 1.15);
      }
    });
    // rivalidades: pares dentro do país (clássicos)
    const clubs = Object.values(g.clubs).filter((c) => c.nation === n.id);
    const shuffled = rng.shuffle([...clubs]);
    for (let i = 0; i + 1 < shuffled.length; i += 2) {
      shuffled[i].rivals.push(shuffled[i + 1].id);
      shuffled[i + 1].rivals.push(shuffled[i].id);
    }
  }
  // agentes livres
  for (let i = 0; i < 70; i++) {
    const nation = rng.weighted(NATIONS, (n) => n.exportWeight + (n.leagues.length ? 3 : 0)).id;
    const pos = rng.pick(["GOL", "ZAG", "ZAG", "LAT", "VOL", "MEI", "PON", "ATA", "ATA"] as Pos[]);
    const age = rng.int(19, 34);
    const ovr = clamp(rng.normal(60, 7), 45, 78);
    const p = createPlayer(g, rng, { nation, pos, age, ovr, potential: ovr + (age < 23 ? rng.int(3, 12) : 1), clubId: null });
    p.contract = { wage: 0, until: g.season - 1 };
    p.persona.hometown = NATION_BY_ID[nation].name;
  }
  g.rng = rng.state;
  void NATIONAL_TEAMS;
  return g;
}
