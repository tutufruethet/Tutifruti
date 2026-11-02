/**
 * Agente (empresário): o jogador contrata, define um objetivo e o agente
 * procura clubes e traz propostas reais do mercado. Cobra comissão sobre o
 * salário e melhora negociações. No modo treinador, procura empregos.
 */
import { WINDOW_WEEKS } from "../constants";
import { addNews } from "../news/news";
import { clamp, hashSeed, Rng } from "../rng";
import { seasonStart, teamName } from "../season/schedule";
import type { Agent, AgentGoal, Club, GameState } from "../types";
import { ageOf, formatMoney, fullName, roundMoney } from "../world/players";
import { askingPrice, clubAvgOvr, isWindowOpen, makeUserOffer, weekOfSeason } from "../market/transfers";
import { maybeJobOffers } from "./coach";

export const AGENT_THREAD = "agente";

export const GOAL_LABEL: Record<AgentGoal, string> = {
  salario: "Melhor salário",
  clube_grande: "Clube maior",
  minutos: "Ser titular",
  europa: "Jogar na Europa",
  casa: "Voltar para o meu país",
};

const NAMES = ["Marcelo Vasconcelos", "Gilda Rezende", "Pablo Ferrán", "Otto Kessler", "Bruna Saraiva", "Nico Albertini", "Jorge Damasceno", "Helena Prates"];
const STYLES: [string, string][] = [
  ["Tubarão", "Briga por cada centavo. Clubes grandes atendem o telefone dele."],
  ["Paizão", "Cuida da carreira com calma, prioriza minutos e evolução."],
  ["Conectado na Europa", "Tem contatos nas ligas europeias."],
  ["Raiz", "Conhece todo mundo no futebol sul-americano."],
  ["Iniciante", "Comissão baixa, ainda montando a rede de contatos."],
  ["Estrela", "Agencia craques. Caro, mas abre qualquer porta."],
];

export function ensureAgents(g: GameState): Agent[] {
  if (g.agents?.length) return g.agents;
  const rng = new Rng(hashSeed(g.seed, "agentes"));
  g.agents = STYLES.map(([style, bio], i) => {
    const rep = style === "Estrela" ? rng.int(85, 95) : style === "Iniciante" ? rng.int(25, 40) : rng.int(50, 80);
    return {
      id: `ag${i + 1}`,
      name: NAMES[(i + rng.int(0, 7)) % NAMES.length],
      rep,
      commission: Math.round((style === "Iniciante" ? 0.04 : style === "Estrela" ? 0.14 : 0.06 + rep / 1000) * 100) / 100,
      negotiation: clamp(rep + (style === "Tubarão" ? 15 : style === "Paizão" ? -10 : rng.int(-8, 8)), 10, 99),
      network: style === "Conectado na Europa" ? "EU" : style === "Raiz" ? "AS" : "global",
      style,
      bio,
    } as Agent;
  });
  // nomes únicos
  const used = new Set<string>();
  for (const a of g.agents) { let n = a.name, k = 0; while (used.has(n)) n = NAMES[(NAMES.indexOf(a.name) + ++k) % NAMES.length]; a.name = n; used.add(n); }
  return g.agents;
}

export const currentAgent = (g: GameState): Agent | undefined => (g.user.agent ? ensureAgents(g).find((a) => a.id === g.user.agent!.agentId) : undefined);

/** O agente aceita você? Agentes de elite só pegam quem tem fama. */
export function agentAccepts(g: GameState, a: Agent): { ok: boolean; reason?: string } {
  const fame = g.user.mode === "player" && g.user.playerId ? g.players[g.user.playerId].reputation : g.user.reputation;
  if (a.rep >= 85 && fame < 45) return { ok: false, reason: `${a.name} só agencia nomes conhecidos (sua fama: ${Math.round(fame)}, precisa de 45)` };
  if (a.rep >= 70 && fame < 20) return { ok: false, reason: `${a.name} quer ver mais jogos seus antes (fama mínima 20)` };
  return { ok: true };
}

function agentSays(g: GameState, text: string) {
  const a = currentAgent(g);
  let t = g.chat.threads[AGENT_THREAD];
  if (!t) { t = { id: AGENT_THREAD, kind: "dm", members: [], name: a ? `${a.name} · Agente` : "Agente", messages: [], read: 0 }; g.chat.threads[AGENT_THREAD] = t; }
  if (a) t.name = `${a.name} · Agente`;
  t.messages.push({ id: g.chat.seq++, from: "agente", text, day: g.day });
  if (t.messages.length > 200) t.messages.splice(0, t.messages.length - 200);
  if (g.user.agent) { g.user.agent.reports.unshift({ day: g.day, text }); g.user.agent.reports.length = Math.min(g.user.agent.reports.length, 30); }
}

export function hireAgent(g: GameState, agentId: string, goal: AgentGoal): string {
  const a = ensureAgents(g).find((x) => x.id === agentId);
  if (!a) return "Agente não encontrado.";
  const acc = agentAccepts(g, a);
  if (!acc.ok) return acc.reason!;
  if (g.user.agent) fireAgent(g, true);
  g.user.agent = { agentId, hiredDay: g.day, goal, reports: [], offersFound: 0, earned: 0 };
  agentSays(g, g.user.mode === "player"
    ? `Fechado, ${g.user.name.split(" ")[0]}! Agora eu cuido da tua carreira. Objetivo: ${GOAL_LABEL[goal].toLowerCase()}. Quando quiser que eu bata na porta dos clubes, é só pedir.`
    : `Fechado, professor. Vou ficar de olho nos clubes que procuram treinador.`);
  return `${a.name} agora é seu agente.`;
}

export function fireAgent(g: GameState, silent = false) {
  const a = currentAgent(g);
  if (!a) return;
  if (!silent) agentSays(g, "Beleza, sem ressentimento. Se precisar de mim de novo, tô por aí.");
  g.user.agent = undefined;
}

export function setAgentGoal(g: GameState, goal: AgentGoal) {
  if (!g.user.agent) return;
  g.user.agent.goal = goal;
  agentSays(g, `Anotado: foco em ${GOAL_LABEL[goal].toLowerCase()}.`);
}

function nextWindowDay(g: GameState): number {
  const w = weekOfSeason(g);
  const nxt = WINDOW_WEEKS.find(([a]) => a > w);
  return nxt ? seasonStart(g.season) + nxt[0] * 7 + 1 : seasonStart(g.season + 1) + 1;
}

/** Pede ao agente para procurar clube agora. */
export function requestSearch(g: GameState): string {
  const a = currentAgent(g);
  const h = g.user.agent;
  if (!a || !h) return "Contrate um agente primeiro.";
  if (h.searchUntil && h.searchUntil > g.day) return `${a.name} já está procurando. Retorno em ${h.searchUntil - g.day} dia(s).`;
  const days = Math.max(2, Math.round(7 - a.rep / 20));
  const free = g.user.mode === "player" && g.user.playerId && !g.players[g.user.playerId].clubId;
  if (g.user.mode === "player" && !isWindowOpen(g) && !free) {
    h.searchUntil = nextWindowDay(g);
    agentSays(g, `A janela tá fechada agora. Vou sondar os clubes e te trago as propostas quando ela abrir (${h.searchUntil - g.day} dias).`);
    return "A janela está fechada: o agente vai sondar e trazer propostas quando ela abrir.";
  }
  h.searchUntil = g.day + days;
  agentSays(g, `Deixa comigo. Vou ligar pra uns diretores e te dou retorno em ${days} dia(s).`);
  return `${a.name} começou a procurar. Retorno em ${days} dia(s).`;
}

function goalFilter(g: GameState, goal: AgentGoal, c: Club, curRep: number, ovr: number): boolean {
  const avg = clubAvgOvr(g, c, 11);
  switch (goal) {
    case "clube_grande": return c.reputation >= curRep + 6;
    case "minutos": return ovr >= avg + 0.5;
    case "europa": return g.nations[c.nation]?.region === "EU";
    case "casa": return c.nation === g.user.nation;
    default: return true;
  }
}

function deliver(g: GameState, rng: Rng) {
  const a = currentAgent(g)!;
  const h = g.user.agent!;
  h.searchUntil = undefined;
  if (g.user.mode === "coach") {
    const before = g.user.jobOffers.length;
    const rep = g.user.reputation;
    g.user.reputation = clamp(rep + a.rep / 10, 0, 100); // contatos do agente abrem portas
    maybeJobOffers(g, rng, true);
    g.user.reputation = rep;
    const n = g.user.jobOffers.length - before;
    agentSays(g, n > 0 ? `Consegui ${n} clube(s) interessado(s) em você. Tá no seu painel.` : "Rodei o mercado e ninguém tá trocando de técnico agora. Tento de novo daqui a pouco.");
    return;
  }
  const me = g.players[g.user.playerId!];
  const curRep = me.clubId ? g.clubs[me.clubId].reputation : 0;
  const reach = a.rep / 25 + (a.network === "global" ? 1 : 0); // alcance extra de overall
  const cands = Object.values(g.clubs).filter((c) => {
    if (c.id === me.clubId) return false;
    if (g.offers.some((o) => o.fromClubId === c.id && o.playerId === me.id && o.status === "pendente")) return false;
    const avg = clubAvgOvr(g, c, 11);
    if (me.ovr < avg - 7 - reach || me.ovr > avg + 12) return false;
    if (a.network !== "global" && g.nations[c.nation]?.region !== a.network && rng.chance(0.6)) return false;
    return goalFilter(g, h.goal, c, curRep, me.ovr);
  });
  if (!cands.length) {
    agentSays(g, h.goal === "europa" ? "Por enquanto a Europa não tá olhando pra você. Mais uns jogos bons e eu volto a tentar." : `Bati em várias portas, mas nada que encaixe em "${GOAL_LABEL[h.goal].toLowerCase()}". Quer que eu mude o foco?`);
    return;
  }
  const n = Math.min(cands.length, 1 + Math.floor(a.rep / 40));
  const picked: Club[] = [];
  const pool = [...cands];
  for (let i = 0; i < n; i++) {
    const c = rng.weighted(pool, (x) => (h.goal === "salario" ? 1 + x.balance / 2e7 : 1 + x.reputation / 20));
    picked.push(c);
    pool.splice(pool.indexOf(c), 1);
  }
  const wageMult = 1 + a.negotiation / 400 + (h.goal === "salario" ? 0.1 : 0);
  const made = picked.map((c) => makeUserOffer(g, rng, c, { wageMult, viaAgent: true })).filter(Boolean);
  h.offersFound += made.length;
  const best = [...made].sort((x, y) => y!.wage - x!.wage)[0]!;
  agentSays(g, `Trouxe ${made.length} proposta(s): ${made.map((o) => `${teamName(g, o!.fromClubId)} (${formatMoney(o!.wage)}/sem)`).join(", ")}. A melhor no salário é a do ${teamName(g, best.fromClubId)}. Dá uma olhada em Transferências → Propostas.`);
  addNews(g, { title: `Empresário de ${fullName(me)} movimenta o mercado`, body: `${a.name} levou o nome do jogador a ${made.length} clube(s).`, tag: "transferencia", importance: 2, playerIds: [me.id] });
}

/** Diário: entrega buscas prontas. */
export function agentDaily(g: GameState, rng: Rng) {
  const h = g.user.agent;
  if (!h || !currentAgent(g)) return;
  if (h.searchUntil && g.day >= h.searchUntil) deliver(g, rng);
}

/** Semanal: comissão e sondagens espontâneas durante a janela. */
export function agentWeekly(g: GameState, rng: Rng) {
  const a = currentAgent(g);
  const h = g.user.agent;
  if (!a || !h) return;
  if (g.user.mode === "player" && g.user.playerId) {
    const me = g.players[g.user.playerId];
    const fee = roundMoney(me.contract.wage * a.commission, 10);
    g.user.money -= fee;
    h.earned += fee;
    if (isWindowOpen(g) && !h.searchUntil && rng.chance(0.08 + a.rep / 500)) deliver(g, rng);
  }
}

/** Bônus de negociação na renovação de contrato. */
export function agentRenewalBonus(g: GameState): number {
  const a = currentAgent(g);
  return a ? 1 + a.negotiation / 500 : 1;
}

/** Conversa simples com o agente (comandos em linguagem natural). */
export function agentChat(g: GameState, text: string): void {
  const t = g.chat.threads[AGENT_THREAD];
  if (!t) return;
  t.messages.push({ id: g.chat.seq++, from: "me", text, day: g.day });
  t.read = t.messages[t.messages.length - 1].id;
  const a = currentAgent(g);
  if (!a) { agentSays(g, "Você não tem agente no momento."); return; }
  const n = text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const me = g.user.playerId ? g.players[g.user.playerId] : undefined;
  if (/(procura|busca|acha|arruma|consegue).*(clube|time|proposta|oferta)|proposta|clube novo|time novo|quero sair|me tira/.test(n)) { requestSearch(g); return; }
  if (/(quanto|valor|valho|valendo|preco)/.test(n) && me) {
    agentSays(g, `Hoje teu valor de mercado é ${formatMoney(me.value)}${me.clubId ? ` e o ${g.clubs[me.clubId].name} pede uns ${formatMoney(askingPrice(g, me))}` : ""}. Salário atual: ${formatMoney(me.contract.wage)}/sem.`);
    return;
  }
  if (/renov|contrato/.test(n) && me) {
    agentSays(g, me.clubId ? `Teu contrato vai até ${2027 + me.contract.until}. Quando o clube chamar pra renovar, eu entro e arranco mais uns ${Math.round((agentRenewalBonus(g) - 1) * 100)}%.` : "Você tá livre. Melhor hora pra eu trabalhar: peça pra eu procurar clube.");
    return;
  }
  if (/europa|fora do pais|exterior/.test(n)) { setAgentGoal(g, "europa"); return; }
  if (/salario|dinheiro|grana/.test(n)) { setAgentGoal(g, "salario"); return; }
  if (/titular|jogar mais|minutos/.test(n)) { setAgentGoal(g, "minutos"); return; }
  if (/grande|gigante|maior/.test(n)) { setAgentGoal(g, "clube_grande"); return; }
  if (/obrigad|valeu|tmj/.test(n)) { agentSays(g, "Tamo junto. Tua carreira é meu trabalho."); return; }
  const h = g.user.agent!;
  agentSays(g, h.searchUntil && h.searchUntil > g.day
    ? `Tô no telefone com os clubes. Retorno em ${h.searchUntil - g.day} dia(s).`
    : `Tô aqui. Foco atual: ${GOAL_LABEL[h.goal].toLowerCase()}. Me pede pra procurar clube, perguntar teu valor ou falar de contrato.${me && ageOf(me, g.day) <= 21 ? " E continua jogando bem que o mercado tá de olho." : ""}`);
}
