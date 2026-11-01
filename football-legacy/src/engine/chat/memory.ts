/** Memória de longo prazo dos personagens: fatos importantes, não o histórico bruto. */
import type { GameState, Memory, MemoryKind, Mind } from "../types";

export function mindOf(g: GameState, id: string): Mind {
  let m = g.chat.minds[id];
  if (!m) {
    m = { id, memories: [], mood: 0, lastTalk: -99, used: [], talks: 0, lastSpont: -99 };
    g.chat.minds[id] = m;
  }
  return m;
}

const WEIGHT: Record<MemoryKind, number> = {
  promessa_ficar: 5, quebrou_promessa: 5, apoio: 4, ofensa: 4, titulo_junto: 4, saiu_sem_avisar: 5, avisou_saida: 3,
  aniversario: 2, conflito: 4, reconciliacao: 3, conselho: 3, zoeira: 1, elogio: 2, convite: 2, derrota_dura: 3, pediu_conselho: 3, fato: 2,
};

export function addMemory(g: GameState, id: string, kind: MemoryKind, text: string, weight?: number): Memory {
  const m = mindOf(g, id);
  const mem: Memory = { id: g.chat.seq++, day: g.day, kind, text, weight: weight ?? WEIGHT[kind] };
  // fatos repetidos do mesmo tipo no mesmo dia viram um só
  const dup = m.memories.find((x) => x.kind === kind && x.day === g.day);
  if (dup) { dup.text = text; return dup; }
  m.memories.push(mem);
  // mantém as 24 mais relevantes (peso decai com o tempo)
  if (m.memories.length > 24) {
    m.memories.sort((a, b) => relevance(g, b) - relevance(g, a));
    m.memories.length = 24;
    m.memories.sort((a, b) => a.day - b.day);
  }
  return mem;
}

export function relevance(g: GameState, mem: Memory): number {
  const age = (g.day - mem.day) / 120;
  return mem.weight / (1 + age);
}

export function hasMemory(g: GameState, id: string, kind: MemoryKind, sinceDays = 99999): Memory | undefined {
  const m = g.chat.minds[id];
  return m?.memories.slice().reverse().find((x) => x.kind === kind && g.day - x.day <= sinceDays);
}

/** Resumo persistente (curto) para contexto do modelo de IA e da interface. */
export function memorySummary(g: GameState, id: string, max = 6): string[] {
  const m = g.chat.minds[id];
  if (!m) return [];
  return [...m.memories].sort((a, b) => relevance(g, b) - relevance(g, a)).slice(0, max).map((x) => x.text);
}

export function setMood(g: GameState, id: string, delta: number) {
  const m = mindOf(g, id);
  m.mood = Math.max(-100, Math.min(100, m.mood + delta));
}
