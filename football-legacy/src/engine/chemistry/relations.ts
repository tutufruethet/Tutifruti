/**
 * FOOTBALL CHEMISTRY — relações entre jogadores, duplas e trios.
 * As relações só são acompanhadas no clube do usuário (e as antigas ficam
 * guardadas para permitir reencontros). Nada aqui é criado por clique: tudo
 * nasce de minutos juntos, gols combinados, conversas e personalidade.
 */
import { clamp, hashSeed, Rng } from "../rng";
import type { ChemGroup, GameState, GroupLevel, PersonalityType, Player, Relation } from "../types";

export const USER_COACH_ID = "U";

export const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

const COMPAT: Partial<Record<string, number>> = {
  "leal|lider": 0.8, "brincalhao|brincalhao": 0.7, "brincalhao|emocional": 0.5, "leal|leal": 0.7, "lider|timido": 0.5,
  "competitivo|lider": 0.4, "brincalhao|leal": 0.5, "emocional|leal": 0.6, "ambicioso|competitivo": 0.4, "brincalhao|timido": 0.1,
  "arrogante|arrogante": -0.8, "arrogante|competitivo": -0.6, "arrogante|timido": -0.3, "ambicioso|leal": -0.3,
  "arrogante|emocional": -0.5, "arrogante|lider": -0.4, "competitivo|competitivo": -0.1, "ambicioso|ambicioso": -0.2,
};

export function compatibility(a: PersonalityType, b: PersonalityType): number {
  const k = a < b ? `${a}|${b}` : `${b}|${a}`;
  return COMPAT[k] ?? 0.1;
}

function userPersonality(g: GameState): PersonalityType {
  const id = g.user.playerId;
  return (id && g.players[id]?.persona.type) || "leal";
}

function typeOf(g: GameState, id: string): PersonalityType {
  if (id === USER_COACH_ID) return "lider";
  const p = g.players[id];
  if (p?.isUser) return userPersonality(g);
  return p?.persona.type ?? "leal";
}

export function getRel(g: GameState, a: string, b: string): Relation | undefined {
  return g.relations[pairKey(a, b)];
}

export function ensureRel(g: GameState, a: string, b: string): Relation {
  const k = pairKey(a, b);
  let r = g.relations[k];
  if (!r) {
    const rng = new Rng(hashSeed(g.seed, k));
    const pa = g.players[a];
    const pb = g.players[b];
    const comp = compatibility(typeOf(g, a), typeOf(g, b));
    const sameNation = pa && pb && pa.nation === pb.nation ? 8 : 0;
    const userInvolved = pa?.isUser || pb?.isUser || a === USER_COACH_ID || b === USER_COACH_ID;
    r = {
      a: k.split("|")[0],
      b: k.split("|")[1],
      friendship: Math.round(clamp(22 + comp * 14 + sameNation + rng.normal(0, 6), 5, 60)),
      trust: Math.round(clamp(30 + comp * 8 + rng.normal(0, 5), 5, 60)),
      chemistry: Math.round(clamp(8 + rng.normal(0, 4) + (sameNation ? 4 : 0), 0, 30)),
      rivalry: Math.round(clamp(6 - comp * 10 + rng.normal(0, 4), 0, 40)),
      minutes: 0,
      combos: 0,
      titles: 0,
      seasons: [g.season],
      lastDay: g.day,
      dailyDelta: 0,
      dailyDay: g.day,
    };
    if (userInvolved && a !== USER_COACH_ID && b !== USER_COACH_ID) r.friendship = Math.max(r.friendship, 25);
    g.relations[k] = r;
  }
  return r;
}

/** Variação limitada por dia, para conversas não virarem montanha-russa. */
export function bumpRel(g: GameState, a: string, b: string, d: Partial<Pick<Relation, "friendship" | "trust" | "chemistry" | "rivalry">>, cap = 8) {
  const r = ensureRel(g, a, b);
  if (r.dailyDay !== g.day) { r.dailyDay = g.day; r.dailyDelta = 0; }
  const room = Math.max(0, cap - r.dailyDelta);
  let used = 0;
  for (const k of ["friendship", "trust", "chemistry", "rivalry"] as const) {
    const v = d[k];
    if (!v) continue;
    const lim = Math.sign(v) * Math.min(Math.abs(v), room);
    r[k] = clamp(r[k] + lim, 0, 100);
    used = Math.max(used, Math.abs(lim));
  }
  r.dailyDelta += used;
  r.lastDay = g.day;
}

/** Bônus tático do entrosamento entre os 11 em campo (máx. ~3,5% no ataque). */
export function lineupChemistry(g: GameState, ids: string[]): { bonus: number; pairs: Record<string, number> } {
  const pairs: Record<string, number> = {};
  let bonus = 0;
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const r = g.relations[pairKey(ids[i], ids[j])];
      if (!r || r.chemistry < 45) continue;
      pairs[pairKey(ids[i], ids[j])] = r.chemistry;
      bonus += ((r.chemistry - 45) / 55) * 0.0035;
    }
  }
  for (const gr of g.groups) {
    if (!gr.active || !gr.members.every((m) => ids.includes(m))) continue;
    const lvl = { dupla: 0.003, promissor: 0.005, entrosado: 0.009, lendario: 0.013 }[gr.level];
    bonus += lvl * (gr.members.length === 3 ? 1.3 : 1);
  }
  return { bonus: Math.min(0.035, bonus), pairs };
}

export function squadWithUser(g: GameState, clubId: string): string[] {
  return g.clubs[clubId]?.squad ?? [];
}

/** Cria relações para todo o elenco do clube do usuário. */
export function ensureClubRelations(g: GameState) {
  const cid = g.user.clubId;
  if (!cid || !g.clubs[cid]) return;
  const squad = g.clubs[cid].squad;
  for (let i = 0; i < squad.length; i++) {
    for (let j = i + 1; j < squad.length; j++) {
      const r = ensureRel(g, squad[i], squad[j]);
      if (!r.seasons.includes(g.season)) r.seasons.push(g.season);
    }
    if (g.user.mode === "coach") ensureRel(g, USER_COACH_ID, squad[i]);
  }
}

/** Atualiza entrosamento depois de uma partida do clube do usuário. */
export function chemistryAfterMatch(g: GameState, lines: { playerId: string; minutes: number; started: boolean; side: 0 | 1 }[], side: 0 | 1, won: boolean, events: { type: string; playerId?: string; assistId?: string; side: 0 | 1 }[]) {
  const mine = lines.filter((l) => l.side === side && l.minutes > 0);
  for (let i = 0; i < mine.length; i++) {
    for (let j = i + 1; j < mine.length; j++) {
      const a = mine[i], b = mine[j];
      const shared = Math.min(a.minutes, b.minutes);
      const r = ensureRel(g, a.playerId, b.playerId);
      const comp = compatibility(typeOf(g, a.playerId), typeOf(g, b.playerId));
      const gain = (shared / 90) * 0.9 * (1 + comp * 0.3) * (1 - r.chemistry / 115);
      r.chemistry = clamp(r.chemistry + gain, 0, 100);
      r.minutes += shared;
      if (won) r.friendship = clamp(r.friendship + 0.25, 0, 100);
      r.lastDay = g.day;
    }
  }
  for (const e of events) {
    if (e.side !== side || !e.playerId || !e.assistId) continue;
    if (e.type !== "goal") continue;
    const r = ensureRel(g, e.playerId, e.assistId);
    r.combos++;
    r.chemistry = clamp(r.chemistry + 2.4 * (1 - r.chemistry / 130), 0, 100);
    r.friendship = clamp(r.friendship + 0.8, 0, 100);
    for (const gr of g.groups) {
      if (gr.active && gr.members.includes(e.playerId) && gr.members.includes(e.assistId)) { gr.goals++; gr.assists++; }
    }
  }
  const onPitch = new Set(mine.map((l) => l.playerId));
  for (const gr of g.groups) if (gr.active && gr.members.every((m) => onPitch.has(m))) gr.matches++;
}

/** Decaimento semanal leve para quem não joga junto. */
export function weeklyChemistryDecay(g: GameState) {
  for (const r of Object.values(g.relations)) {
    if (g.day - r.lastDay > 14) {
      r.chemistry = Math.max(5, r.chemistry - 0.35);
      r.rivalry = Math.max(0, r.rivalry - 0.2);
    }
  }
}

const LEVEL_ORDER: GroupLevel[] = ["dupla", "promissor", "entrosado", "lendario"];

function avgChem(g: GameState, members: string[]): number {
  let s = 0, n = 0;
  for (let i = 0; i < members.length; i++) for (let j = i + 1; j < members.length; j++) { s += getRel(g, members[i], members[j])?.chemistry ?? 0; n++; }
  return n ? s / n : 0;
}

function levelFor(g: GameState, gr: ChemGroup): GroupLevel {
  const c = avgChem(g, gr.members);
  const ga = gr.goals + gr.assists;
  if (c >= 86 && gr.titles >= 1 && ga >= 30) return "lendario";
  if (c >= 70 && ga >= 10) return "entrosado";
  if (gr.members.length === 3) {
    const young = gr.members.every((m) => { const p = g.players[m]; return p && (g.day - p.birth) / 364 <= 23.99; });
    if (young) return "promissor";
  }
  return gr.level === "promissor" && gr.members.length === 3 ? "promissor" : "dupla";
}

function initials(g: GameState, members: string[]): string {
  return members.map((m) => (g.players[m]?.last ?? "X").replace(/^(de |De |da |van )/, "").charAt(0).toUpperCase()).join("");
}

export function suggestGroupName(g: GameState, members: string[]): string {
  const rng = new Rng(hashSeed(g.seed, ...members));
  const club = g.players[members[0]]?.clubId ? g.clubs[g.players[members[0]].clubId!] : undefined;
  const ini = initials(g, members);
  if (members.length === 2) {
    const [a, b] = members.map((m) => g.players[m]?.first ?? "?");
    return rng.pick([`Dupla ${a} & ${b}`, `${a} e ${b}`, `Dupla ${ini}`, `Os Gêmeos de ${club?.city ?? "campo"}`]);
  }
  return rng.pick([`Trio ${ini}`, `${ini}`, `Bonde de ${club?.city ?? "ataque"}`, `Os Três de ${club?.city ?? "ouro"}`, `Trio Ternura`, `Tridente ${ini}`]);
}

export interface ChemEvent {
  kind: "formado" | "nivel" | "fim" | "reencontro";
  group: ChemGroup;
}

/** Detecta duplas/trios novos, evolução de nível, fim de uma era e reencontros. */
export function detectGroups(g: GameState): ChemEvent[] {
  const out: ChemEvent[] = [];
  const cid = g.user.clubId;
  // fim de era / reencontro para grupos existentes
  for (const gr of g.groups) {
    const clubs = new Set(gr.members.map((m) => g.players[m]?.clubId ?? "x"));
    const together = clubs.size === 1 && !clubs.has("x") && gr.members.every((m) => !g.players[m]?.retired);
    if (gr.active && !together) {
      gr.active = false;
      gr.endedDay = g.day;
      out.push({ kind: "fim", group: gr });
    } else if (!gr.active && together && gr.members.every((m) => g.players[m]?.clubId === cid)) {
      gr.active = true;
      gr.reunions++;
      gr.clubId = cid!;
      gr.clubName = g.clubs[cid!]?.name ?? gr.clubName;
      out.push({ kind: "reencontro", group: gr });
    }
  }
  if (!cid || !g.clubs[cid]) return out;
  const squad = g.clubs[cid].squad.filter((id) => g.players[id]?.pos !== "GOL");
  const inActive = new Set<string>();
  for (const gr of g.groups) if (gr.active) for (let i = 0; i < gr.members.length; i++) for (let j = i + 1; j < gr.members.length; j++) inActive.add(pairKey(gr.members[i], gr.members[j]));
  const activeHere = g.groups.filter((gr) => gr.active && gr.clubId === cid);
  // trios
  const strong: [string, string][] = [];
  for (let i = 0; i < squad.length; i++) for (let j = i + 1; j < squad.length; j++) {
    const r = getRel(g, squad[i], squad[j]);
    if (r && r.chemistry >= 52 && r.friendship >= 30) strong.push([squad[i], squad[j]]);
  }
  const strongSet = new Set(strong.map(([a, b]) => pairKey(a, b)));
  const trioCount = activeHere.filter((x) => x.members.length === 3).length;
  if (trioCount < 2) {
    let best: { m: string[]; score: number } | null = null;
    for (const [a, b] of strong) for (const c of squad) {
      if (c === a || c === b) continue;
      if (!strongSet.has(pairKey(a, c)) || !strongSet.has(pairKey(b, c))) continue;
      const m = [a, b, c].sort();
      if (g.groups.some((gr) => gr.members.length === 3 && m.every((x) => gr.members.includes(x)))) continue;
      if (activeHere.some((gr) => gr.members.length === 3 && gr.members.some((x) => m.includes(x)))) continue;
      const combos = (getRel(g, a, b)?.combos ?? 0) + (getRel(g, a, c)?.combos ?? 0) + (getRel(g, b, c)?.combos ?? 0);
      if (combos < 4) continue;
      const score = avgChem(g, m) + combos * 2;
      if (!best || score > best.score) best = { m, score };
    }
    if (best) {
      const gr = newGroup(g, best.m);
      for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) { const r = getRel(g, best.m[i], best.m[j]); if (r) { gr.goals += r.combos; gr.assists += r.combos; } }
      gr.level = levelFor(g, gr);
      g.groups.push(gr);
      out.push({ kind: "formado", group: gr });
    }
  }
  // duplas
  const duoCount = activeHere.filter((x) => x.members.length === 2).length;
  if (duoCount < 3) {
    const cands = strong
      .map(([a, b]) => ({ a, b, r: getRel(g, a, b)! }))
      .filter(({ a, b, r }) => r.chemistry >= 64 && r.friendship >= 38 && r.combos >= 3 && !inActive.has(pairKey(a, b)) && !g.groups.some((gr) => gr.members.length === 2 && gr.members.includes(a) && gr.members.includes(b)))
      .sort((x, y) => y.r.chemistry - x.r.chemistry);
    if (cands[0]) {
      const gr = newGroup(g, [cands[0].a, cands[0].b].sort());
      gr.goals = cands[0].r.combos; gr.assists = cands[0].r.combos;
      g.groups.push(gr);
      out.push({ kind: "formado", group: gr });
    }
  }
  // níveis
  for (const gr of g.groups) {
    if (!gr.active) continue;
    gr.peakChem = Math.max(gr.peakChem, avgChem(g, gr.members));
    if (!gr.seasons.includes(g.season)) gr.seasons.push(g.season);
    const lvl = levelFor(g, gr);
    if (LEVEL_ORDER.indexOf(lvl) > LEVEL_ORDER.indexOf(gr.level)) {
      gr.level = lvl;
      out.push({ kind: "nivel", group: gr });
    }
  }
  return out;
}

function newGroup(g: GameState, members: string[]): ChemGroup {
  const cid = g.user.clubId!;
  return {
    id: `grp${g.ids++}`,
    members,
    name: suggestGroupName(g, members),
    custom: false,
    level: members.length === 3 ? "promissor" : "dupla",
    clubId: cid,
    clubName: g.clubs[cid]?.name ?? "",
    formedDay: g.day,
    active: true,
    reunions: 0,
    matches: 0,
    goals: 0,
    assists: 0,
    titles: 0,
    seasons: [g.season],
    peakChem: avgChem(g, members),
  };
}

export function groupAvgChem(g: GameState, gr: ChemGroup) {
  return avgChem(g, gr.members);
}

export function levelLabel(l: GroupLevel, size: number): string {
  if (l === "dupla") return size === 2 ? "Dupla" : "Trio";
  if (l === "promissor") return "Trio Promissor";
  if (l === "entrosado") return size === 2 ? "Dupla Entrosada" : "Trio Entrosado";
  return size === 2 ? "Dupla Lendária" : "Trio Lendário";
}

export function friendsOf(g: GameState, meId: string): { id: string; rel: Relation; p: Player }[] {
  const out: { id: string; rel: Relation; p: Player }[] = [];
  for (const r of Object.values(g.relations)) {
    if (r.a !== meId && r.b !== meId) continue;
    const other = r.a === meId ? r.b : r.a;
    const p = g.players[other];
    if (p) out.push({ id: other, rel: r, p });
  }
  return out.sort((x, y) => y.rel.friendship - x.rel.friendship);
}
