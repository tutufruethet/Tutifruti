"use client";
import { create } from "zustand";
import type { GameState, Settings } from "@/engine/types";
import { advance as engineAdvance, commitMatch, type AdvanceMode, type AdvanceResult, withRng } from "@/engine/season/advance";
import { createMatch, simulateToEnd, type MatchState } from "@/engine/match/engine";
import { commitTurn, planTurn, type TurnPlan } from "@/engine/chat/chat";
import { localBackend, metaOf, addToHall, type HallEntry } from "./persist";
import { legacyScore } from "@/engine/career/player";

export interface LiveMatch {
  fixtureId: string;
  ms: MatchState;
  mode: "ao_vivo" | "interativa";
  tick: number;
}

interface Store {
  game: GameState | null;
  v: number;
  saving: boolean;
  lastSavedAt: number;
  pendingMatch: string | null;
  live: LiveMatch | null;
  toast: string | null;
  aiStatus: "desconhecido" | "disponivel" | "indisponivel";
  typingUntil: Record<string, number>;
  setGame: (g: GameState | null) => void;
  act: <T>(fn: (g: GameState) => T) => T | undefined;
  bump: () => void;
  advance: (mode: AdvanceMode) => AdvanceResult | undefined;
  playInstant: (fixtureId: string) => void;
  startLive: (fixtureId: string, mode: "ao_vivo" | "interativa") => void;
  tickLive: () => void;
  finishLive: () => void;
  closePending: () => void;
  send: (threadId: string, text: string) => Promise<void>;
  saveNow: () => Promise<void>;
  setSettings: (s: Partial<Settings>) => void;
  showToast: (t: string | null) => void;
  checkAI: () => Promise<void>;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function hallEntry(g: GameState): HallEntry {
  const me = g.user.playerId ? g.players[g.user.playerId] : undefined;
  const clubs = me ? [...new Set(me.clubs.map((c) => c.clubName))] : [...new Set(g.history.userSeasons.map((s) => s.clubName))];
  return {
    id: g.id, name: g.user.name, mode: g.user.mode, seasons: g.season - g.user.startSeason, score: legacyScore(g),
    goals: me ? me.career.reduce((s, c) => s + c.goals, 0) : undefined, apps: me ? me.career.reduce((s, c) => s + c.apps, 0) : undefined,
    titles: g.history.milestones.filter((m) => m.text.startsWith("Título")).length,
    awards: g.history.awards.filter((a) => (me ? a.playerId === me.id : a.name === g.user.name)).length,
    peakOvr: me ? Math.max(me.ovr, ...me.career.map((c) => c.ovr)) : undefined, clubs, endedAt: Date.now(),
  };
}

export const useGame = create<Store>((set, get) => ({
  game: null,
  v: 0,
  saving: false,
  lastSavedAt: 0,
  pendingMatch: null,
  live: null,
  toast: null,
  aiStatus: "desconhecido",
  typingUntil: {},
  setGame: (g) => set({ game: g, v: get().v + 1, pendingMatch: null, live: null }),
  bump: () => {
    set({ v: get().v + 1 });
    const g = get().game;
    if (g?.settings.autosave) {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => void get().saveNow(), 700);
    }
  },
  act: (fn) => {
    const g = get().game;
    if (!g) return undefined;
    const out = fn(g);
    get().bump();
    return out;
  },
  advance: (mode) => {
    const g = get().game;
    if (!g || get().live) return;
    const r = engineAdvance(g, mode);
    if (r.stop === "match" && r.fixtureId) set({ pendingMatch: r.fixtureId });
    if (r.stop === "retired" || (g.user.retired && !g.user.hallOfFameSaved)) {
      g.user.hallOfFameSaved = true;
      void addToHall(hallEntry(g));
    }
    get().bump();
    return r;
  },
  playInstant: (fixtureId) => {
    const g = get().game;
    if (!g) return;
    const fx = g.fixtures[fixtureId];
    if (!fx || fx.played) return set({ pendingMatch: null });
    const ms = withRng(g, () => simulateToEnd(g, createMatch(g, fx)));
    commitMatch(g, fx, ms);
    set({ pendingMatch: null });
    get().bump();
  },
  startLive: (fixtureId, mode) => {
    const g = get().game;
    if (!g) return;
    const fx = g.fixtures[fixtureId];
    if (!fx || fx.played) return;
    const ms = createMatch(g, fx, { interactive: mode === "interativa" });
    set({ live: { fixtureId, ms, mode, tick: 0 }, pendingMatch: null });
  },
  tickLive: () => {
    const live = get().live;
    const g = get().game;
    if (!live || !g) return;
    set({ live: { ...live, tick: live.tick + 1 } });
  },
  finishLive: () => {
    const live = get().live;
    const g = get().game;
    if (!live || !g) return;
    if (!live.ms.finished) simulateToEnd(g, live.ms);
    const fx = g.fixtures[live.fixtureId];
    if (fx && !fx.played) commitMatch(g, fx, live.ms);
    set({ live: null });
    get().bump();
  },
  closePending: () => set({ pendingMatch: null }),
  send: async (threadId, text) => {
    const g = get().game;
    if (!g || !text.trim()) return;
    const plan: TurnPlan = planTurn(g, threadId, text.trim());
    let override: Record<string, string[]> | undefined;
    const s = g.settings;
    if (s.advancedAI && get().aiStatus === "disponivel") {
      if (g.chat.aiDay !== g.day) { g.chat.aiDay = g.day; g.chat.aiUsedToday = 0; }
      if (g.chat.aiUsedToday < s.aiDailyLimit) {
        try {
          const res = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ facts: plan.facts, profiles: plan.profiles, recent: plan.recent, message: plan.text, draft: Object.fromEntries(plan.responders.map((r) => [r.id, r.lines])) }) });
          if (res.ok) {
            const data = (await res.json()) as { replies?: Record<string, string[]> };
            if (data.replies) { override = data.replies; g.chat.aiUsedToday++; }
          }
        } catch { /* cai para o modo local */ }
      } else get().showToast("Limite diário de mensagens com IA atingido. Usando o modo local.");
    }
    const msgs = commitTurn(g, plan, override);
    if (g.settings.typingAnimation) {
      const now = Date.now();
      const until: Record<string, number> = { ...get().typingUntil };
      let acc = now;
      for (const m of msgs) {
        acc += 700 + Math.min(2600, m.text.length * 45);
        until[`${threadId}:${m.id}`] = acc;
      }
      set({ typingUntil: until });
    }
    get().bump();
  },
  saveNow: async () => {
    const g = get().game;
    if (!g) return;
    set({ saving: true });
    g.updatedAt = Date.now();
    try { await localBackend.save(g); } finally { set({ saving: false, lastSavedAt: Date.now() }); }
    void metaOf;
  },
  setSettings: (s) => {
    const g = get().game;
    if (!g) return;
    g.settings = { ...g.settings, ...s };
    get().bump();
  },
  showToast: (t) => {
    set({ toast: t });
    if (t) setTimeout(() => { if (get().toast === t) set({ toast: null }); }, 3800);
  },
  checkAI: async () => {
    try {
      const r = await fetch("/api/chat", { method: "GET" });
      const d = (await r.json()) as { available?: boolean };
      set({ aiStatus: d.available ? "disponivel" : "indisponivel" });
    } catch {
      set({ aiStatus: "indisponivel" });
    }
  },
}));

/** Assina o estado e re-renderiza quando o jogo muda. */
export function useG(): GameState {
  const g = useGame((s) => s.game);
  useGame((s) => s.v);
  return g!;
}
