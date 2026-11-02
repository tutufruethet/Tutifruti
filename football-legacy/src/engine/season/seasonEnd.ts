/** Fim de temporada: prêmios, histórico, acesso/rebaixamento, aposentadorias, base e virada. */
import { NATIONS } from "../constants";
import { ensureClubRelations } from "../chemistry/relations";
import { addNews, milestone } from "../news/news";
import { clamp, Rng } from "../rng";
import type { AwardEntry, Club, Competition, GameState, Player } from "../types";
import { ageOf, avgRating, createPlayer, emptyStats, fairWage, fullName, marketValue, roundMoney } from "../world/players";
import { aiRenewals, releasePlayer, signFreeAgents } from "../market/transfers";
import { buildSeason, previousRanking, sortTable, teamName } from "./schedule";
import { checkAchievements } from "../career/achievements";
import { startCoachSeason, evaluateCoachSeason } from "../career/coach";
import { playerSeasonEnd } from "../career/player";

/** Registra um título conquistado. */
export function recordTitle(g: GameState, comp: Competition) {
  if (!comp.winnerId) return;
  const winnerName = teamName(g, comp.winnerId);
  g.history.champions.unshift({
    season: g.season, compId: comp.id, compName: comp.name, winnerId: comp.winnerId, winnerName,
    runnerUpName: comp.runnerUpId ? teamName(g, comp.runnerUpId) : undefined,
  });
  const club = g.clubs[comp.winnerId];
  const squad = club ? club.squad : comp.isNationalTeams ? [] : [];
  if (club) club.trophies[comp.name] = (club.trophies[comp.name] ?? 0) + 1;
  if (club) {
    club.reputation = clamp(club.reputation + Math.round(comp.prestige / 3), 0, 99);
    club.balance += comp.prestige * 1_500_000;
    for (const id of squad) {
      const p = g.players[id];
      if (!p) continue;
      p.trophies.push(`${comp.name} ${2026 + g.season}/${(27 + g.season) % 100}`);
      p.morale = clamp(p.morale + 10, 0, 100);
      p.reputation = clamp(p.reputation + comp.prestige / 4, 0, 100);
    }
  }
  if (comp.isNationalTeams) {
    const nation = comp.winnerId.slice(2);
    for (const p of Object.values(g.players)) if (p.nation === nation && g.callups.includes(p.id)) p.trophies.push(`${comp.name} ${2027 + g.season}`);
  }
  // grupos de química ganham título junto
  for (const gr of g.groups) if (gr.active && club && gr.members.every((m) => club.squad.includes(m))) gr.titles++;
  const userIn = club?.id === g.user.clubId || (comp.isNationalTeams && g.user.playerId && g.callups.includes(g.user.playerId) && `N-${g.players[g.user.playerId].nation}` === comp.winnerId);
  g.inbox.push({ t: "title", compId: comp.id, clubId: comp.winnerId });
  if (comp.runnerUpId && (comp.runnerUpId === g.user.clubId)) g.inbox.push({ t: "final_lost", compId: comp.id, clubId: comp.runnerUpId });
  const firstEver = club && (club.trophies[comp.name] ?? 0) === 1 && (comp.type === "continental" || comp.type === "intercontinental");
  addNews(g, {
    title: firstEver ? `Realização histórica: ${winnerName} conquista seu primeiro título da ${comp.name}` : userIn ? `É CAMPEÃO! ${winnerName} vence a ${comp.name}` : `${winnerName} é campeão da ${comp.name}`,
    body: comp.runnerUpId ? `Vice: ${teamName(g, comp.runnerUpId)}.` : "",
    tag: "titulo", importance: userIn ? 3 : comp.prestige >= 7 ? 2 : 1, clubIds: [comp.winnerId],
  });
  if (userIn) milestone(g, `Título: ${comp.name} ${2026 + g.season}/${(27 + g.season) % 100}`);
}

function score(p: Player): number {
  return avgRating(p) * 10 + p.stats.goals * 0.55 + p.stats.assists * 0.35 + p.stats.motm * 0.4 + (p.pos === "GOL" || p.pos === "ZAG" ? p.stats.cleanSheets * 0.35 : 0);
}

export function computeAwards(g: GameState): AwardEntry[] {
  const out: AwardEntry[] = [];
  const s = g.season;
  const players = Object.values(g.players).filter((p) => !p.retired && p.clubId);
  const push = (award: string, p: Player | undefined, detail: string) => {
    if (!p) return;
    out.push({ season: s, award, playerId: p.id, name: fullName(p), clubName: teamName(g, p.clubId ?? ""), detail });
    p.trophies.push(`${award} ${2026 + s}/${(27 + s) % 100}`);
    p.reputation = clamp(p.reputation + 3, 0, 100);
  };
  const topLeagues = Object.values(g.comps).filter((c) => c.type === "league" && c.tier === 1);
  for (const lg of topLeagues) {
    const inLeague = players.filter((p) => g.clubs[p.clubId!]?.leagueId === lg.id);
    const scorer = [...inLeague].sort((a, b) => (b.compStats[lg.id]?.g ?? 0) - (a.compStats[lg.id]?.g ?? 0))[0];
    push(`Artilheiro · ${lg.name}`, scorer, `${scorer?.compStats[lg.id]?.g ?? 0} gols`);
    const best = inLeague.filter((p) => p.stats.apps >= 15).sort((a, b) => score(b) - score(a))[0];
    push(`Craque · ${lg.name}`, best, best ? `nota ${avgRating(best).toFixed(2)}, ${best.stats.goals} gols` : "");
    const young = inLeague.filter((p) => ageOf(p, g.day) <= 21 && p.stats.apps >= 10).sort((a, b) => score(b) - score(a))[0];
    push(`Revelação · ${lg.name}`, young, young ? `${ageOf(young, g.day)} anos, nota ${avgRating(young).toFixed(2)}` : "");
  }
  // mundiais
  const elite = players.filter((p) => { const c = g.clubs[p.clubId!]; return c && g.comps[c.leagueId]?.tier === 1 && p.stats.apps >= 15; });
  const contBonus = (p: Player) => (p.compStats["CONT-EU"]?.g ?? 0) * 0.6 + (p.compStats["CONT-AS"]?.g ?? 0) * 0.5 + p.trophies.filter((t) => t.includes(String(2026 + s))).length * 2 + p.reputation / 30;
  const ballon = [...elite].sort((a, b) => score(b) + contBonus(b) - (score(a) + contBonus(a)))[0];
  push("Bola de Ouro Legacy", ballon, ballon ? `${ballon.stats.goals} gols, ${ballon.stats.assists} assistências` : "");
  const boot = [...players].sort((a, b) => b.stats.goals - a.stats.goals)[0];
  push("Chuteira de Ouro", boot, `${boot?.stats.goals ?? 0} gols na temporada`);
  const rev = players.filter((p) => ageOf(p, g.day) <= 21 && p.stats.apps >= 12).sort((a, b) => score(b) + b.potential / 10 - (score(a) + a.potential / 10))[0];
  push("Revelação Mundial", rev, rev ? `${ageOf(rev, g.day)} anos` : "");
  // treinador: maior superação em relação ao esperado
  let bestCoach: { club: Club; diff: number } | null = null;
  for (const lg of Object.values(g.comps).filter((c) => c.type === "league")) {
    const byRep = [...lg.teamIds].sort((a, b) => g.clubs[b].reputation - g.clubs[a].reputation);
    sortTable(lg.table);
    lg.table.forEach((row, i) => {
      const exp = byRep.indexOf(row.clubId);
      const diff = exp - i + (i === 0 ? 3 : 0) + (lg.tier === 1 ? 1 : -2);
      if (!bestCoach || diff > bestCoach.diff) bestCoach = { club: g.clubs[row.clubId], diff };
    });
  }
  if (bestCoach) {
    const bc = bestCoach as { club: Club; diff: number };
    const isUser = g.user.mode === "coach" && g.user.clubId === bc.club.id && !g.user.unemployed;
    out.push({ season: s, award: "Treinador do Ano", name: isUser ? g.user.name : bc.club.coachName, clubName: bc.club.name, detail: `superou a expectativa em ${bc.diff} posições` });
    if (isUser) { g.user.reputation = clamp(g.user.reputation + 6, 0, 100); milestone(g, `Prêmio: Treinador do Ano ${2026 + s}/${(27 + s) % 100}`); }
  }
  g.history.awards.unshift(...out);
  for (const a of out) {
    if (a.award === "Bola de Ouro Legacy" || a.award === "Treinador do Ano" || g.players[a.playerId ?? ""]?.isUser) {
      addNews(g, { title: `${a.award}: ${a.name}`, body: `${a.clubName} · ${a.detail}.`, tag: "premio", importance: g.players[a.playerId ?? ""]?.isUser ? 3 : 2, playerIds: a.playerId ? [a.playerId] : [] });
    }
    if (g.players[a.playerId ?? ""]?.isUser) milestone(g, `Prêmio: ${a.award}`);
  }
  return out;
}

/** Semana 42: fecha a temporada esportiva (prêmios, histórico). */
export function seasonWrap(g: GameState, rng: Rng) {
  if (g.seasonSummary?.season === g.season) return;
  const awards = computeAwards(g);
  const promoted: string[] = [];
  const relegated: string[] = [];
  for (const lg of Object.values(g.comps).filter((c) => c.type === "league")) {
    sortTable(lg.table);
    lg.table.forEach((row, i) => {
      const c = g.clubs[row.clubId];
      c.seasonsHistory.push({ season: g.season, leagueId: lg.id, pos: i + 1 });
      // reputação acompanha o desempenho
      const exp = [...lg.teamIds].sort((a, b) => g.clubs[b].reputation - g.clubs[a].reputation).indexOf(c.id);
      c.reputation = clamp(c.reputation + (exp - i) * 0.4, 3, 99);
    });
    if (lg.relegate) lg.table.slice(-lg.relegate).forEach((r) => relegated.push(r.clubId));
    if (lg.promote) lg.table.slice(0, lg.promote).forEach((r) => promoted.push(r.clubId));
  }
  // registra jogadores e técnico do usuário
  if (g.user.mode === "coach") evaluateCoachSeason(g, rng, promoted, relegated);
  playerSeasonEnd(g, rng);
  const champions = g.history.champions.filter((c) => c.season === g.season).map((c) => ({ comp: c.compName, club: c.winnerName }));
  g.seasonSummary = {
    season: g.season,
    champions,
    awards: awards.map((a) => ({ award: a.award, name: a.name, club: a.clubName, detail: a.detail })),
    userLine: g.history.userSeasons[0]?.season === g.season ? "" : "",
    promoted: promoted.map((id) => g.clubs[id].name),
    relegated: relegated.map((id) => g.clubs[id].name),
  };
  g.user.pendingSummary = g.season;
  for (const id of promoted) addNews(g, { title: `${g.clubs[id].name} conquista o acesso!`, body: `O clube jogará a primeira divisão em ${2027 + g.season}/${(28 + g.season) % 100}.`, tag: "liga", importance: id === g.user.clubId ? 3 : 1, clubIds: [id] });
  for (const id of relegated) addNews(g, { title: `${g.clubs[id].name} é rebaixado`, body: "Temporada para esquecer.", tag: "liga", importance: id === g.user.clubId ? 3 : 1, clubIds: [id] });
  checkAchievements(g);
}

/** Último dia: vira a temporada. */
export function rollover(g: GameState, rng: Rng) {
  const s = g.season;
  const summary = g.seasonSummary;
  // acesso e rebaixamento
  if (summary) {
    for (const n of NATIONS) {
      if (n.leagues.length < 2) continue;
      const l1 = `L-${n.id}-1`, l2 = `L-${n.id}-2`;
      const down = Object.values(g.clubs).filter((c) => c.leagueId === l1 && summary.relegated.includes(c.name));
      const up = Object.values(g.clubs).filter((c) => c.leagueId === l2 && summary.promoted.includes(c.name));
      down.forEach((c) => (c.leagueId = l2));
      up.forEach((c) => (c.leagueId = l1));
    }
  }
  // linhas de carreira e reset de estatísticas
  for (const p of Object.values(g.players)) {
    if (p.retired) continue;
    if (p.stats.apps > 0 || p.isUser) {
      p.career.push({ season: s, clubId: p.clubId, clubName: p.clubId ? g.clubs[p.clubId].name : "Sem clube", apps: p.stats.apps, goals: p.stats.goals, assists: p.stats.assists, rating: Math.round(avgRating(p) * 100) / 100, ovr: p.ovr, value: p.value });
      if (p.career.length > 25) p.career.shift();
    }
    p.stats = emptyStats();
    p.compStats = {};
    p.yellowAcc = 0;
    p.suspended = 0;
    p.fitness = 100;
  }
  g.season = s + 1;
  // contratos vencidos e aposentadorias
  for (const p of Object.values(g.players)) {
    if (p.retired || p.isUser) continue;
    const age = ageOf(p, g.day);
    const retire = (age >= 37 && rng.chance(0.85)) || (age >= 35 && rng.chance(0.45)) || (age >= 33 && p.ovr < 62 && rng.chance(0.4)) || (!p.clubId && age >= 32 && rng.chance(0.6));
    if (retire) {
      if (p.clubId) releasePlayer(g, p.id);
      p.retired = true;
      if (p.reputation >= 80) addNews(g, { title: `${fullName(p)} anuncia aposentadoria`, body: `Aos ${age} anos, encerra a carreira com ${p.trophies.length} conquistas.`, tag: "carreira", importance: 1, playerIds: [p.id] });
      continue;
    }
    if (p.clubId && p.contract.until < g.season) releasePlayer(g, p.id);
  }
  // contrato do usuário (modo jogador) acabou: vira agente livre e recebe propostas
  const up = g.user.mode === "player" && g.user.playerId ? g.players[g.user.playerId] : undefined;
  if (up && !up.retired && up.clubId && up.contract.until < g.season) {
    const old = g.clubs[up.clubId];
    releasePlayer(g, up.id);
    g.user.clubId = null;
    g.user.wantsTransfer = true;
    addNews(g, { title: "Você está livre no mercado", body: `Seu contrato com o ${old.name} terminou. Propostas devem chegar nos próximos dias.`, tag: "carreira", importance: 3, playerIds: [up.id] });
  }
  // remove aposentados sem importância para manter o save leve
  for (const p of Object.values(g.players)) {
    if (!p.retired) continue;
    const keep = p.reputation >= 70 || g.relations && Object.keys(g.relations).some((k) => k.includes(p.id)) || g.groups.some((gr) => gr.members.includes(p.id));
    if (!keep) delete g.players[p.id];
  }
  // base: jovens promessas
  for (const c of Object.values(g.clubs)) {
    const n = rng.int(2, 3 + (c.academy >= 4 ? 1 : 0));
    for (let i = 0; i < n; i++) {
      const age = rng.int(16, 17);
      const pos = rng.pick(["GOL", "ZAG", "LAT", "VOL", "MEI", "PON", "ATA", "ATA", "MEI", "PON"] as const);
      const ovr = clamp(rng.normal(44 + c.academy * 2.2, 4), 36, 62);
      let pot = clamp(rng.normal(64 + c.academy * 3, 8), ovr + 6, 95);
      if (rng.chance(0.015 * c.academy)) pot = clamp(pot + rng.int(8, 15), 0, 96);
      const p = createPlayer(g, rng, { nation: c.nation, pos, age, ovr, potential: pot, clubId: c.id });
      p.contract = { wage: roundMoney(fairWage(p, g.day) * 0.6, 100), until: g.season + 3 };
      p.persona.hometown = c.city;
      p.clubs.push({ clubId: c.id, clubName: c.name, season: g.season, fee: 0 });
      c.squad.push(p.id);
      if (pot >= 86) {
        p.reputation = clamp(p.reputation + 15, 0, 100);
        addNews(g, { title: `Promessa ${g.nations[p.nation].adj} de ${age} anos chama atenção de clubes europeus`, body: `${fullName(p)}, da base do ${c.name}, é tratado como joia rara (${p.pos}).`, tag: "promessa", importance: 2, playerIds: [p.id], clubIds: [c.id] });
      }
    }
    // corte de excesso (IA)
    const userManaged = g.user.mode === "coach" && g.user.clubId === c.id;
    if (!userManaged && c.squad.length > 30) {
      const sorted = c.squad.map((id) => g.players[id]).sort((a, b) => a.ovr + (a.potential - a.ovr) * 0.5 - (b.ovr + (b.potential - b.ovr) * 0.5));
      for (const p of sorted.slice(0, c.squad.length - 28)) releasePlayer(g, p.id);
    }
  }
  // finanças: cotas de TV e orçamento
  for (const c of Object.values(g.clubs)) {
    const lg = g.comps[c.leagueId];
    const tv = Math.pow(1.13, (lg?.prestige ?? 5) * 2) * 900_000 + c.reputation * 120_000;
    const wages = c.squad.reduce((s2, id) => s2 + (g.players[id]?.contract.wage ?? 0), 0);
    c.balance += tv;
    c.transferBudget = roundMoney(Math.max(c.balance * 0.35, tv * 0.3));
    c.wageBudget = roundMoney(Math.max(wages * 1.1, tv / 52 * 0.7));
    c.coachPressure = clamp(c.coachPressure - 20, 0, 100);
  }
  // limpa agentes livres antigos
  const free = Object.values(g.players).filter((p) => !p.clubId && !p.retired && !p.isUser);
  if (free.length > 160) free.sort((a, b) => a.ovr - b.ovr).slice(0, free.length - 160).forEach((p) => { if (!Object.keys(g.relations).some((k) => k.includes(p.id))) delete g.players[p.id]; });
  for (const p of Object.values(g.players)) p.value = marketValue(p, g.season, g.day);
  signFreeAgents(g, rng);
  // nova temporada
  for (const f of Object.keys(g.fixtures)) delete g.fixtures[f];
  g.lastResults = [];
  g.offers = g.offers.filter((o) => o.status === "pendente" && o.expires > g.day);
  buildSeason(g, rng);
  if (g.user.mode === "coach") startCoachSeason(g, rng);
  ensureClubRelations(g);
  g.seasonSummary = undefined;
  addNews(g, { title: `Começa a temporada ${2026 + g.season}/${(27 + g.season) % 100}`, body: "Calendário divulgado. Pré-temporada em andamento.", tag: "liga", importance: 1 });
  void aiRenewals; void previousRanking;
}
