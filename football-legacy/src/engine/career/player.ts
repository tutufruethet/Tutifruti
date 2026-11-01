/** Modo jogador: treino, relação com o técnico, contrato, seleção, aposentadoria e legado. */
import { NATIONAL_TEAMS, INTL_BREAK_WEEKS } from "../constants";
import { nationalSquad } from "../match/lineup";
import { addNews, milestone } from "../news/news";
import { clamp, Rng } from "../rng";
import { seasonStart, sortTable, teamName } from "../season/schedule";
import type { GameState, Player } from "../types";
import { ageOf, avgRating, fairWage, formatMoney, fullName, roundMoney } from "../world/players";
import { rollInjury } from "../season/apply";

export const userPlayer = (g: GameState): Player | undefined => (g.user.playerId ? g.players[g.user.playerId] : undefined);

export function weeklyPlayerTick(g: GameState, rng: Rng) {
  const me = userPlayer(g);
  if (!me || g.user.mode !== "player" || me.retired) return;
  const { focus, intensity } = g.user.training;
  // salário vira patrimônio
  g.user.money += me.contract.wage;
  if (focus === "descanso") {
    me.fitness = clamp(me.fitness + 10, 0, 100);
    me.morale = clamp(me.morale + 2, 0, 100);
    g.user.coachRelation = clamp(g.user.coachRelation - 0.5, 0, 100);
  } else {
    me.fitness = clamp(me.fitness + (intensity === 0 ? 4 : intensity === 2 ? -6 : 0), 20, 100);
    g.user.coachRelation = clamp(g.user.coachRelation + (intensity === 2 ? 0.7 : intensity === 0 ? -0.4 : 0.1), 0, 100);
    const risk = [0.003, 0.007, 0.022][intensity] * (me.fitness < 60 ? 1.8 : 1);
    if (!me.injury && rng.chance(risk)) {
      const inj = rollInjury(rng);
      inj.days = Math.max(3, Math.round(inj.days * 0.6));
      me.injury = inj;
      addNews(g, { title: "Você se machuca no treino", body: `${inj.name}. Cerca de ${Math.ceil(inj.days / 7)} semana(s) fora.`, tag: "lesao", importance: 3, playerIds: [me.id] });
      g.inbox.push({ t: "injury", playerId: me.id, days: inj.days });
    }
  }
  if (g.user.lastBenchStreak >= 3) me.morale = clamp(me.morale - 3, 0, 100);
  g.user.coachRelation += (50 - g.user.coachRelation) * 0.01;
  // renovação de contrato oferecida pelo clube
  const week = Math.floor((g.day - seasonStart(g.season)) / 7);
  if (me.clubId && me.contract.until <= g.season && week >= 22 && week <= 36 && !g.decisions.some((d) => d.kind === "renovacao") && !g.offers.some((o) => o.direction === "user" && o.note === "renovacao")) {
    const club = g.clubs[me.clubId];
    const wage = roundMoney(Math.max(me.contract.wage * 1.1, fairWage(me, g.day)), 100);
    const years = ageOf(me, g.day) >= 31 ? 2 : 3;
    const playing = me.stats.starts >= me.stats.apps * 0.5;
    if (playing || rng.chance(0.5)) {
      g.decisions.push({
        id: `d${g.ids++}`, kind: "renovacao", day: g.day, expires: g.day + 10,
        title: `${club.name} quer renovar seu contrato`,
        body: `Proposta: ${formatMoney(wage)}/sem por ${years} temporadas. Seu contrato acaba no fim desta temporada.`,
        options: [
          { id: "pedir_mais", label: "Pedir 20% a mais", hint: "o clube pode recusar" },
          { id: "recusar", label: "Recusar e sair de graça", hint: "vira agente livre no fim da temporada" },
          { id: "aceitar", label: "Aceitar renovação", hint: `${formatMoney(wage)}/sem` },
        ],
        data: { wage, years, clubId: club.id },
      });
    }
  }
}

/** Convocações: antes de cada data FIFA e da Copa das Nações. */
export function updateCallups(g: GameState, week: number) {
  const before = INTL_BREAK_WEEKS.includes(week) || (week === 43 && !!g.comps["NACOES"]);
  if (!before) return;
  const me = userPlayer(g);
  const prev = new Set(g.callups);
  g.callups = NATIONAL_TEAMS.flatMap((n) => nationalSquad(g, n));
  if (me && g.user.mode === "player" && g.callups.includes(me.id)) {
    if (!prev.has(me.id) || week === 43) {
      const nation = g.nations[me.nation];
      addNews(g, {
        title: week === 43 ? `Você está na lista da ${nation.name} para a Copa das Nações` : `Convocado! ${nation.coach} chama você para a seleção ${nation.adj === "brasileiro" ? "brasileira" : "da " + nation.name}`,
        body: `${nation.name} entra em campo ${week === 43 ? "na Copa das Nações" : "em amistoso nesta data FIFA"}.`,
        tag: "selecao", importance: 3, playerIds: [me.id],
      });
      g.inbox.push({ t: "callup", playerId: me.id });
      if (me.intl.caps === 0) milestone(g, `Primeira convocação pela ${nation.name}`);
    }
  }
}

export function playerSeasonEnd(g: GameState, rng: Rng) {
  const me = userPlayer(g);
  if (!me || g.user.mode !== "player") return;
  void rng;
  const club = me.clubId ? g.clubs[me.clubId] : undefined;
  const lg = club ? g.comps[club.leagueId] : undefined;
  let pos = 0;
  if (lg) { sortTable(lg.table); pos = lg.table.findIndex((r) => r.clubId === club!.id) + 1; }
  const trophies = g.history.champions.filter((c) => c.season === g.season && (c.winnerId === me.clubId || (c.winnerId === `N-${me.nation}` && g.callups.includes(me.id)))).map((c) => c.compName);
  const awards = g.history.awards.filter((a) => a.season === g.season && a.playerId === me.id).map((a) => a.award);
  g.history.userSeasons.unshift({
    season: g.season, clubName: club?.name ?? "Sem clube", league: lg?.name ?? "—", pos,
    apps: me.stats.apps, goals: me.stats.goals, assists: me.stats.assists, rating: Math.round(avgRating(me) * 100) / 100, ovr: me.ovr, trophies, awards,
  });
  g.user.legacyScore = legacyScore(g);
  // records pessoais
  const best = g.history.records.find((r) => r.label === "Mais gols numa temporada");
  if (!best || me.stats.goals > best.value) {
    g.history.records = g.history.records.filter((r) => r.label !== "Mais gols numa temporada");
    g.history.records.push({ label: "Mais gols numa temporada", value: me.stats.goals, holder: fullName(me), season: g.season });
  }
  const age = ageOf(me, g.day);
  if (age >= 33 && !g.decisions.some((d) => d.kind === "aposentadoria")) {
    g.decisions.push({
      id: `d${g.ids++}`, kind: "aposentadoria", day: g.day, expires: g.day + 40,
      title: age >= 39 ? "Hora de pendurar as chuteiras?" : "Pensando no futuro",
      body: age >= 39 ? "O corpo já pede descanso. Você pode encerrar a carreira agora ou tentar mais uma temporada." : `Aos ${age} anos, você pode seguir jogando ou anunciar a aposentadoria.`,
      options: [{ id: "aposentar", label: "Anunciar aposentadoria", hint: "encerra a carreira e entra no Hall da Fama" }, { id: "continuar", label: "Seguir jogando" }],
    });
  }
}

export function legacyScore(g: GameState): number {
  const me = userPlayer(g);
  const titles = g.history.milestones.filter((m) => m.text.startsWith("Título")).length;
  const awards = g.history.awards.filter((a) => g.user.mode === "player" ? a.playerId === g.user.playerId : a.name === g.user.name).length;
  if (g.user.mode === "player" && me) {
    const goals = me.career.reduce((s, c) => s + c.goals, 0) + me.stats.goals;
    const apps = me.career.reduce((s, c) => s + c.apps, 0) + me.stats.apps;
    const peak = Math.max(me.ovr, ...me.career.map((c) => c.ovr));
    return Math.round(goals * 2 + apps * 0.5 + titles * 25 + awards * 40 + me.intl.caps * 1.5 + Math.max(0, peak - 60) * 8);
  }
  const r = g.user.coachRecord;
  return Math.round(r.w * 2 + r.d * 0.5 + titles * 30 + awards * 40 + g.user.reputation * 3);
}

export function retireUser(g: GameState) {
  const me = userPlayer(g);
  if (me) {
    me.retired = true;
    if (me.clubId) {
      const c = g.clubs[me.clubId];
      c.squad = c.squad.filter((id) => id !== me.id);
      me.clubId = null;
    }
    addNews(g, { title: `${fullName(me)} se aposenta`, body: `Fim de uma carreira com ${me.career.reduce((s, c) => s + c.goals, 0)} gols e ${g.history.milestones.filter((m) => m.text.startsWith("Título")).length} títulos.`, tag: "carreira", importance: 3, playerIds: [me.id] });
  }
  g.user.legacyScore = legacyScore(g);
  g.user.retired = true;
  milestone(g, "Aposentadoria");
}

export function benchReason(g: GameState): string | null {
  const me = userPlayer(g);
  if (!me || !me.clubId) return null;
  if (me.injury) return `Lesionado: ${me.injury.name} (${me.injury.days} dias)`;
  if (me.suspended > 0) return `Suspenso por ${me.suspended} jogo(s)`;
  return null;
}

export function clubOf(g: GameState) {
  return g.user.clubId ? g.clubs[g.user.clubId] : undefined;
}

export { teamName };
