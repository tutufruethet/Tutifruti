/** Modo treinador: objetivos da diretoria, demissão e propostas de emprego. */
import { ensureClubRelations } from "../chemistry/relations";
import { addNews, milestone } from "../news/news";
import { clamp, Rng } from "../rng";
import { coachName } from "../world/generate";
import type { GameState, Objective } from "../types";
import { sortTable, teamName } from "../season/schedule";

export function leagueExpectation(g: GameState, clubId: string): number {
  const c = g.clubs[clubId];
  const lg = g.comps[c.leagueId];
  if (!lg) return 8;
  const byRep = [...lg.teamIds].sort((a, b) => g.clubs[b].reputation - g.clubs[a].reputation);
  return byRep.indexOf(clubId) + 1;
}

export function buildObjectives(g: GameState, clubId: string): Objective[] {
  const c = g.clubs[clubId];
  const lg = g.comps[c.leagueId];
  const exp = leagueExpectation(g, clubId);
  const n = lg?.teamIds.length ?? 16;
  const out: Objective[] = [];
  if (lg?.tier === 2) {
    out.push(exp <= 5 ? { id: "o1", text: "Conquistar o acesso (top 3)", kind: "acesso", target: 3, compId: lg.id, status: "andamento" } : { id: "o1", text: "Terminar no top 8", kind: "liga_pos", target: 8, compId: lg.id, status: "andamento" });
  } else if (exp <= 2) out.push({ id: "o1", text: "Ser campeão da liga", kind: "liga_pos", target: 1, compId: c.leagueId, status: "andamento" });
  else if (exp <= 5) out.push({ id: "o1", text: "Terminar entre os 4 primeiros", kind: "liga_pos", target: 4, compId: c.leagueId, status: "andamento" });
  else if (exp <= 10) out.push({ id: "o1", text: "Terminar na metade de cima (top 8)", kind: "liga_pos", target: 8, compId: c.leagueId, status: "andamento" });
  else out.push({ id: "o1", text: lg?.relegate ? "Evitar o rebaixamento" : "Terminar acima do 13º lugar", kind: "nao_rebaixar", target: n - (lg?.relegate || 3), compId: c.leagueId, status: "andamento" });
  if (g.comps[`C-${c.nation}`]) out.push({ id: "o2", text: exp <= 3 ? "Chegar à semifinal da copa" : "Passar de pelo menos uma fase da copa", kind: "copa_fase", target: exp <= 3 ? 3 : 1, compId: `C-${c.nation}`, status: "andamento" });
  const cont = ["CONT-EU", "CONT-AS"].find((id) => g.comps[id]?.teamIds.includes(clubId));
  if (cont) out.push({ id: "o3", text: "Passar da fase de grupos continental", kind: "continental", target: 1, compId: cont, status: "andamento" });
  return out;
}

export function startCoachSeason(g: GameState, rng: Rng) {
  void rng;
  if (g.user.unemployed || !g.user.clubId) return;
  g.user.objectives = buildObjectives(g, g.user.clubId);
  g.user.boardConfidence = clamp(Math.max(g.user.boardConfidence, 50), 0, 100);
  g.user.seasonsAtClub++;
}

function koReached(g: GameState, compId: string, clubId: string): number {
  // quantas fases de mata-mata venceu
  const fx = Object.values(g.fixtures).filter((f) => f.compId === compId && f.tieId && f.played && (f.homeId === clubId || f.awayId === clubId));
  let wins = 0;
  for (const f of fx) {
    const r = f.result!;
    const w = r.hg !== r.ag ? (r.hg > r.ag ? f.homeId : f.awayId) : r.pens ? (r.pens[0] > r.pens[1] ? f.homeId : f.awayId) : f.homeId;
    if (w === clubId) wins++;
  }
  return wins;
}

export function evaluateObjectives(g: GameState) {
  const cid = g.user.clubId;
  if (!cid) return;
  for (const o of g.user.objectives) {
    const comp = g.comps[o.compId];
    if (!comp) continue;
    if (o.kind === "liga_pos" || o.kind === "acesso" || o.kind === "nao_rebaixar") {
      sortTable(comp.table);
      const pos = comp.table.findIndex((r) => r.clubId === cid) + 1;
      if (comp.finished) o.status = pos <= o.target ? "cumprido" : "falhou";
    } else if (o.kind === "copa_fase") {
      const w = koReached(g, o.compId, cid);
      if (w >= o.target) o.status = "cumprido";
      else if (comp.ko && !comp.ko.alive.includes(cid) && comp.ko.round > 0) o.status = "falhou";
      else if (comp.finished) o.status = "falhou";
    } else if (o.kind === "continental") {
      if (comp.ko && !comp.ko.pendingFrom) o.status = comp.ko.alive.includes(cid) || koReached(g, o.compId, cid) > 0 || Object.values(g.fixtures).some((f) => f.compId === o.compId && f.tieId && (f.homeId === cid || f.awayId === cid)) ? "cumprido" : "falhou";
    }
  }
}

export function evaluateCoachSeason(g: GameState, rng: Rng, promoted: string[], relegated: string[]) {
  const cid = g.user.clubId;
  if (!cid || g.user.unemployed) return;
  evaluateObjectives(g);
  const club = g.clubs[cid];
  const lg = g.comps[club.leagueId];
  sortTable(lg.table);
  const pos = lg.table.findIndex((r) => r.clubId === cid) + 1;
  let delta = 0;
  for (const o of g.user.objectives) delta += o.status === "cumprido" ? 14 : o.status === "falhou" ? -16 : 0;
  g.user.boardConfidence = clamp(g.user.boardConfidence + delta, 0, 100);
  if (promoted.includes(cid)) milestone(g, `Acesso com o ${club.name}`);
  const trophies = g.history.champions.filter((c) => c.season === g.season && c.winnerId === cid).map((c) => c.compName);
  g.history.userSeasons.unshift({ season: g.season, clubName: club.name, league: lg.name, pos, trophies, awards: [], record: { ...g.user.coachRecord } });
  g.user.reputation = clamp(g.user.reputation + (leagueExpectation(g, cid) - pos) * 0.8 + trophies.length * 3, 0, 100);
  if (relegated.includes(cid) || g.user.boardConfidence < 20) fireCoach(g, rng, relegated.includes(cid) ? "rebaixamento" : "objetivos não cumpridos");
  else maybeJobOffers(g, rng, true);
}

export function fireCoach(g: GameState, rng: Rng, reason: string) {
  const cid = g.user.clubId;
  if (!cid) return;
  const club = g.clubs[cid];
  addNews(g, { title: `Você é demitido do ${club.name}`, body: `A diretoria encerrou seu trabalho (${reason}).`, tag: "pressao", importance: 3, clubIds: [cid] });
  milestone(g, `Demitido do ${club.name}`);
  g.inbox.push({ t: "fired", clubId: cid });
  club.coachName = coachName(rng);
  club.coachPressure = 20;
  club.lineup = undefined;
  g.user.unemployed = true;
  g.user.clubId = null;
  g.user.firedCount++;
  g.user.objectives = [];
  g.user.reputation = clamp(g.user.reputation - 6, 0, 100);
  maybeJobOffers(g, rng, true);
}

export function maybeJobOffers(g: GameState, rng: Rng, force = false) {
  const rep = g.user.reputation;
  const cur = g.user.clubId ? g.clubs[g.user.clubId] : undefined;
  if (!force && !g.user.unemployed && !rng.chance(0.05)) return;
  const pool = Object.values(g.clubs).filter((c) => {
    if (c.id === g.user.clubId) return false;
    if (g.user.jobOffers.some((o) => o.clubId === c.id)) return false;
    if (g.user.unemployed) return c.reputation <= rep + 12;
    return c.reputation > (cur?.reputation ?? 0) + 4 && c.reputation <= rep + 15;
  });
  if (!pool.length) return;
  const n = g.user.unemployed ? rng.int(2, 3) : 1;
  for (let i = 0; i < n && pool.length; i++) {
    const c = rng.weighted(pool, (x) => (g.user.unemployed ? 1 + x.coachPressure / 20 : 1 + x.reputation / 30));
    pool.splice(pool.indexOf(c), 1);
    if (!g.user.unemployed && !(force || rng.chance(0.5))) continue;
    g.user.jobOffers.push({ clubId: c.id, day: g.day, expires: g.day + 14 });
    addNews(g, { title: `${c.name} quer você como treinador`, body: `Proposta válida por duas semanas. Reputação do clube: ${Math.round(c.reputation)}.`, tag: "carreira", importance: 3, clubIds: [c.id] });
  }
}

export function acceptJob(g: GameState, clubId: string) {
  const c = g.clubs[clubId];
  const prev = g.user.clubId;
  if (prev) addNews(g, { title: `Você deixa o ${g.clubs[prev].name}`, body: `Novo desafio: ${c.name}.`, tag: "carreira", importance: 2 });
  g.clubs[prev ?? ""] && (g.clubs[prev!].coachName = coachName(new Rng(g.day + 7)));
  g.user.clubId = clubId;
  g.user.unemployed = false;
  g.user.jobOffers = [];
  g.user.boardConfidence = 60;
  g.user.seasonsAtClub = 0;
  c.coachName = g.user.name;
  c.coachPressure = 10;
  c.lineup = undefined;
  g.user.objectives = buildObjectives(g, clubId);
  ensureClubRelations(g);
  addNews(g, { title: `${g.user.name} é o novo treinador do ${c.name}`, body: g.user.objectives.map((o) => o.text).join(" · "), tag: "carreira", importance: 3, clubIds: [clubId] });
  milestone(g, `Assumiu o ${c.name}`);
  g.inbox.push({ t: "hired", clubId });
}

/** Semanal: demissão por desempenho, ofertas, demissões de técnicos da IA. */
export function weeklyCoachTick(g: GameState, rng: Rng) {
  g.user.jobOffers = g.user.jobOffers.filter((o) => o.expires >= g.day);
  if (g.user.mode === "coach") {
    if (!g.user.unemployed && g.user.clubId) {
      // treino coletivo: intensidade troca condição física por evolução
      const club = g.clubs[g.user.clubId];
      const { intensity, focus } = g.user.training;
      for (const id of club.squad) {
        const p = g.players[id];
        if (!p) continue;
        if (focus === "descanso") p.fitness = clamp(p.fitness + 8, 0, 100);
        else p.fitness = clamp(p.fitness + (intensity === 0 ? 3 : intensity === 2 ? -5 : 0), 25, 100);
        if (intensity === 2 && !p.injury && rng.chance(0.006)) p.injury = { name: "Lesão muscular no treino", days: rng.int(5, 15) };
      }
      club.cohesion = clamp(club.cohesion + (intensity === 2 ? 0.5 : 0.2), 0, 92);
      evaluateObjectives(g);
      const played = g.user.coachRecord.w + g.user.coachRecord.d + g.user.coachRecord.l;
      if (g.user.boardConfidence < 12 && played >= 8) fireCoach(g, rng, "maus resultados");
      else if (g.user.boardConfidence < 25 && rng.chance(0.3)) addNews(g, { title: `Diretoria do ${g.clubs[g.user.clubId].name} perde a paciência`, body: "Mais uma sequência ruim e o cargo estará em risco.", tag: "pressao", importance: 3 });
      maybeJobOffers(g, rng);
    } else maybeJobOffers(g, rng, g.user.jobOffers.length === 0);
  }
  // treinadores da IA
  for (const c of Object.values(g.clubs)) {
    if (g.user.mode === "coach" && c.id === g.user.clubId) continue;
    const lgTable = g.comps[c.leagueId]?.table;
    const row = lgTable?.find((r) => r.clubId === c.id);
    const winless = row ? [...row.form].reverse().findIndex((f) => f === "V") : -1;
    const streak = row ? (winless === -1 ? row.form.length : winless) : 0;
    if (streak >= 5 && c.coachPressure >= 60 && !c.seasonsHistory.some(() => false)) {
      if (c.coachPressure >= 85 && rng.chance(0.45)) {
        const old = c.coachName;
        c.coachName = coachName(rng);
        c.coachPressure = 25;
        c.cohesion = clamp(c.cohesion - 6, 20, 95);
        addNews(g, { title: `${c.name} demite ${old}`, body: `${c.coachName} assume o comando após sequência sem vitórias.`, tag: "pressao", importance: c.id === g.user.clubId ? 3 : 1, clubIds: [c.id] });
        g.inbox.push({ t: "coach_sacked", clubId: c.id });
        if (g.user.mode === "player" && g.user.clubId === c.id) g.user.coachRelation = 50;
      } else if (rng.chance(0.25) && (c.reputation >= 55 || c.id === g.user.clubId)) {
        addNews(g, { title: `Treinador do ${c.name} está pressionado após ${streak} jogos sem vencer`, body: `${c.coachName} balança no cargo. A diretoria se reúne nesta semana.`, tag: "pressao", importance: c.id === g.user.clubId ? 2 : 1, clubIds: [c.id] });
        c.coachPressure = clamp(c.coachPressure + 6, 0, 100);
      }
    }
  }
  void teamName;
}

/** Depois de se aposentar como jogador, começa a carreira de treinador no mesmo universo. */
export function startCoachAfterRetirement(g: GameState, rng: Rng) {
  const legacy = g.user.legacyScore;
  g.user.mode = "coach";
  g.user.retired = false;
  g.user.unemployed = true;
  g.user.clubId = null;
  g.user.playerId = g.user.playerId; // mantém referência histórica
  g.user.reputation = clamp(15 + legacy / 40, 15, 70);
  g.user.coachRecord = { w: 0, d: 0, l: 0 };
  g.user.boardConfidence = 60;
  g.user.jobOffers = [];
  milestone(g, "Início da carreira de treinador");
  maybeJobOffers(g, rng, true);
}
