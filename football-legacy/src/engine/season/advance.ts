/** Avanço do tempo: dia, semana ou até o próximo compromisso. */
import { INTL_BREAK_WEEKS, ROLLOVER_OFFSET, SEASON_WRAP_OFFSET } from "../constants";
import { detectGroups, levelLabel, weeklyChemistryDecay } from "../chemistry/relations";
import { processChatTriggers } from "../chat/triggers";
import { checkAchievements } from "../career/achievements";
import { weeklyCoachTick } from "../career/coach";
import { agentDaily, agentWeekly } from "../career/agent";
import { expireDecisions, maybeDecision } from "../career/decisions";
import { updateCallups, weeklyPlayerTick } from "../career/player";
import { createMatch, finalizeMatch, simulateToEnd, type MatchState } from "../match/engine";
import { aiRenewals, aiTransferWeek, expireOffers, isWindowOpen, offersForUserClub, resolveUserBids, signFreeAgents, userPlayerOffers } from "../market/transfers";
import { addNews } from "../news/news";
import { clamp, Rng } from "../rng";
import type { Fixture, GameState } from "../types";
import { marketValue } from "../world/players";
import { weeklyProgression } from "../world/progression";
import { applyMatchResult } from "./apply";
import { fixturesOn, nextUserFixture, userFixtureToday } from "./queries";
import { seasonStart, updateCompetitions } from "./schedule";
import { recordTitle, rollover, seasonWrap } from "./seasonEnd";

export type StopReason = "match" | "decision" | "summary" | "offer" | "retired" | "none" | "limit";

export interface AdvanceResult {
  stop: StopReason;
  fixtureId?: string;
  days: number;
}

export function withRng<T>(g: GameState, fn: (rng: Rng) => T): T {
  const rng = new Rng(g.rng);
  const out = fn(rng);
  g.rng = rng.state;
  return out;
}

export { fixturesOn, userFixtureToday, nextUserFixture } from "./queries";

export function commitMatch(g: GameState, fx: Fixture, ms: MatchState) {
  const result = finalizeMatch(g, ms);
  applyMatchResult(g, fx, ms, result);
}

export function playFixtureInstant(g: GameState, fx: Fixture) {
  const ms = createMatch(g, fx);
  simulateToEnd(g, ms);
  commitMatch(g, fx, ms);
}

function dailyTick(g: GameState, rng: Rng, playedToday: Set<string>) {
  for (const p of Object.values(g.players)) {
    if (p.retired) continue;
    if (p.injury) {
      p.injury.days--;
      if (p.injury.days <= 0) {
        p.injury = null;
        p.fitness = Math.min(p.fitness, 70);
        if (p.isUser) addNews(g, { title: "Liberado pelo departamento médico", body: "Você volta a treinar com o grupo.", tag: "lesao", importance: 2, playerIds: [p.id] });
      }
    }
    if (!playedToday.has(p.id)) {
      const club = p.clubId ? g.clubs[p.clubId] : undefined;
      p.fitness = clamp(p.fitness + 5 + p.attrs.res / 30 + (club?.facilities ?? 2) * 0.5, 0, 100);
    }
    p.morale += (62 - p.morale) * 0.015;
  }
  expireOffers(g);
  resolveUserBids(g);
  expireDecisions(g, rng);
  agentDaily(g, rng);
}

function weeklyTick(g: GameState, rng: Rng) {
  const week = Math.floor((g.day - seasonStart(g.season)) / 7);
  weeklyProgression(g, rng, week);
  if (isWindowOpen(g)) {
    aiTransferWeek(g, rng);
    signFreeAgents(g, rng);
    userPlayerOffers(g, rng);
    offersForUserClub(g, rng);
  } else if (g.user.mode === "player" && g.user.playerId && !g.players[g.user.playerId].clubId) {
    userPlayerOffers(g, rng);
  }
  if (week === 30) aiRenewals(g, rng);
  // salários
  for (const c of Object.values(g.clubs)) c.balance -= c.squad.reduce((s, id) => s + (g.players[id]?.contract.wage ?? 0), 0);
  weeklyPlayerTick(g, rng);
  weeklyCoachTick(g, rng);
  agentWeekly(g, rng);
  weeklyChemistryDecay(g);
  for (const ev of detectGroups(g)) {
    const gr = ev.group;
    const names = gr.members.map((m) => g.players[m]?.first ?? "?").join(", ");
    const label = levelLabel(gr.level, gr.members.length);
    const title = ev.kind === "formado" ? `Nasce ${gr.members.length === 3 ? "um trio" : "uma dupla"}: ${names}` : ev.kind === "nivel" ? `${gr.name} agora é ${label}` : ev.kind === "fim" ? `Fim de uma era: ${gr.name} se desfaz` : `Reencontro histórico: ${gr.name} volta a jogar junto`;
    const body = ev.kind === "fim" ? `${gr.goals} gols combinados em ${gr.seasons.length} temporada(s) juntos.` : `${gr.clubName} · entrosamento em alta, ${gr.goals} gols combinados.`;
    addNews(g, { title, body, tag: "quimica", importance: ev.kind === "nivel" && gr.level === "lendario" ? 3 : 2, playerIds: gr.members, clubIds: [gr.clubId] });
    g.celebrations.push({ groupId: gr.id, level: gr.level, kind: ev.kind, day: g.day });
    g.inbox.push({ t: "group", kind: ev.kind, groupId: gr.id });
  }
  maybeDecision(g, rng);
  if (INTL_BREAK_WEEKS.includes(week + 1) || week + 1 === 43) updateCallups(g, week + 1);
  for (const p of Object.values(g.players)) if (!p.retired) p.value = marketValue(p, g.season, g.day);
  checkAchievements(g);
}

/**
 * Processa o dia atual e avança para o próximo.
 * Para antes se houver partida do usuário ainda não jogada (a interface decide o modo).
 */
export function advanceDay(g: GameState, opts: { autoplayUser?: boolean } = {}): AdvanceResult {
  const pendingUser = userFixtureToday(g);
  if (pendingUser && !opts.autoplayUser) return { stop: "match", fixtureId: pendingUser.id, days: 0 };
  return withRng(g, (rng) => {
    const today = fixturesOn(g, g.day).filter((f) => !f.played);
    const playedToday = new Set<string>();
    for (const fx of today) {
      playFixtureInstant(g, fx);
      for (const l of fx.result!.lines) playedToday.add(l.playerId);
    }
    if (today.length) {
      const { finished } = updateCompetitions(g, rng);
      for (const c of finished) recordTitle(g, c);
    }
    dailyTick(g, rng, playedToday);
    const offset = g.day - seasonStart(g.season);
    if (offset % 7 === 2) weeklyTick(g, rng);
    let stop: StopReason = "none";
    if (offset === SEASON_WRAP_OFFSET) { seasonWrap(g, rng); stop = "summary"; }
    if (offset === ROLLOVER_OFFSET) rollover(g, rng);
    g.day++;
    processChatTriggers(g, rng);
    g.updatedAt = Date.now();
    return { stop, days: 1 };
  });
}

export type AdvanceMode = "dia" | "semana" | "proximo";

export function advance(g: GameState, mode: AdvanceMode): AdvanceResult {
  const startDay = g.day;
  const target = mode === "dia" ? g.day + 1 : mode === "semana" ? g.day + 7 : Infinity;
  const next = nextUserFixture(g);
  const limit = g.day + (mode === "proximo" ? Math.max(1, Math.min(60, next ? next.day - g.day : 60)) : 60);
  const decisionsBefore = new Set(g.decisions.map((d) => d.id));
  const offersBefore = new Set(g.offers.filter((o) => o.status === "pendente").map((o) => o.id));
  let res: AdvanceResult = { stop: "none", days: 0 };
  while (g.day < target && g.day < limit + 1) {
    if (g.user.retired && g.user.mode === "player") return { stop: "retired", days: g.day - startDay };
    const r = advanceDay(g);
    if (r.stop === "match") return { ...r, days: g.day - startDay };
    res = r;
    if (r.stop === "summary") break;
    if (g.decisions.some((d) => !decisionsBefore.has(d.id))) { res = { stop: "decision", days: 0 }; break; }
    if (g.offers.some((o) => o.status === "pendente" && o.direction === "user" && !offersBefore.has(o.id))) { res = { stop: "offer", days: 0 }; break; }
    if (mode === "proximo" && userFixtureToday(g)) return { stop: "match", fixtureId: userFixtureToday(g)!.id, days: g.day - startDay };
    if (mode === "proximo" && g.day >= limit) break;
  }
  return { ...res, days: g.day - startDay };
}
