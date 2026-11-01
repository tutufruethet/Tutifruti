/**
 * Mercado de transferências: valores, pedidas, negociações, IA dos clubes,
 * renovações e agentes livres. As regras são as mesmas para IA e usuário.
 */
import { SQUAD_TEMPLATE, WINDOW_WEEKS } from "../constants";
import { addNews } from "../news/news";
import { getRel } from "../chemistry/relations";
import { friendAsksAdvice } from "../career/decisions";
import { clamp, Rng } from "../rng";
import { seasonStart, teamName } from "../season/schedule";
import type { Club, GameState, Player, Pos, TransferOffer } from "../types";
import { ageOf, fairWage, formatMoney, fullName, marketValue, roundMoney } from "../world/players";

export function weekOfSeason(g: GameState): number {
  return Math.floor((g.day - seasonStart(g.season)) / 7);
}

export function isWindowOpen(g: GameState): boolean {
  const w = weekOfSeason(g);
  return WINDOW_WEEKS.some(([a, b]) => w >= a && w <= b);
}

export function windowLabel(g: GameState): string {
  const w = weekOfSeason(g);
  const open = WINDOW_WEEKS.find(([a, b]) => w >= a && w <= b);
  if (open) return `Janela aberta até a semana ${open[1]}`;
  const next = WINDOW_WEEKS.find(([a]) => a > w);
  return next ? `Janela fechada · abre na semana ${next[0]}` : "Janela fechada · abre na pré-temporada";
}

export function clubAvgOvr(g: GameState, c: Club, top = 14): number {
  const o = c.squad.map((id) => g.players[id]?.ovr ?? 0).sort((a, b) => b - a).slice(0, top);
  return o.reduce((a, b) => a + b, 0) / Math.max(1, o.length);
}

export function isKeyPlayer(g: GameState, p: Player): boolean {
  if (!p.clubId) return false;
  const c = g.clubs[p.clubId];
  const better = c.squad.filter((id) => id !== p.id && g.players[id]?.pos === p.pos && g.players[id].ovr > p.ovr).length;
  return better < Math.ceil(SQUAD_TEMPLATE[p.pos] / 2);
}

/** Preço pedido pelo clube vendedor. */
export function askingPrice(g: GameState, p: Player): number {
  if (!p.clubId) return 0;
  let f = 1.05;
  if (isKeyPlayer(g, p)) f += 0.35;
  const age = ageOf(p, g.day);
  if (age <= 21 && p.potential - p.ovr >= 10) f += 0.3;
  const years = p.contract.until - g.season;
  if (years <= 0) f -= 0.35;
  else if (years === 1) f -= 0.15;
  if (p.listed) f -= 0.2;
  return roundMoney(p.value * Math.max(0.5, f));
}

/** Salário pedido por um jogador para ir a um clube. */
export function wageDemand(g: GameState, p: Player, club: Club): number {
  const cur = p.contract.wage || fairWage(p, g.day);
  const curRep = p.clubId ? g.clubs[p.clubId].reputation : 0;
  const repDiff = (curRep - club.reputation) / 100;
  const amb = p.persona.type === "ambicioso" ? 1.12 : p.persona.type === "leal" ? 0.97 : 1;
  return roundMoney(Math.max(fairWage(p, g.day) * 0.9, cur * (1.08 + repDiff * 0.6)) * amb, 100);
}

/** O jogador aceita mudar de clube? (retorna motivo se recusar) */
export function playerAccepts(g: GameState, p: Player, club: Club, wage: number): { ok: boolean; reason?: string } {
  const demand = wageDemand(g, p, club);
  const curRep = p.clubId ? g.clubs[p.clubId].reputation : 0;
  if (wage < demand * 0.92) return { ok: false, reason: `pede pelo menos ${formatMoney(demand)}/sem` };
  if (p.clubId && club.reputation < curRep - 22 && wage < demand * 1.4) return { ok: false, reason: "não quer jogar num clube menor" };
  if (p.persona.type === "leal" && p.clubId && g.day - p.joinedDay < 364 * 2 && club.reputation < curRep + 10) return { ok: false, reason: "é leal ao clube atual" };
  return { ok: true };
}

export interface TransferOpts {
  years?: number;
  wage?: number;
  silent?: boolean;
}

export function executeTransfer(g: GameState, playerId: string, toClubId: string, fee: number, opts: TransferOpts = {}) {
  const p = g.players[playerId];
  const to = g.clubs[toClubId];
  const fromId = p.clubId;
  const from = fromId ? g.clubs[fromId] : undefined;
  if (from) {
    from.squad = from.squad.filter((id) => id !== playerId);
    from.balance += fee;
    from.transferBudget += Math.round(fee * 0.6);
    from.cohesion = clamp(from.cohesion - 2.5, 20, 95);
    if (from.lineup) from.lineup = from.lineup.filter((id) => id !== playerId);
  }
  to.squad.push(playerId);
  to.balance -= fee;
  to.transferBudget = Math.max(0, to.transferBudget - fee);
  to.cohesion = clamp(to.cohesion - 2, 20, 95);
  p.clubId = toClubId;
  p.listed = false;
  p.joinedDay = g.day;
  p.contract = { wage: opts.wage ?? wageDemand(g, p, to), until: g.season + (opts.years ?? 3) };
  p.morale = clamp(p.morale + 8, 0, 100);
  p.clubs.push({ clubId: toClubId, clubName: to.name, season: g.season, fee });
  p.value = marketValue(p, g.season, g.day);
  g.history.transfers.unshift({ season: g.season, day: g.day, playerId, name: fullName(p), fromName: from?.name ?? "Sem clube", toName: to.name, fee });
  if (g.history.transfers.length > 400) g.history.transfers.length = 400;
  g.inbox.push({ t: "transfer", playerId, from: fromId, to: toClubId, fee });
  const userClub = g.user.clubId;
  const notable = fee >= 20_000_000 || p.reputation >= 75 || toClubId === userClub || fromId === userClub || p.isUser;
  if (notable && !opts.silent) {
    const feeTxt = fee > 0 ? `por ${formatMoney(fee)}` : "sem custos";
    addNews(g, {
      title: p.isUser ? `Você é o novo reforço do ${to.name}` : `${to.name} contrata ${fullName(p)} ${feeTxt}`,
      body: p.isUser
        ? `Negócio fechado ${feeTxt}. Contrato até ${2027 + p.contract.until}, salário de ${formatMoney(p.contract.wage)} por semana.`
        : `${fullName(p)} (${p.pos}, ${ageOf(p, g.day)} anos, overall ${p.ovr}) deixa ${from?.name ?? "a condição de agente livre"} e assina até ${2027 + p.contract.until}.`,
      tag: "transferencia",
      importance: fee >= 40_000_000 || p.isUser ? 3 : 2,
      clubIds: [toClubId, ...(fromId ? [fromId] : [])],
      playerIds: [playerId],
    });
  }
}

export function releasePlayer(g: GameState, playerId: string) {
  const p = g.players[playerId];
  if (!p.clubId) return;
  const c = g.clubs[p.clubId];
  c.squad = c.squad.filter((id) => id !== playerId);
  if (c.lineup) c.lineup = c.lineup.filter((id) => id !== playerId);
  g.inbox.push({ t: "transfer", playerId, from: p.clubId, to: null, fee: 0 });
  p.clubId = null;
  p.listed = false;
  p.contract = { wage: 0, until: g.season - 1 };
}

function positionNeeds(g: GameState, c: Club): { pos: Pos; urgency: number; bestOvr: number }[] {
  const target = clubAvgOvr(g, c);
  const out: { pos: Pos; urgency: number; bestOvr: number }[] = [];
  for (const [pos, n] of Object.entries(SQUAD_TEMPLATE) as [Pos, number][]) {
    const ps = c.squad.map((id) => g.players[id]).filter((p) => p && p.pos === pos && !p.retired).sort((a, b) => b.ovr - a.ovr);
    const lack = Math.max(0, n - ps.length);
    const best = ps[0]?.ovr ?? 0;
    const weak = Math.max(0, target - best);
    const old = ps.filter((p) => ageOf(p, g.day) >= 32).length;
    out.push({ pos, urgency: lack * 3 + weak / 2 + old * 0.8, bestOvr: best });
  }
  return out.sort((a, b) => b.urgency - a.urgency);
}

function isUserManaged(g: GameState, clubId: string) {
  return g.user.mode === "coach" && g.user.clubId === clubId && !g.user.unemployed;
}

/** IA de mercado: chamada semanalmente durante a janela. */
export function aiTransferWeek(g: GameState, rng: Rng) {
  if (!isWindowOpen(g)) return;
  const clubs = rng.shuffle(Object.values(g.clubs));
  const pool = Object.values(g.players).filter((p) => !p.retired && !p.isUser);
  for (const c of clubs) {
    if (isUserManaged(g, c.id)) continue;
    if (!rng.chance(c.squad.length < 22 ? 0.8 : 0.28)) continue;
    const need = positionNeeds(g, c)[0];
    if (!need || need.urgency < 1.2) continue;
    const target = clubAvgOvr(g, c);
    const budget = c.transferBudget;
    const wageRoom = c.wageBudget * 1.1 - c.squad.reduce((s, id) => s + (g.players[id]?.contract.wage ?? 0), 0);
    const cands = pool.filter((p) => {
      if (p.pos !== need.pos || p.clubId === c.id || p.injury) return false;
      if (p.ovr < Math.max(need.bestOvr - 3, target - 6) || p.ovr > target + 9) return false;
      const age = ageOf(p, g.day);
      if (age > 32) return false;
      if (p.clubId && isUserManaged(g, p.clubId)) return false; // ofertas ao usuário passam por outro fluxo
      const price = p.clubId ? askingPrice(g, p) : 0;
      return price <= budget * 0.9;
    });
    if (!cands.length) continue;
    const pick = cands
      .map((p) => ({ p, score: p.ovr + (p.potential - p.ovr) * 0.3 - ageOf(p, g.day) * 0.15 - (p.clubId ? Math.log10(askingPrice(g, p) + 1) * 0.6 : -2) + rng.range(0, 3) }))
      .sort((a, b) => b.score - a.score)[0].p;
    const price = pick.clubId ? askingPrice(g, pick) : 0;
    const wage = wageDemand(g, pick, c);
    if (wage > Math.max(wageRoom, fairWage(pick, g.day) * 1.2) && c.squad.length >= 22) continue;
    if (!playerAccepts(g, pick, c, wage * rng.range(1, 1.1)).ok) continue;
    if (pick.clubId) {
      const seller = g.clubs[pick.clubId];
      if (seller.squad.length <= 20) continue;
      // o jogador é amigo do usuário? ele pode pedir conselho antes
      if (pick.clubId === g.user.clubId && g.user.mode === "player" && hasPendingAdvice(g, pick.id)) continue;
      const rel = g.user.playerId && pick.clubId === g.user.clubId ? getRel(g, g.user.playerId, pick.id) : undefined;
      if (rel && rel.friendship >= 50 && g.user.mode === "player") {
        friendAsksAdvice(g, pick, c.id, price, wage);
        continue;
      }
    }
    executeTransfer(g, pick.id, c.id, price, { wage, years: rng.int(2, 5) });
  }
}

function hasPendingAdvice(g: GameState, playerId: string) {
  return g.decisions.some((d) => d.kind === "conselho_amigo" && d.data?.playerId === playerId) || !!g.chat.minds[playerId]?.pending?.topic.startsWith("conselho");
}

/** Renovações e saídas no fim de contrato (semana 30). */
export function aiRenewals(g: GameState, rng: Rng) {
  for (const c of Object.values(g.clubs)) {
    if (isUserManaged(g, c.id)) continue;
    const target = clubAvgOvr(g, c);
    for (const id of c.squad) {
      const p = g.players[id];
      if (!p || p.isUser || p.contract.until > g.season) continue;
      const age = ageOf(p, g.day);
      const wanted = p.ovr >= target - 6 && age <= 32;
      if (wanted && rng.chance(p.persona.type === "ambicioso" ? 0.55 : 0.8)) {
        p.contract = { wage: roundMoney(Math.max(p.contract.wage, fairWage(p, g.day)) * rng.range(1, 1.15), 100), until: g.season + rng.int(1, age > 29 ? 2 : 4) };
      }
    }
  }
}

/** Ofertas ao jogador do usuário (modo jogador). */
export function userPlayerOffers(g: GameState, rng: Rng) {
  if (g.user.mode !== "player" || !g.user.playerId || !isWindowOpen(g)) return;
  const me = g.players[g.user.playerId];
  if (me.retired) return;
  const pending = g.offers.filter((o) => o.direction === "user" && o.status === "pendente").length;
  if (pending >= 3) return;
  const chance = (g.user.wantsTransfer ? 0.55 : 0.18) + clamp((me.reputation - 40) / 200, 0, 0.25) + (me.contract.until <= g.season ? 0.3 : 0);
  if (!rng.chance(chance)) return;
  const curRep = me.clubId ? g.clubs[me.clubId].reputation : 0;
  const cands = Object.values(g.clubs).filter((c) => {
    if (c.id === me.clubId) return false;
    const avg = clubAvgOvr(g, c, 11);
    return me.ovr >= avg - 7 && me.ovr <= avg + 10 && c.reputation >= curRep - 25 && !g.offers.some((o) => o.fromClubId === c.id && o.playerId === me.id && o.status === "pendente");
  });
  if (!cands.length) return;
  const c = rng.weighted(cands, (x) => 1 + x.reputation / 20);
  const ask = me.clubId ? askingPrice(g, me) : 0;
  const fee = me.clubId ? roundMoney(ask * rng.range(0.82, 1.15)) : 0;
  const wage = roundMoney(wageDemand(g, me, c) * rng.range(0.95, 1.25), 100);
  const avg = clubAvgOvr(g, c, 11);
  const role = me.ovr >= avg + 1 ? "titular" : ageOf(me, g.day) <= 21 ? "promessa" : "rotacao";
  const offer: TransferOffer = {
    id: `o${g.ids++}`, playerId: me.id, fromClubId: c.id, toClubId: me.clubId, fee, wage, years: rng.int(2, 5), role,
    day: g.day, expires: g.day + 7, status: "pendente", direction: "user",
  };
  g.offers.push(offer);
  g.inbox.push({ t: "offer", offerId: offer.id });
  addNews(g, {
    title: `${c.name} faz proposta por você`,
    body: `${c.name} oferece ${fee ? formatMoney(fee) + " ao " + teamName(g, me.clubId ?? "") + " e " : ""}${formatMoney(wage)}/sem por ${offer.years} temporadas. Papel: ${role}.`,
    tag: "transferencia", importance: 3, clubIds: [c.id], playerIds: [me.id],
  });
}

/** IA faz propostas por jogadores do clube do usuário (modo treinador). */
export function offersForUserClub(g: GameState, rng: Rng) {
  if (g.user.mode !== "coach" || g.user.unemployed || !g.user.clubId || !isWindowOpen(g)) return;
  const club = g.clubs[g.user.clubId];
  if (!rng.chance(0.45)) return;
  const targets = club.squad.map((id) => g.players[id]).filter((p) => p && !p.injury);
  const p = rng.weighted(targets, (x) => (x.listed ? 6 : 1) * Math.pow(x.value / 1e6 + 0.5, 0.6));
  if (!p) return;
  const buyers = Object.values(g.clubs).filter((c) => c.id !== club.id && c.transferBudget >= p.value * 0.8 && clubAvgOvr(g, c) <= p.ovr + 6);
  if (!buyers.length) return;
  const b = rng.pick(buyers);
  if (g.offers.some((o) => o.playerId === p.id && o.status === "pendente")) return;
  const fee = roundMoney(Math.min(b.transferBudget, askingPrice(g, p) * rng.range(0.7, 1.1)));
  const offer: TransferOffer = {
    id: `o${g.ids++}`, playerId: p.id, fromClubId: b.id, toClubId: club.id, fee, wage: wageDemand(g, p, b), years: 3, role: "rotacao",
    day: g.day, expires: g.day + 5, status: "pendente", direction: "out",
  };
  g.offers.push(offer);
  g.inbox.push({ t: "offer", offerId: offer.id });
}

/** Usuário (treinador) faz proposta. Resposta sai no dia seguinte. */
export function userBid(g: GameState, playerId: string, fee: number, wage: number, years: number): TransferOffer | string {
  const p = g.players[playerId];
  const club = g.clubs[g.user.clubId!];
  if (!isWindowOpen(g) && p.clubId) return "A janela de transferências está fechada.";
  if (fee > club.transferBudget) return "Proposta acima do orçamento de transferências.";
  if (g.offers.some((o) => o.playerId === playerId && o.direction === "in" && (o.status === "pendente" || o.status === "negociando"))) return "Já existe uma proposta em andamento por esse jogador.";
  const offer: TransferOffer = {
    id: `o${g.ids++}`, playerId, fromClubId: club.id, toClubId: p.clubId, fee: p.clubId ? fee : 0, wage, years, role: "rotacao",
    day: g.day, expires: g.day + 1, status: "pendente", direction: "in",
  };
  g.offers.push(offer);
  return offer;
}

/** Resolve propostas do usuário (treinador) no dia seguinte. */
export function resolveUserBids(g: GameState) {
  for (const o of g.offers) {
    if (o.direction !== "in" || o.status !== "pendente" || g.day < o.expires) continue;
    const p = g.players[o.playerId];
    const buyer = g.clubs[o.fromClubId];
    if (!p || !buyer) { o.status = "expirada"; continue; }
    if (p.clubId && p.clubId !== o.toClubId) { o.status = "expirada"; o.note = "O jogador já mudou de clube."; continue; }
    if (p.clubId) {
      const ask = askingPrice(g, p);
      const seller = g.clubs[p.clubId];
      if (seller.squad.length <= 19) { o.status = "recusada"; o.note = `${seller.name} não quer reduzir o elenco.`; notify(g, o); continue; }
      if (o.fee < ask * 0.78) { o.status = "recusada"; o.note = `${seller.name} considerou a oferta baixa (pede cerca de ${formatMoney(ask)}).`; notify(g, o); continue; }
      if (o.fee < ask) { o.status = "negociando"; o.counter = ask; o.note = `${seller.name} faz contraproposta: ${formatMoney(ask)}.`; o.expires = g.day + 3; notify(g, o); continue; }
    }
    finishUserBid(g, o);
  }
}

function notify(g: GameState, o: TransferOffer) {
  const p = g.players[o.playerId];
  addNews(g, { title: `Proposta por ${fullName(p)}: ${o.status === "negociando" ? "contraproposta" : o.status}`, body: o.note ?? "", tag: "transferencia", importance: 2, playerIds: [p.id] });
}

export function finishUserBid(g: GameState, o: TransferOffer) {
  const p = g.players[o.playerId];
  const buyer = g.clubs[o.fromClubId];
  const fee = o.counter && o.status === "negociando" ? o.counter : o.fee;
  if (fee > buyer.transferBudget) { o.status = "recusada"; o.note = "Sem orçamento para o valor final."; notify(g, o); return; }
  const acc = playerAccepts(g, p, buyer, o.wage);
  if (!acc.ok) { o.status = "recusada"; o.note = `${fullName(p)} recusou: ${acc.reason}.`; notify(g, o); return; }
  o.status = "aceita";
  o.fee = fee;
  o.note = "Negócio fechado.";
  executeTransfer(g, p.id, buyer.id, fee, { wage: o.wage, years: o.years });
}

/** Aceite de proposta pelo usuário (treinador vendendo ou jogador indo). */
export function acceptOffer(g: GameState, offerId: string): string {
  const o = g.offers.find((x) => x.id === offerId);
  if (!o || (o.status !== "pendente" && o.status !== "negociando")) return "Proposta indisponível.";
  if (o.direction === "in") {
    if (o.status === "negociando") { finishUserBid(g, o); return o.note ?? ""; }
    return "Aguardando resposta.";
  }
  const p = g.players[o.playerId];
  const buyer = g.clubs[o.fromClubId];
  if (o.direction === "out") {
    o.status = "aceita";
    executeTransfer(g, p.id, buyer.id, o.fee, { wage: o.wage, years: o.years });
    return `${fullName(p)} vendido ao ${buyer.name}.`;
  }
  // modo jogador: o clube atual precisa liberar
  if (p.clubId && o.fee < askingPrice(g, p) * 0.85 && isKeyPlayer(g, p)) {
    o.status = "recusada";
    o.note = `${teamName(g, p.clubId)} não aceitou liberar você por esse valor.`;
    addNews(g, { title: "Clube barra sua saída", body: o.note, tag: "transferencia", importance: 2, playerIds: [p.id] });
    g.user.coachRelation = clamp(g.user.coachRelation - 4, 0, 100);
    return o.note;
  }
  o.status = "aceita";
  const from = p.clubId;
  executeTransfer(g, p.id, buyer.id, o.fee, { wage: o.wage, years: o.years });
  g.user.clubId = buyer.id;
  g.user.coachRelation = 50;
  g.user.seasonsAtClub = 0;
  g.user.wantsTransfer = false;
  g.inbox.push({ t: "user_moved", from, to: buyer.id });
  for (const other of g.offers) if (other.direction === "user" && other.status === "pendente") other.status = "retirada";
  return `Você assinou com o ${buyer.name}!`;
}

export function rejectOffer(g: GameState, offerId: string) {
  const o = g.offers.find((x) => x.id === offerId);
  if (o && (o.status === "pendente" || o.status === "negociando")) o.status = "recusada";
}

/** Negociação de salário pelo jogador do usuário: pode melhorar ou o clube desiste. */
export function negotiateOffer(g: GameState, rng: Rng, offerId: string, raisePct: number): string {
  const o = g.offers.find((x) => x.id === offerId);
  if (!o || o.status !== "pendente") return "Proposta indisponível.";
  const risk = raisePct / 60 + (o.counter ?? 0) * 0.15;
  if (rng.chance(risk)) {
    o.status = "retirada";
    o.note = `${teamName(g, o.fromClubId)} desistiu do negócio.`;
    return o.note;
  }
  o.wage = roundMoney(o.wage * (1 + raisePct / 100), 100);
  o.counter = (o.counter ?? 0) + 1;
  o.expires = Math.max(o.expires, g.day + 3);
  o.note = `Salário melhorado para ${formatMoney(o.wage)}/sem.`;
  return o.note;
}

export function expireOffers(g: GameState) {
  for (const o of g.offers) {
    if ((o.status === "pendente" || o.status === "negociando") && o.direction !== "in" && g.day > o.expires) o.status = "expirada";
    if (o.status === "negociando" && o.direction === "in" && g.day > o.expires) o.status = "expirada";
  }
  if (g.offers.length > 80) g.offers = g.offers.filter((o) => o.status === "pendente" || o.status === "negociando" || g.day - o.day < 60);
}

/** Agentes livres: clubes com elenco curto contratam. */
export function signFreeAgents(g: GameState, rng: Rng) {
  const free = Object.values(g.players).filter((p) => !p.clubId && !p.retired && !p.isUser);
  for (const c of Object.values(g.clubs)) {
    if (isUserManaged(g, c.id) || c.squad.length >= 22) continue;
    const need = positionNeeds(g, c)[0];
    const cand = free.filter((p) => p.pos === need.pos && !p.clubId).sort((a, b) => b.ovr - a.ovr)[0];
    if (cand && cand.ovr >= clubAvgOvr(g, c) - 14) executeTransfer(g, cand.id, c.id, 0, { wage: fairWage(cand, g.day), years: rng.int(1, 2), silent: true });
  }
}

export function contractRenewalTerms(g: GameState, p: Player): { wage: number; years: number } {
  const club = p.clubId ? g.clubs[p.clubId] : undefined;
  const base = Math.max(p.contract.wage, fairWage(p, g.day));
  const mood = p.morale < 45 ? 1.2 : p.morale > 75 ? 0.98 : 1.05;
  const amb = p.persona.type === "ambicioso" ? 1.15 : 1;
  void club;
  return { wage: roundMoney(base * mood * amb, 100), years: ageOf(p, g.day) >= 30 ? 2 : 3 };
}

/** Renovação feita pelo usuário (treinador) com um jogador do elenco. */
export function renewContract(g: GameState, rng: Rng, playerId: string, wage: number, years: number): { ok: boolean; msg: string } {
  const p = g.players[playerId];
  const terms = contractRenewalTerms(g, p);
  const ratio = wage / terms.wage;
  const chance = ratio >= 1 ? 1 : ratio >= 0.9 ? 0.55 : ratio >= 0.8 ? 0.2 : 0;
  if (rng.chance(chance)) {
    p.contract = { wage, until: g.season + years };
    p.morale = clamp(p.morale + 5, 0, 100);
    return { ok: true, msg: `${fullName(p)} renovou até ${2027 + p.contract.until}.` };
  }
  p.morale = clamp(p.morale - 4, 0, 100);
  return { ok: false, msg: `${fullName(p)} recusou. Ele quer cerca de ${formatMoney(terms.wage)}/sem.` };
}
