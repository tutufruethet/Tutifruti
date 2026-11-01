/**
 * Motor de partidas minuto a minuto, baseado em probabilidades e atributos.
 * Determinístico: mesma semente + mesmas decisões = mesmo resultado.
 * Funciona em três modos: instantâneo (simulateToEnd), ao vivo (stepMinute em
 * intervalos) e interativo (o usuário altera tática/substitui ou decide lances).
 */
import { FORMATIONS } from "../constants";
import { lineupChemistry } from "../chemistry/relations";
import { clamp, hashSeed, Rng } from "../rng";
import type { Fixture, GameState, MatchEvent, MatchResult, Player, PlayerMatchLine, Pos, Tactic } from "../types";
import { posRating, shortName } from "../world/players";
import { teamName, teamShort } from "../season/schedule";
import { autoLineup, nationalSquad, prospectBonus, validateLineup } from "./lineup";

export interface SidePlayer {
  id: string;
  slot: Pos;
}

export interface Side {
  teamId: string;
  name: string;
  short: string;
  tactic: Tactic;
  xi: SidePlayer[];
  bench: string[];
  subsLeft: number;
  cohesion: number;
  chem: number;
  pairChem: Record<string, number>;
  home: boolean;
  ai: boolean;
  morale: number;
  r: { att: number; mid: number; def: number; gk: number };
}

interface LineAcc {
  side: 0 | 1;
  started: boolean;
  minIn: number;
  minOut: number | null;
  goals: number;
  assists: number;
  shots: number;
  sot: number;
  saves: number;
  yellow: number;
  red: boolean;
  injured: boolean;
  keyPasses: number;
}

export interface DecisionOpt {
  id: string;
  label: string;
  hint: string;
}

export interface PendingDecision {
  minute: number;
  text: string;
  q: number;
  mateId?: string;
  options: DecisionOpt[];
}

export interface MatchState {
  fixtureId: string;
  compId: string;
  homeId: string;
  awayId: string;
  knockout: boolean;
  neutral: boolean;
  derby: boolean;
  minute: number;
  finished: boolean;
  halftimeDone: boolean;
  rng: number;
  sides: [Side, Side];
  score: [number, number];
  pens?: [number, number];
  poss: [number, number];
  shots: [number, number];
  sot: [number, number];
  events: MatchEvent[];
  lines: Record<string, LineAcc>;
  fit: Record<string, number>;
  dayForm: [number, number];
  userPlayerId?: string;
  userSide: 0 | 1 | null;
  interactive: boolean;
  decisionsUsed: number;
  pending?: PendingDecision;
}

const P = (g: GameState, id: string): Player => g.players[id];

function fitFactor(fit: number) {
  return 0.78 + 0.22 * clamp(fit, 0, 100) / 100;
}

export function computeRatings(g: GameState, ms: MatchState, si: 0 | 1) {
  const s = ms.sides[si];
  const W: Record<Pos, [number, number, number]> = {
    // [def, mid, att]
    GOL: [0, 0, 0],
    ZAG: [1, 0.15, 0.05],
    LAT: [0.7, 0.35, 0.3],
    VOL: [0.6, 0.8, 0.15],
    MEI: [0.15, 1, 0.55],
    PON: [0.1, 0.45, 0.85],
    ATA: [0.03, 0.2, 1],
  };
  let d = 0, dw = 0, m = 0, mw = 0, a = 0, aw = 0, gk = 0;
  let hasGk = false;
  for (const sp of s.xi) {
    const p = P(g, sp.id);
    const r = posRating(p, sp.slot) * fitFactor(ms.fit[sp.id] ?? p.fitness) * (0.96 + 0.08 * (p.morale / 100));
    if (sp.slot === "GOL") { gk = r; hasGk = true; continue; }
    const [wd, wm, wa] = W[sp.slot];
    d += r * wd; dw += wd; m += r * wm; mw += wm; a += r * wa; aw += wa;
  }
  if (!hasGk) gk = 30;
  const n = s.xi.length;
  const shortF = Math.pow(n / 11, 0.8);
  let def = (dw ? d / dw : 40) * shortF;
  let mid = (mw ? m / mw : 40) * shortF;
  let att = (aw ? a / aw : 40) * shortF;
  const t = s.tactic;
  att *= 1 + 0.035 * t.mentality;
  def *= 1 - 0.028 * t.mentality;
  mid *= 1 + 0.015 * t.pressing;
  const coh = 0.97 + 0.06 * (s.cohesion / 100);
  att *= coh * (1 + s.chem);
  mid *= coh;
  def *= coh;
  if (s.home && !ms.neutral) { att *= 1.035; mid *= 1.03; def *= 1.01; }
  const f = ms.dayForm[si];
  s.r = { att: att * f, mid: mid * f, def: def * f, gk: gk * (0.98 + 0.04 * (f - 1) * 10) };
}

function buildSide(g: GameState, teamId: string, home: boolean, ai: boolean): Side {
  let tactic: Tactic;
  let lineup;
  let cohesion = 55;
  let morale = 60;
  if (teamId.startsWith("N-")) {
    const squad = nationalSquad(g, teamId.slice(2) as never);
    tactic = { formation: "4-3-3", mentality: 0, pressing: 1 };
    lineup = autoLineup(g, squad, tactic.formation);
    cohesion = 50;
  } else {
    const c = g.clubs[teamId];
    tactic = { ...c.tactic };
    const userCoach = g.user.mode === "coach" && g.user.clubId === teamId && !g.user.unemployed;
    lineup = userCoach ? validateLineup(g, c.squad, tactic.formation, c.lineup) : autoLineup(g, c.squad, tactic.formation);
    cohesion = c.cohesion;
  }
  const slots = FORMATIONS[tactic.formation] ?? FORMATIONS["4-3-3"];
  const xi = lineup.xi.map((id, i) => ({ id, slot: slots[i] ?? "MEI" }));
  morale = xi.reduce((s, x) => s + g.players[x.id].morale, 0) / Math.max(1, xi.length);
  const chem = teamId.startsWith("N-") ? { bonus: 0, pairs: {} } : lineupChemistry(g, xi.map((x) => x.id));
  return {
    teamId, name: teamName(g, teamId), short: teamShort(g, teamId), tactic, xi, bench: lineup.bench, subsLeft: 5,
    cohesion, chem: chem.bonus, pairChem: chem.pairs, home, ai, morale, r: { att: 0, mid: 0, def: 0, gk: 0 },
  };
}

export function createMatch(g: GameState, fx: Fixture, opts: { interactive?: boolean } = {}): MatchState {
  const userClub = g.user.clubId;
  const userPlayer = g.user.mode === "player" ? g.user.playerId : undefined;
  const userSide: 0 | 1 | null = g.user.mode === "coach" && !g.user.unemployed ? (fx.homeId === userClub ? 0 : fx.awayId === userClub ? 1 : null) : null;
  const rng = new Rng(hashSeed(g.seed, fx.id, "match"));
  const sides: [Side, Side] = [buildSide(g, fx.homeId, true, userSide !== 0), buildSide(g, fx.awayId, false, userSide !== 1)];
  const comp = g.comps[fx.compId];
  const ms: MatchState = {
    fixtureId: fx.id,
    compId: fx.compId,
    homeId: fx.homeId,
    awayId: fx.awayId,
    knockout: !!fx.tieId,
    neutral: !!fx.neutral,
    derby: !!g.clubs[fx.homeId]?.rivals.includes(fx.awayId),
    minute: 0,
    finished: false,
    halftimeDone: false,
    rng: 0,
    sides,
    score: [0, 0],
    poss: [0, 0],
    shots: [0, 0],
    sot: [0, 0],
    events: [],
    lines: {},
    fit: {},
    dayForm: [clamp(rng.normal(1, 0.055), 0.86, 1.14), clamp(rng.normal(1, 0.055), 0.86, 1.14)],
    userPlayerId: userPlayer,
    userSide,
    interactive: !!opts.interactive,
    decisionsUsed: 0,
  };
  sides.forEach((s, si) => {
    for (const x of s.xi) {
      ms.fit[x.id] = g.players[x.id].fitness;
      ms.lines[x.id] = newLine(si as 0 | 1, true, 0);
    }
    for (const b of s.bench) ms.fit[b] = g.players[b].fitness;
  });
  ms.rng = rng.state;
  computeRatings(g, ms, 0);
  computeRatings(g, ms, 1);
  const label = comp ? `${comp.name} · ${fx.round}` : fx.round;
  ms.events.push({ min: 0, type: "info", side: 0, text: `Bola rolando! ${sides[0].name} × ${sides[1].name}. ${label}.` });
  if (ms.derby) ms.events.push({ min: 0, type: "info", side: 0, text: "Clássico: clima pesado nas arquibancadas." });
  return ms;
}

function newLine(side: 0 | 1, started: boolean, minIn: number): LineAcc {
  return { side, started, minIn, minOut: null, goals: 0, assists: 0, shots: 0, sot: 0, saves: 0, yellow: 0, red: false, injured: false, keyPasses: 0 };
}

const SHOOT_W: Record<Pos, number> = { GOL: 0, ZAG: 0.45, LAT: 0.5, VOL: 0.8, MEI: 2, PON: 3, ATA: 5 };
const ASSIST_W: Record<Pos, number> = { GOL: 0.05, ZAG: 0.3, LAT: 1.4, VOL: 1, MEI: 3, PON: 2.6, ATA: 1.6 };
const FOUL_W: Record<Pos, number> = { GOL: 0.1, ZAG: 2, LAT: 1.4, VOL: 2.2, MEI: 1, PON: 0.7, ATA: 0.8 };

function pickShooter(g: GameState, rng: Rng, s: Side): SidePlayer {
  return rng.weighted(s.xi, (x) => SHOOT_W[x.slot] * Math.pow(P(g, x.id).attrs.fin / 60, 2) * (x.slot === "ZAG" ? P(g, x.id).attrs.cab / 60 : 1));
}

function pickAssist(g: GameState, rng: Rng, s: Side, scorerId: string): SidePlayer | null {
  const cands = s.xi.filter((x) => x.id !== scorerId);
  if (!cands.length) return null;
  return rng.weighted(cands, (x) => {
    const p = P(g, x.id);
    const key = scorerId < x.id ? `${scorerId}|${x.id}` : `${x.id}|${scorerId}`;
    const pc = s.pairChem[key] ?? 0;
    return ASSIST_W[x.slot] * Math.pow((p.attrs.pas + p.attrs.vis) / 130, 2) * (1 + pc / 45);
  });
}

const N = (g: GameState, id: string) => shortName(P(g, id));

const T = {
  goal: [
    "GOOOL! {p} finaliza e não dá chance pro goleiro!",
    "GOL! {p} aparece livre e manda pro fundo da rede!",
    "É GOL! {p} bate firme, no cantinho!",
    "GOOOOL! Que pintura de {p}!",
    "GOL! {p} empurra pra rede depois de bela jogada!",
  ],
  header: ["GOL DE CABEÇA! {p} sobe mais que todo mundo!", "GOL! Cabeçada certeira de {p}!"],
  assist: [" Passe de {a}.", " Assistência de {a}.", " Que bola de {a}!", " Cruzamento perfeito de {a}."],
  save: ["{k} faz grande defesa no chute de {p}!", "Que defesa! {k} espalma a finalização de {p}.", "{p} bate, {k} segura firme."],
  miss: ["{p} chuta por cima do travessão.", "Perdeu! {p} tinha tudo pra marcar e isola.", "{p} arrisca de longe, pra fora.", "Na trave! {p} quase marcou!"],
  yellow: ["Cartão amarelo para {p}.", "{p} chega atrasado e leva amarelo.", "Amarelo para {p} por reclamação."],
  red: ["EXPULSO! {p} recebe o vermelho direto!", "Vermelho para {p}! Entrada muito dura."],
  second: ["Segundo amarelo! {p} está fora do jogo."],
  injury: ["{p} sente a lesão e pede para sair.", "Preocupação: {p} cai no gramado sentindo dores."],
  pen: ["PÊNALTI! Falta dentro da área!"],
  penGoal: ["{p} cobra com categoria. GOL!", "{p} desloca o goleiro. GOL de pênalti!"],
  penMiss: ["{k} DEFENDE O PÊNALTI de {p}!", "{p} manda pra fora! Desperdiçou o pênalti."],
};

function fill(t: string, vars: Record<string, string>) {
  return t.replace(/\{(\w)\}/g, (_, k) => vars[k] ?? "");
}

function gkOf(s: Side): SidePlayer | undefined {
  return s.xi.find((x) => x.slot === "GOL");
}

function addGoal(g: GameState, ms: MatchState, rng: Rng, si: 0 | 1, scorerId: string, assistId: string | null, header: boolean, pen = false) {
  ms.score[si]++;
  ms.lines[scorerId].goals++;
  if (assistId) { ms.lines[assistId].assists++; }
  let text = pen ? fill(rng.pick(T.penGoal), { p: N(g, scorerId) }) : fill(rng.pick(header ? T.header : T.goal), { p: N(g, scorerId) });
  if (assistId) text += fill(rng.pick(T.assist), { a: N(g, assistId) });
  text += ` ${ms.sides[0].short} ${ms.score[0]}–${ms.score[1]} ${ms.sides[1].short}.`;
  ms.events.push({ min: ms.minute, type: pen ? "pen_goal" : "goal", side: si, playerId: scorerId, assistId: assistId ?? undefined, text });
}

function shotOutcome(g: GameState, ms: MatchState, rng: Rng, si: 0 | 1, shooterId: string, q: number, assistId: string | null, forceText = true) {
  const o = (1 - si) as 0 | 1;
  const opp = ms.sides[o];
  const p = P(g, shooterId);
  const gk = gkOf(opp);
  const gkR = opp.r.gk;
  ms.shots[si]++;
  ms.lines[shooterId].shots++;
  const header = rng.chance(0.18 + (p.attrs.cab - 50) / 300);
  const skill = header ? (p.attrs.cab * 0.7 + p.attrs.fin * 0.3) : p.attrs.fin * 0.8 + p.attrs.men * 0.2;
  const pGoal = clamp(q * (0.55 + skill / 100 * 0.85) * (1.32 - gkR / 100 * 0.62), 0.005, 0.85);
  if (rng.chance(pGoal)) {
    ms.sot[si]++;
    ms.lines[shooterId].sot++;
    addGoal(g, ms, rng, si, shooterId, assistId, header);
    return "goal";
  }
  if (rng.chance(0.36)) {
    ms.sot[si]++;
    ms.lines[shooterId].sot++;
    if (gk) ms.lines[gk.id].saves++;
    if (q > 0.16 || forceText) ms.events.push({ min: ms.minute, type: "save", side: si, playerId: shooterId, text: fill(rng.pick(T.save), { p: N(g, shooterId), k: gk ? N(g, gk.id) : "o goleiro" }) });
    return "save";
  }
  if (q > 0.2 || forceText) ms.events.push({ min: ms.minute, type: "chance", side: si, playerId: shooterId, text: fill(rng.pick(T.miss), { p: N(g, shooterId) }) });
  return "miss";
}

function removeFromPitch(ms: MatchState, si: 0 | 1, id: string) {
  const s = ms.sides[si];
  s.xi = s.xi.filter((x) => x.id !== id);
  ms.lines[id].minOut = ms.minute;
}

export function makeSub(g: GameState, ms: MatchState, si: 0 | 1, outId: string, inId: string): boolean {
  const s = ms.sides[si];
  if (s.subsLeft <= 0) return false;
  const idx = s.xi.findIndex((x) => x.id === outId);
  if (idx < 0 || !s.bench.includes(inId)) return false;
  const slot = s.xi[idx].slot;
  s.xi[idx] = { id: inId, slot };
  s.bench = s.bench.filter((b) => b !== inId);
  s.subsLeft--;
  ms.lines[outId].minOut = ms.minute;
  ms.lines[inId] = newLine(si, false, ms.minute);
  ms.events.push({ min: ms.minute, type: "sub", side: si, playerId: inId, outId, text: `Substituição no ${s.short}: entra ${N(g, inId)}, sai ${N(g, outId)}.` });
  computeRatings(g, ms, si);
  return true;
}

export function setTactic(g: GameState, ms: MatchState, si: 0 | 1, t: Partial<Tactic>) {
  const s = ms.sides[si];
  const before = s.tactic.formation;
  s.tactic = { ...s.tactic, ...t };
  if (t.formation && t.formation !== before) {
    // reposiciona os jogadores em campo nas novas vagas
    const slots = [...(FORMATIONS[t.formation] ?? FORMATIONS["4-3-3"])];
    const players = s.xi.map((x) => x.id);
    const assigned: SidePlayer[] = [];
    const freeSlots = [...slots];
    const gk = s.xi.find((x) => x.slot === "GOL");
    if (gk) { assigned.push({ id: gk.id, slot: "GOL" }); freeSlots.splice(freeSlots.indexOf("GOL"), 1); }
    for (const id of players) {
      if (gk && id === gk.id) continue;
      let bi = 0, bs = -1;
      freeSlots.forEach((sl, i) => { const r = posRating(P(g, id), sl); if (sl !== "GOL" && r > bs) { bs = r; bi = i; } });
      assigned.push({ id, slot: freeSlots[bi] });
      freeSlots.splice(bi, 1);
    }
    s.xi = assigned;
    ms.events.push({ min: ms.minute, type: "info", side: si, text: `${s.short} muda o esquema para ${t.formation}.` });
  }
  if (t.mentality !== undefined) {
    const label = ["muito defensivo", "defensivo", "equilibrado", "ofensivo", "tudo ao ataque"][t.mentality + 2];
    ms.events.push({ min: ms.minute, type: "info", side: si, text: `${s.short} passa a jogar de forma ${label}.` });
  }
  computeRatings(g, ms, si);
}

function aiManage(g: GameState, ms: MatchState, rng: Rng, si: 0 | 1) {
  const s = ms.sides[si];
  if (!s.ai) return;
  const diff = ms.score[si] - ms.score[1 - si];
  if (ms.minute === 70 && diff < 0 && s.tactic.mentality < 1) setTactic(g, ms, si, { mentality: (s.tactic.mentality + 1) as Tactic["mentality"] });
  if (ms.minute === 82 && diff === 1 && s.tactic.mentality > -1) setTactic(g, ms, si, { mentality: (s.tactic.mentality - 1) as Tactic["mentality"] });
  if ([58, 66, 72, 78, 84].includes(ms.minute) && s.subsLeft > 1 && rng.chance(0.75)) {
    // tira o mais cansado (ou o pior em campo) por alguém do banco que renda parecido
    const cand = [...s.xi].filter((x) => x.slot !== "GOL").sort((a, b) => (ms.fit[a.id] ?? 0) - (ms.fit[b.id] ?? 0) + (ms.lines[a.id].goals - ms.lines[b.id].goals) * 6)[0];
    if (cand) {
      const inId = bestBenchFor(g, s, cand.slot);
      const cur = posRating(P(g, cand.id), cand.slot) * fitFactor(ms.fit[cand.id] ?? 100);
      if (inId && posRating(P(g, inId), cand.slot) + prospectBonus(g, P(g, inId)) >= cur * 0.86) makeSub(g, ms, si, cand.id, inId);
    }
  }
}

function bestBenchFor(g: GameState, s: Side, slot: Pos): string | undefined {
  const sc = (id: string) => posRating(P(g, id), slot) + prospectBonus(g, P(g, id));
  return [...s.bench].filter((b) => (slot === "GOL") === (P(g, b).pos === "GOL")).sort((a, b) => sc(b) - sc(a))[0];
}

function userInvolved(g: GameState, ms: MatchState, rng: Rng, si: 0 | 1, shooter: SidePlayer): boolean {
  if (!ms.interactive || !ms.userPlayerId || ms.decisionsUsed >= 4) return false;
  const s = ms.sides[si];
  const me = s.xi.find((x) => x.id === ms.userPlayerId);
  if (!me) return false;
  if (shooter.id === me.id) return true;
  return ["MEI", "PON", "ATA"].includes(me.slot) && rng.chance(0.18);
}

/** Avança um minuto. Retorna false se ficou pendente de decisão ou acabou. */
export function stepMinute(g: GameState, ms: MatchState): boolean {
  if (ms.finished || ms.pending) return false;
  const rng = new Rng(ms.rng);
  ms.minute++;
  const m = ms.minute;
  const [h, a] = ms.sides;
  // fadiga
  for (const si of [0, 1] as const) {
    const s = ms.sides[si];
    for (const x of s.xi) {
      const p = P(g, x.id);
      const drain = (0.12 + s.tactic.pressing * 0.035) * (1.45 - p.attrs.res / 100) * (x.slot === "GOL" ? 0.3 : 1);
      ms.fit[x.id] = Math.max(5, (ms.fit[x.id] ?? 100) - drain);
    }
  }
  if (m % 5 === 0) { computeRatings(g, ms, 0); computeRatings(g, ms, 1); }
  // posse
  const pm = Math.pow(h.r.mid, 3) / (Math.pow(h.r.mid, 3) + Math.pow(a.r.mid, 3));
  const si: 0 | 1 = rng.chance(pm) ? 0 : 1;
  ms.poss[si]++;
  const att = ms.sides[si];
  const def = ms.sides[1 - si];
  const ratio = att.r.att / Math.max(20, def.r.def);
  const pChance = clamp(0.25 * Math.pow(ratio, 2.05), 0.04, 0.6);
  if (rng.chance(pChance) && att.xi.length) {
    if (rng.chance(0.012)) {
      // pênalti
      ms.events.push({ min: m, type: "info", side: si, text: rng.pick(T.pen) });
      const taker = [...att.xi].sort((x, y) => P(g, y.id).attrs.fin + P(g, y.id).attrs.men - P(g, x.id).attrs.fin - P(g, x.id).attrs.men)[0];
      const gk = gkOf(def);
      const conv = clamp(0.76 + (P(g, taker.id).attrs.fin - def.r.gk) / 250, 0.55, 0.92);
      ms.shots[si]++;
      ms.lines[taker.id].shots++;
      if (rng.chance(conv)) { ms.sot[si]++; ms.lines[taker.id].sot++; addGoal(g, ms, rng, si, taker.id, null, false, true); }
      else ms.events.push({ min: m, type: "pen_miss", side: si, playerId: taker.id, text: fill(rng.pick(T.penMiss), { p: N(g, taker.id), k: gk ? N(g, gk.id) : "o goleiro" }) });
    } else {
      const shooter = pickShooter(g, rng, att);
      const q = clamp(-Math.log(Math.max(1e-6, rng.next())) * 0.098, 0.02, 0.62);
      if (userInvolved(g, ms, rng, si, shooter)) {
        ms.rng = rng.state;
        openDecision(g, ms, rng, si, q);
        ms.rng = rng.state;
        return false;
      }
      const assist = rng.chance(0.74) ? pickAssist(g, rng, att, shooter.id) : null;
      const res = shotOutcome(g, ms, rng, si, shooter.id, q, assist?.id ?? null, false);
      if (assist && res !== "goal" && q > 0.15) ms.lines[assist.id].keyPasses++;
    }
  }
  // cartões
  for (const sj of [0, 1] as const) {
    const s = ms.sides[sj];
    const foulBase = 0.0185 * (ms.derby ? 1.35 : 1) * (1 + s.tactic.pressing * 0.12);
    if (s.xi.length > 7 && rng.chance(foulBase)) {
      const x = rng.weighted(s.xi, (x) => FOUL_W[x.slot] * (1.4 - P(g, x.id).attrs.men / 100));
      const l = ms.lines[x.id];
      if (rng.chance(0.045)) {
        l.red = true;
        ms.events.push({ min: m, type: "red", side: sj, playerId: x.id, text: fill(rng.pick(T.red), { p: N(g, x.id) }) });
        removeFromPitch(ms, sj, x.id);
        computeRatings(g, ms, sj);
      } else {
        l.yellow++;
        if (l.yellow >= 2) {
          l.red = true;
          ms.events.push({ min: m, type: "red", side: sj, playerId: x.id, text: fill(rng.pick(T.second), { p: N(g, x.id) }) });
          removeFromPitch(ms, sj, x.id);
          computeRatings(g, ms, sj);
        } else ms.events.push({ min: m, type: "yellow", side: sj, playerId: x.id, text: fill(rng.pick(T.yellow), { p: N(g, x.id) }) });
      }
    }
    // lesões
    if (rng.chance(0.0017) && s.xi.length) {
      const x = rng.pick(s.xi);
      ms.lines[x.id].injured = true;
      ms.events.push({ min: m, type: "injury", side: sj, playerId: x.id, text: fill(rng.pick(T.injury), { p: N(g, x.id) }) });
      const inId = bestBenchFor(g, s, x.slot);
      if (s.subsLeft > 0 && inId && s.ai) makeSub(g, ms, sj, x.id, inId);
      else if (!s.ai && s.subsLeft > 0 && inId && ms.userSide === sj) {
        // o usuário decide; deixa em campo com rendimento baixo
        ms.fit[x.id] = Math.min(ms.fit[x.id], 25);
      } else { removeFromPitch(ms, sj, x.id); computeRatings(g, ms, sj); }
    }
    aiManage(g, ms, rng, sj);
  }
  if (m === 45 && !ms.halftimeDone) {
    ms.halftimeDone = true;
    ms.events.push({ min: 45, type: "info", side: 0, text: `Intervalo: ${h.short} ${ms.score[0]}–${ms.score[1]} ${a.short}.` });
    for (const sj of [0, 1] as const) for (const x of ms.sides[sj].xi) ms.fit[x.id] = Math.min(100, ms.fit[x.id] + 4);
  }
  ms.rng = rng.state;
  if (m >= 90) {
    finishRegulation(g, ms);
    return false;
  }
  return true;
}

function openDecision(g: GameState, ms: MatchState, rng: Rng, si: 0 | 1, q: number) {
  const s = ms.sides[si];
  const me = P(g, ms.userPlayerId!);
  const mate = s.xi.filter((x) => x.id !== me.id && ["ATA", "PON", "MEI"].includes(x.slot)).sort((a, b) => P(g, b.id).attrs.fin - P(g, a.id).attrs.fin)[0];
  ms.decisionsUsed++;
  const quality = q > 0.25 ? "cara a cara com o goleiro" : q > 0.12 ? "na entrada da área" : "com espaço, de longe";
  const lvl = (v: number) => (v > 0.3 ? "chance alta" : v > 0.15 ? "chance média" : "chance baixa");
  const fin = me.attrs.fin / 100;
  const options: DecisionOpt[] = [
    { id: "colocado", label: "Bater colocado", hint: lvl(q * (0.6 + fin)) },
    { id: "forte", label: "Bater forte", hint: lvl(q * (0.45 + (me.attrs.fin + me.attrs.fis) / 200)) },
    { id: "driblar", label: "Driblar e finalizar", hint: lvl(q * 1.6 * (me.attrs.dri / 100)) },
  ];
  if (mate) options.push({ id: "tocar", label: `Tocar para ${N(g, mate.id)}`, hint: lvl(q * 1.3 * (0.55 + P(g, mate.id).attrs.fin / 100) * (me.attrs.pas / 90)) });
  ms.pending = { minute: ms.minute, text: `${ms.minute}' — A bola chega em você ${quality}. O que fazer?`, q, mateId: mate?.id, options };
  void rng;
}

export function resolveDecision(g: GameState, ms: MatchState, optId: string) {
  const pd = ms.pending;
  if (!pd) return;
  ms.pending = undefined;
  const rng = new Rng(ms.rng);
  const meId = ms.userPlayerId!;
  const me = P(g, meId);
  const si = (ms.sides[0].xi.some((x) => x.id === meId) ? 0 : 1) as 0 | 1;
  let q = pd.q;
  ms.events.push({ min: ms.minute, type: "decision", side: si, playerId: meId, text: `Você escolhe: ${pd.options.find((o) => o.id === optId)?.label ?? optId}.` });
  if (optId === "forte") q *= (0.45 + (me.attrs.fin + me.attrs.fis) / 200) / (0.55 + me.attrs.fin / 100 * 0.85) * 1.05;
  if (optId === "colocado") q *= 1.08;
  if (optId === "driblar") {
    if (rng.chance(me.attrs.dri / 100 * 0.75)) {
      ms.events.push({ min: ms.minute, type: "chance", side: si, playerId: meId, text: `${N(g, meId)} passa pelo marcador com um drible seco!` });
      q = Math.min(0.7, q * 2);
    } else {
      ms.events.push({ min: ms.minute, type: "chance", side: si, playerId: meId, text: `${N(g, meId)} tenta o drible e perde a bola.` });
      ms.rng = rng.state;
      return;
    }
  }
  if (optId === "tocar" && pd.mateId && ms.lines[pd.mateId]) {
    if (rng.chance(clamp(me.attrs.pas / 100 + 0.1, 0.4, 0.95))) {
      const res = shotOutcome(g, ms, rng, si, pd.mateId, Math.min(0.7, q * 1.3), meId, true);
      if (res !== "goal") ms.lines[meId].keyPasses++;
    } else {
      ms.events.push({ min: ms.minute, type: "chance", side: si, playerId: meId, text: `O passe de ${N(g, meId)} é interceptado.` });
    }
    ms.rng = rng.state;
    return;
  }
  shotOutcome(g, ms, rng, si, meId, q, null, true);
  ms.rng = rng.state;
}

function autoDecision(ms: MatchState): string {
  const pd = ms.pending!;
  const score = (h: string) => (h === "chance alta" ? 3 : h === "chance média" ? 2 : 1);
  return [...pd.options].sort((a, b) => score(b.hint) - score(a.hint))[0].id;
}

function finishRegulation(g: GameState, ms: MatchState) {
  if (ms.knockout && ms.score[0] === ms.score[1]) {
    const rng = new Rng(ms.rng);
    const pens: [number, number] = [0, 0];
    ms.events.push({ min: 90, type: "info", side: 0, text: "Empate no tempo normal. Decisão nos pênaltis!" });
    const takers = ms.sides.map((s) => [...s.xi].sort((x, y) => P(g, y.id).attrs.fin + P(g, y.id).attrs.men - (P(g, x.id).attrs.fin + P(g, x.id).attrs.men)));
    let round = 0;
    while (round < 30) {
      for (const si of [0, 1] as const) {
        const t = takers[si][round % Math.max(1, takers[si].length)];
        const gkR = ms.sides[1 - si].r.gk;
        const conv = clamp(0.75 + ((t ? P(g, t.id).attrs.fin : 60) - gkR) / 260, 0.55, 0.9);
        if (rng.chance(conv)) pens[si]++;
      }
      round++;
      if (round >= 5 && pens[0] !== pens[1]) break;
      if (round < 5) {
        const left = 5 - round;
        if (pens[0] > pens[1] + left || pens[1] > pens[0] + left) break;
      }
    }
    ms.pens = pens;
    const w = pens[0] > pens[1] ? 0 : 1;
    ms.events.push({ min: 90, type: "info", side: w as 0 | 1, text: `Pênaltis: ${ms.sides[0].short} ${pens[0]}–${pens[1]} ${ms.sides[1].short}. ${ms.sides[w].name} avança!` });
    ms.rng = rng.state;
  }
  ms.events.push({ min: 90, type: "info", side: 0, text: `Fim de jogo: ${ms.sides[0].name} ${ms.score[0]}–${ms.score[1]} ${ms.sides[1].name}.` });
  ms.finished = true;
}

export function simulateToEnd(g: GameState, ms: MatchState): MatchState {
  let guard = 0;
  while (!ms.finished && guard++ < 400) {
    if (ms.pending) resolveDecision(g, ms, autoDecision(ms));
    stepMinute(g, ms);
  }
  return ms;
}

/** Converte o estado final em resultado com notas individuais. */
export function finalizeMatch(g: GameState, ms: MatchState): MatchResult {
  const rng = new Rng(hashSeed(ms.rng, "ratings"));
  const lines: PlayerMatchLine[] = [];
  const avgOvr = [0, 1].map((si) => {
    const ids = Object.entries(ms.lines).filter(([, l]) => l.side === si).map(([id]) => g.players[id].ovr);
    return ids.reduce((a, b) => a + b, 0) / Math.max(1, ids.length);
  });
  for (const [id, l] of Object.entries(ms.lines)) {
    const p = g.players[id];
    const minutes = Math.max(0, (l.minOut ?? 90) - l.minIn);
    const mine = ms.score[l.side];
    const theirs = ms.score[1 - l.side];
    const slot = ms.sides[l.side].xi.find((x) => x.id === id)?.slot ?? p.pos;
    let r = 6.1 + l.goals * 0.95 + l.assists * 0.6 + l.sot * 0.12 + l.keyPasses * 0.18 + l.saves * 0.2 - l.yellow * 0.15 - (l.red ? 1.4 : 0);
    r += mine > theirs ? 0.35 : mine < theirs ? -0.3 : 0;
    if (["GOL", "ZAG", "LAT", "VOL"].includes(slot)) r += theirs === 0 ? 0.55 : -0.22 * theirs * (slot === "GOL" ? 1 : 0.7);
    r += (p.ovr - avgOvr[l.side]) / 22;
    r += rng.normal(0, 0.33);
    const w = Math.min(1, minutes / 60);
    r = 6.2 + (r - 6.2) * w;
    lines.push({ playerId: id, side: l.side, started: l.started, minutes, rating: Math.round(clamp(r, 3, 10) * 10) / 10, goals: l.goals, assists: l.assists });
  }
  const motm = [...lines].sort((a, b) => b.rating - a.rating)[0]?.playerId;
  const total = Math.max(1, ms.poss[0] + ms.poss[1]);
  const p0 = Math.round((ms.poss[0] / total) * 100);
  return {
    hg: ms.score[0], ag: ms.score[1], pens: ms.pens,
    poss: [p0, 100 - p0], shots: [...ms.shots], sot: [...ms.sot],
    events: ms.events.filter((e) => e.type !== "info" || e.min === 0 || e.min >= 45),
    lines, motm,
  };
}

export function simulateFixture(g: GameState, fx: Fixture): { ms: MatchState; result: MatchResult } {
  const ms = createMatch(g, fx);
  simulateToEnd(g, ms);
  return { ms, result: finalizeMatch(g, ms) };
}

/** Lesões e cartões da partida para aplicar ao estado. */
export function matchIncidents(ms: MatchState) {
  return Object.entries(ms.lines).map(([id, l]) => ({ id, injured: l.injured, red: l.red, yellow: l.yellow, fit: ms.fit[id] }));
}
