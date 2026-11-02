import { ATTR_KEYS, POS_WEIGHTS } from "../constants";
import { clamp, Rng } from "../rng";
import type { AttrKey, GameState, Player, TrainingFocus } from "../types";
import { ageOf, calcOvr } from "./players";

export const FOCUS_ATTRS: Record<TrainingFocus, AttrKey[]> = {
  equilibrado: [],
  fisico: ["vel", "fis", "res"],
  tecnico: ["dri", "pas", "vis"],
  finalizacao: ["fin", "cab"],
  defesa: ["def", "fis", "cab"],
  mental: ["men", "vis"],
  descanso: [],
};

export const FOCUS_LABEL: Record<TrainingFocus, string> = {
  equilibrado: "Equilibrado",
  fisico: "Físico",
  tecnico: "Técnico",
  finalizacao: "Finalização",
  defesa: "Defesa",
  mental: "Mental",
  descanso: "Descanso",
};

/** Taxa base de evolução (overall por semana) pela idade. */
export function ageRate(age: number): number {
  if (age <= 19) return 0.17;
  if (age <= 21) return 0.135;
  if (age <= 23) return 0.09;
  if (age <= 26) return 0.045;
  if (age <= 28) return 0.015;
  if (age <= 30) return -0.02;
  if (age <= 32) return -0.06;
  if (age <= 34) return -0.1;
  return -0.15;
}

export interface GrowthCtx {
  minutesShare: number; // 0..1 do tempo possível jogado na temporada
  facilities: number;
  focus?: TrainingFocus;
  intensity?: 0 | 1 | 2;
}

export function weeklyDelta(p: Player, age: number, ctx: GrowthCtx): number {
  const base = ageRate(age);
  if (p.injury) return Math.min(0, base) - 0.01;
  const form = p.form.length ? p.form.reduce((a, b) => a + b, 0) / p.form.length : 6.5;
  if (base > 0) {
    const gap = Math.max(0, p.potential - p.ovr);
    const gapF = clamp(gap / 12, 0, 1.4);
    const minutesF = 0.45 + 0.8 * clamp(ctx.minutesShare, 0, 1);
    const trainF = 0.85 + 0.06 * ctx.facilities;
    const formF = clamp(1 + (form - 6.6) * 0.2, 0.8, 1.25);
    const intF = ctx.focus === "descanso" ? 0.2 : ctx.intensity === 2 ? 1.35 : ctx.intensity === 0 ? 0.75 : 1;
    return base * gapF * minutesF * trainF * formF * intF;
  }
  // veteranos: experiência e treino amortecem a queda
  const trainF = 1.05 - 0.04 * ctx.facilities;
  const intF = ctx.intensity === 2 ? 0.9 : 1;
  return base * trainF * intF;
}

/** Aplica o acumulador: cada ponto inteiro = +1 em todos os atributos relevantes. */
export function applyGrowth(rng: Rng, p: Player, focus?: TrainingFocus) {
  const w = POS_WEIGHTS[p.pos];
  while (p.progressAcc >= 1) {
    p.progressAcc -= 1;
    for (const k of ATTR_KEYS) {
      if ((w[k] ?? 0) > 0) p.attrs[k] = Math.min(99, p.attrs[k] + 1);
      else if (rng.chance(0.25)) p.attrs[k] = Math.min(99, p.attrs[k] + 1);
    }
    const f = focus ? FOCUS_ATTRS[focus] : [];
    for (const k of f) p.attrs[k] = Math.min(99, p.attrs[k] + (rng.chance(0.7) ? 1 : 0));
  }
  while (p.progressAcc <= -1) {
    p.progressAcc += 1;
    p.attrs.vel = Math.max(10, p.attrs.vel - 2);
    p.attrs.res = Math.max(10, p.attrs.res - 2);
    p.attrs.fis = Math.max(10, p.attrs.fis - (rng.chance(0.6) ? 1 : 0));
    p.attrs.dri = Math.max(10, p.attrs.dri - (rng.chance(0.4) ? 1 : 0));
    p.attrs.fin = Math.max(10, p.attrs.fin - (rng.chance(0.25) ? 1 : 0));
    p.attrs.def = Math.max(10, p.attrs.def - (rng.chance(0.25) ? 1 : 0));
    if (p.pos === "GOL") p.attrs.gol = Math.max(10, p.attrs.gol - (rng.chance(0.5) ? 1 : 0));
    // experiência
    if (rng.chance(0.5)) p.attrs.men = Math.min(99, p.attrs.men + 1);
    if (rng.chance(0.4)) p.attrs.vis = Math.min(99, p.attrs.vis + 1);
    if (rng.chance(0.3)) p.attrs.pas = Math.min(99, p.attrs.pas + 1);
  }
  p.ovr = calcOvr(p);
}

export function weeklyProgression(g: GameState, rng: Rng, weekOfSeason: number) {
  const possibleMinutes = Math.max(90, weekOfSeason * 90 * 1.1);
  for (const p of Object.values(g.players)) {
    if (p.retired) continue;
    const age = ageOf(p, g.day);
    const club = p.clubId ? g.clubs[p.clubId] : undefined;
    const isUser = (p.isUser && g.user.mode === "player") || (g.user.mode === "coach" && !g.user.unemployed && p.clubId === g.user.clubId);
    const ctx: GrowthCtx = {
      minutesShare: weekOfSeason < 3 ? 0.6 : p.stats.minutes / possibleMinutes,
      facilities: club?.facilities ?? 2,
      focus: isUser ? g.user.training.focus : undefined,
      intensity: isUser ? g.user.training.intensity : 1,
    };
    if (!club) ctx.minutesShare = 0.2;
    p.progressAcc += weeklyDelta(p, age, ctx);
    if (p.progressAcc >= 1 || p.progressAcc <= -1) applyGrowth(rng, p, ctx.focus);
    // potencial oculto pode mudar com desempenho
    if (age <= 22 && p.form.length >= 4) {
      const avg = p.form.reduce((a, b) => a + b, 0) / p.form.length;
      if (avg >= 7.4 && rng.chance(0.04)) p.potential = Math.min(99, p.potential + 1);
    }
  }
}
