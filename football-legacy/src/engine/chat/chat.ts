/** Vestiário: conversas individuais e em grupo, integradas ao motor de carreira. */
import { bumpRel, ensureRel, getRel, USER_COACH_ID } from "../chemistry/relations";
import { resolveDecision } from "../career/decisions";
import { hashSeed, Rng } from "../rng";
import type { ChatMsg, ChatThread, GameState, Player } from "../types";
import { buildCtx, ctxToFacts } from "./context";
import { analyze } from "./intents";
import { addMemory, memorySummary, mindOf, setMood } from "./memory";
import { relevanceFor, respond, type Reply, type TurnInput } from "./responder";
import { stylize, type Emo } from "./style";
import { monthOfSeasonDay } from "./months";

export const meId = (g: GameState) => (g.user.mode === "coach" ? USER_COACH_ID : g.user.playerId ?? USER_COACH_ID);

export function dmId(pid: string) {
  return `dm:${pid}`;
}

export function teamThreadId(clubId: string) {
  return `time:${clubId}`;
}

/** Contatos: elenco atual + amigos antigos com amizade alta. */
export function contacts(g: GameState): Player[] {
  const me = meId(g);
  const club = g.user.clubId ? g.clubs[g.user.clubId] : undefined;
  const ids = new Set<string>((club?.squad ?? []).filter((id) => id !== me));
  for (const r of Object.values(g.relations)) {
    if (r.a !== me && r.b !== me) continue;
    const other = r.a === me ? r.b : r.a;
    if (r.friendship >= 50 && g.players[other] && !g.players[other].retired) ids.add(other);
  }
  return [...ids].map((id) => g.players[id]).filter(Boolean);
}

export function ensureDm(g: GameState, pid: string): ChatThread {
  const id = dmId(pid);
  let t = g.chat.threads[id];
  if (!t) {
    const p = g.players[pid];
    t = { id, kind: "dm", members: [pid], name: `${p.first} ${p.last}`, messages: [], read: 0 };
    g.chat.threads[id] = t;
  }
  return t;
}

export function ensureTeamThread(g: GameState): ChatThread | undefined {
  const cid = g.user.clubId;
  if (!cid) return;
  const club = g.clubs[cid];
  const id = teamThreadId(cid);
  let t = g.chat.threads[id];
  const me = meId(g);
  const members = club.squad
    .filter((x) => x !== me && g.players[x])
    .map((x) => g.players[x])
    .sort((a, b) => b.persona.extro + (getRel(g, me, b.id)?.friendship ?? 0) / 100 - (a.persona.extro + (getRel(g, me, a.id)?.friendship ?? 0) / 100))
    .slice(0, 6)
    .map((p) => p.id);
  if (!t) {
    t = { id, kind: "group", members, name: g.user.mode === "coach" ? `Elenco ${club.short} (oficial)` : `Resenha ${club.short} ⚽`, messages: [], read: 0 };
    g.chat.threads[id] = t;
  } else t.members = members;
  return t;
}

export function ensureGroupThread(g: GameState, groupId: string): ChatThread | undefined {
  const gr = g.groups.find((x) => x.id === groupId);
  if (!gr) return;
  const me = meId(g);
  const id = `grp:${groupId}`;
  let t = g.chat.threads[id];
  const members = gr.members.filter((m) => m !== me);
  if (g.user.mode === "player" && !gr.members.includes(me)) return; // só participa se fizer parte
  if (!t) {
    t = { id, kind: "group", members, name: `${gr.name} ${gr.members.length === 3 ? "🔥" : "🤝"}`, groupId, messages: [], read: 0 };
    g.chat.threads[id] = t;
  } else t.name = `${gr.name} ${gr.members.length === 3 ? "🔥" : "🤝"}`;
  return t;
}

export function pushMsg(g: GameState, t: ChatThread, from: string, text: string): ChatMsg {
  const m: ChatMsg = { id: g.chat.seq++, from, text, day: g.day };
  t.messages.push(m);
  if (t.messages.length > 220) t.messages.splice(0, t.messages.length - 220);
  if (from === "me") t.read = m.id;
  return m;
}

export function unreadCount(g: GameState, t?: ChatThread): number {
  if (t) return t.messages.filter((m) => m.id > t.read && m.from !== "me").length;
  return Object.values(g.chat.threads).reduce((s, x) => s + (x.muted ? 0 : unreadCount(g, x)), 0);
}

export function markRead(g: GameState, threadId: string) {
  const t = g.chat.threads[threadId];
  if (t && t.messages.length) t.read = t.messages[t.messages.length - 1].id;
}

export interface TurnPlan {
  threadId: string;
  text: string;
  responders: { id: string; reply: Reply; lines: string[] }[];
  facts: string[];
  profiles: { id: string; name: string; persona: string; style: string; relation: string; memories: string[] }[];
  recent: { from: string; text: string }[];
}

function personaDesc(p: Player): { persona: string; style: string } {
  const ps = p.persona;
  const LABEL: Record<string, string> = { brincalhao: "brincalhão", competitivo: "competitivo", timido: "tímido", leal: "leal", ambicioso: "ambicioso", arrogante: "arrogante", lider: "líder", emocional: "emocional" };
  return {
    persona: `${LABEL[ps.type]} (traço secundário: ${LABEL[ps.secondary]}). ${p.pos}, ${p.nation}. De ${ps.hometown || "?"}. Gosta de ${ps.hobby} e ${ps.food}. Sonho: ${ps.dream}. Aniversário em ${monthOfSeasonDay(ps.birthday)}.`,
    style: `Chama os amigos de "${ps.address}", ri com "${ps.laugh}", bordão "${ps.pet}". Gírias ${ps.slang > 0.6 ? "muitas" : ps.slang > 0.35 ? "algumas" : "poucas"}, emojis ${ps.emoji > 0.6 ? "frequentes" : ps.emoji > 0.3 ? "às vezes" : "raros"}, mensagens ${ps.verbosity > 0.6 ? "médias" : "curtas"}${ps.caps > 0.5 ? ", grita em CAIXA ALTA quando empolgado" : ""}.`,
  };
}

/** Planeja o turno: analisa a mensagem, escolhe quem responde e gera as falas locais. */
export function planTurn(g: GameState, threadId: string, text: string): TurnPlan {
  const t = g.chat.threads[threadId];
  const rng = new Rng(hashSeed(g.seed, threadId, g.chat.seq, text));
  const me = meId(g);
  const a = analyze(g, text, t.members.concat(g.user.clubId ? g.clubs[g.user.clubId].squad : []));
  const members = t.members.map((id) => g.players[id]).filter(Boolean);
  let chosen: Player[];
  if (t.kind === "dm") chosen = members;
  else {
    const scored = members.map((p) => {
      const ctx = buildCtx(g, p.id);
      const mentioned = a.mates.includes(p.id) || a.norm.includes(` ${p.first.toLowerCase()} `);
      return { p, s: relevanceFor({ g, rng, p, ctx, a, raw: text }, mentioned) + rng.range(-0.25, 0.25) };
    });
    chosen = scored.filter((x) => x.s > 0.6).sort((x, y) => y.s - x.s).slice(0, 3).map((x) => x.p);
    if (!chosen.length && scored.length) chosen = [scored.sort((x, y) => y.s - x.s)[0].p];
  }
  const gr = t.groupId ? g.groups.find((x) => x.id === t.groupId) : undefined;
  const prev: TurnInput["prev"] = [];
  const turnUsed = new Set<string>();
  const responders: TurnPlan["responders"] = [];
  for (const p of chosen) {
    const mind = mindOf(g, p.id);
    const ctx = buildCtx(g, p.id);
    const pending = mind.pending && g.day - mind.pending.day <= 3 ? mind.pending.topic : undefined;
    const reply = respond({ g, rng, p, ctx, a, pending, prev, used: mind.used, raw: text, turnUsed, group: gr ? { name: gr.name, goals: gr.goals, level: gr.level, size: gr.members.length } : undefined });
    const vars = {
      me: ctx.meName, club: ctx.clubName, opp: ctx.next?.opp ?? "", lopp: ctx.last?.opp ?? "", food: p.persona.food, hobby: p.persona.hobby,
      prev: prev[prev.length - 1]?.name ?? "",
    };
    if (reply.dup && t.kind === "group" && responders.length) continue; // ninguém repete o colega
    const lines = reply.lines.map((l) => stylize(l, p.persona, rng, reply.emo, vars)).filter(Boolean);
    responders.push({ id: p.id, reply, lines });
    prev.push({ name: p.first, type: p.persona.type, emo: reply.emo });
  }
  const recent = t.messages.slice(-10).map((m) => ({ from: m.from === "me" ? "Usuário" : g.players[m.from]?.first ?? "Sistema", text: m.text }));
  const profiles = chosen.map((p) => {
    const d = personaDesc(p);
    const r = getRel(g, me, p.id);
    return { id: p.id, name: p.first, ...d, relation: r ? `amizade ${Math.round(r.friendship)}/100, confiança ${Math.round(r.trust)}/100, rivalidade ${Math.round(r.rivalry)}/100` : "pouca intimidade", memories: memorySummary(g, p.id) };
  });
  return { threadId, text, responders, facts: ctxToFacts(g, buildCtx(g, chosen[0]?.id)), profiles, recent };
}

/** Aplica o turno: grava mensagens, ajusta relações e memórias, executa ações. */
export function commitTurn(g: GameState, plan: TurnPlan, override?: Record<string, string[]>): ChatMsg[] {
  const t = g.chat.threads[plan.threadId];
  const me = meId(g);
  pushMsg(g, t, "me", plan.text);
  const out: ChatMsg[] = [];
  const rng = new Rng(hashSeed(g.seed, plan.threadId, g.chat.seq));
  for (const r of plan.responders) {
    const mind = mindOf(g, r.id);
    const lines = override?.[r.id]?.length ? override[r.id] : r.lines;
    for (const l of lines) out.push(pushMsg(g, t, r.id, l));
    const rep = r.reply;
    mind.used.push(rep.id);
    if (mind.used.length > 40) mind.used.splice(0, mind.used.length - 40);
    mind.talks++;
    mind.lastTalk = g.day;
    if (rep.pending) mind.pending = { topic: rep.pending, day: g.day };
    else if (rep.clearPending) mind.pending = undefined;
    ensureRel(g, me, r.id);
    const d = rep.delta ?? {};
    // conversar aproxima um pouco, mas com teto diário
    bumpRel(g, me, r.id, { friendship: (d.friendship ?? 0) + (mind.talks % 4 === 0 ? 0.5 : 0), trust: d.trust, rivalry: d.rivalry });
    if (rep.memory) addMemory(g, r.id, rep.memory.kind, rep.memory.text);
    setMood(g, r.id, rep.emo === "feliz" || rep.emo === "hype" ? 4 : rep.emo === "triste" || rep.emo === "raiva" ? -4 : 0);
    if (rep.action?.kind === "advice") {
      const dec = g.decisions.find((x) => x.kind === "conselho_amigo" && x.data?.playerId === r.id);
      if (dec) resolveDecision(g, rng, dec.id, rep.action.option);
    }
    if (rep.action?.kind === "rename" && t.groupId) {
      const gr = g.groups.find((x) => x.id === t.groupId);
      if (gr) { gr.name = rep.action.name; gr.custom = true; t.name = `${gr.name} ${gr.members.length === 3 ? "🔥" : "🤝"}`; }
    }
  }
  t.read = out.length ? out[out.length - 1].id : t.read;
  return out;
}

export function sendMessage(g: GameState, threadId: string, text: string): ChatMsg[] {
  return commitTurn(g, planTurn(g, threadId, text));
}

/** Fala espontânea já estilizada. */
export function sayLine(g: GameState, rng: Rng, threadId: string, pid: string, raw: string, emo: Emo, extra: Record<string, string> = {}) {
  const t = g.chat.threads[threadId];
  const p = g.players[pid];
  if (!t || !p) return;
  const ctx = buildCtx(g, pid);
  const txt = stylize(raw, p.persona, rng, emo, { me: ctx.meName, club: ctx.clubName, opp: ctx.next?.opp ?? "", lopp: ctx.last?.opp ?? "", food: p.persona.food, ...extra });
  for (const part of txt.split("|").map((x) => x.trim()).filter(Boolean)) pushMsg(g, t, pid, part);
  mindOf(g, pid).lastSpont = g.day;
}
