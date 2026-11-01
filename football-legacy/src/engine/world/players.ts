import { ATTR_KEYS, BASE_DATE, POS_NEAR, POS_WEIGHTS, SEASON_DAYS } from "../constants";
import { ADDRESS_ARG, ADDRESS_BRA, ADDRESS_ESP, ADDRESS_OTHER, DREAMS, FIRST, FOODS, HOBBIES, LAST, LAUGHS, PET_PHRASES } from "../data/names";
import { clamp, Rng } from "../rng";
import type { Attrs, Foot, GameState, NationId, Persona, PersonalityType, Player, Pos, SeasonStats } from "../types";

export const emptyStats = (): SeasonStats => ({
  apps: 0, starts: 0, minutes: 0, goals: 0, assists: 0, yellows: 0, reds: 0, ratingSum: 0, cleanSheets: 0, motm: 0,
});

export function ageOf(p: Player, day: number): number {
  return Math.floor((day - p.birth) / SEASON_DAYS);
}

export function dateOf(day: number): Date {
  return new Date(BASE_DATE + day * 86400000);
}

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
export function formatDate(day: number, withWeekday = false): string {
  const d = dateOf(day);
  const s = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  return withWeekday ? `${WEEKDAYS[d.getUTCDay()]}, ${s}` : s;
}
export function formatShortDate(day: number): string {
  const d = dateOf(day);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
export function seasonLabel(season: number): string {
  const y = 2026 + season;
  return `${y}/${String((y + 1) % 100).padStart(2, "0")}`;
}

export function ratingAt(attrs: Attrs, pos: Pos): number {
  const w = POS_WEIGHTS[pos];
  let s = 0;
  let t = 0;
  for (const k in w) {
    const wk = w[k as keyof Attrs]!;
    s += attrs[k as keyof Attrs] * wk;
    t += wk;
  }
  return s / t;
}

export function calcOvr(p: Pick<Player, "attrs" | "pos">): number {
  return Math.round(ratingAt(p.attrs, p.pos));
}

/** Nota do jogador numa posição específica, com penalidade fora de posição. */
export function posRating(p: Player, pos: Pos): number {
  if (p.pos === pos) return p.ovr;
  const base = ratingAt(p.attrs, pos);
  if (p.alt.includes(pos)) return base * 0.97;
  if (POS_NEAR[p.pos].includes(pos)) return base * 0.9;
  if (pos === "GOL" || p.pos === "GOL") return base * 0.5;
  return base * 0.8;
}

export function fullName(p: Player): string {
  return `${p.first} ${p.last}`;
}
export function shortName(p: Player): string {
  return `${p.first.charAt(0)}. ${p.last}`;
}

/** Valor de mercado: overall, idade, potencial, contrato, forma e fama. */
export function marketValue(p: Player, season: number, day: number): number {
  if (p.retired) return 0;
  const age = ageOf(p, day);
  const o = p.ovr;
  let v = Math.pow(1.17, o - 50) * 45_000;
  const potGap = Math.max(0, p.potential - o);
  if (age <= 23) v *= 1 + potGap * 0.045 * ((24 - age) / 6);
  if (age >= 29) v *= Math.max(0.15, 1 - (age - 28) * 0.13);
  const years = p.contract.until - season;
  if (p.clubId) v *= years <= 0 ? 0.45 : years === 1 ? 0.75 : 1;
  const avg = p.form.length ? p.form.reduce((a, b) => a + b, 0) / p.form.length : 6.5;
  v *= clamp(1 + (avg - 6.6) * 0.12, 0.8, 1.25);
  v *= 1 + p.reputation / 300;
  if (p.injury && p.injury.days > 40) v *= 0.8;
  return roundMoney(v);
}

export function fairWage(p: Player, day: number): number {
  const age = ageOf(p, day);
  let w = Math.pow(1.145, p.ovr - 50) * 900;
  if (age >= 30) w *= 1.05;
  w *= 1 + p.reputation / 250;
  return roundMoney(w, 100);
}

export function roundMoney(v: number, step?: number): number {
  const s = step ?? (v >= 10_000_000 ? 250_000 : v >= 1_000_000 ? 50_000 : v >= 100_000 ? 5_000 : 500);
  return Math.max(0, Math.round(v / s) * s);
}

export function formatMoney(v: number): string {
  const a = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (a >= 1_000_000) return `${sign}€${(a / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 1).replace(".", ",")}M`;
  if (a >= 1_000) return `${sign}€${Math.round(a / 1_000)}mil`;
  return `${sign}€${Math.round(a)}`;
}

export function avgRating(p: Player): number {
  return p.stats.apps ? p.stats.ratingSum / p.stats.apps : 0;
}

// ---------- geração ----------
const STYLE_BIAS: Record<string, Partial<Attrs>> = {
  Artilheiro: { fin: 8, cab: 4, men: 3, pas: -4, def: -4 },
  Velocista: { vel: 9, dri: 4, res: 2, cab: -4, fis: -3 },
  Armador: { pas: 8, vis: 7, men: 2, fis: -4, cab: -4 },
  Driblador: { dri: 9, vel: 3, vis: 2, def: -5, cab: -4 },
  Muralha: { def: 7, fis: 5, cab: 5, dri: -5, vel: -2 },
  "Box-to-box": { res: 8, fis: 4, pas: 3, def: 2, fin: -3, vis: -2 },
  Maestro: { vis: 8, pas: 6, men: 5, vel: -4, fis: -4 },
  Reflexos: { gol: 5, men: 3, vel: 2 },
};
export const PLAY_STYLES = Object.keys(STYLE_BIAS);

export function generateAttrs(rng: Rng, pos: Pos, target: number, style?: string): Attrs {
  const w = POS_WEIGHTS[pos];
  const a = {} as Attrs;
  for (const k of ATTR_KEYS) {
    const wk = w[k] ?? 0;
    let v: number;
    if (k === "gol") v = pos === "GOL" ? target + rng.normal(0, 3) : rng.int(8, 22);
    else if (pos === "GOL") v = wk > 0 ? target - 8 + rng.normal(0, 5) : target - 25 + rng.normal(0, 8);
    else if (wk >= 0.15) v = target + 3 + rng.normal(0, 4);
    else if (wk > 0) v = target - 2 + rng.normal(0, 6);
    else v = target - 16 + rng.normal(0, 9);
    a[k] = v;
  }
  if (style && STYLE_BIAS[style]) {
    for (const [k, d] of Object.entries(STYLE_BIAS[style])) a[k as keyof Attrs] += d!;
  }
  // ajusta para que o overall bata com o alvo
  for (let it = 0; it < 4; it++) {
    const diff = target - ratingAt(a, pos);
    if (Math.abs(diff) < 0.4) break;
    for (const k of ATTR_KEYS) if ((w[k] ?? 0) > 0) a[k] += diff;
  }
  for (const k of ATTR_KEYS) a[k] = Math.round(clamp(a[k], 5, 99));
  return a;
}

const PERSONALITIES: PersonalityType[] = ["brincalhao", "competitivo", "timido", "leal", "ambicioso", "arrogante", "lider", "emocional"];

export function generatePersona(rng: Rng, nation: NationId, age: number): Persona {
  const type = rng.pick(PERSONALITIES);
  let secondary = rng.pick(PERSONALITIES);
  if (secondary === type) secondary = PERSONALITIES[(PERSONALITIES.indexOf(type) + 3) % PERSONALITIES.length];
  const base: Record<PersonalityType, Partial<Persona>> = {
    brincalhao: { humor: 0.9, emoji: 0.8, slang: 0.85, caps: 0.6, verbosity: 0.55, extro: 0.9 },
    competitivo: { humor: 0.5, emoji: 0.5, slang: 0.6, caps: 0.55, verbosity: 0.5, extro: 0.7 },
    timido: { humor: 0.3, emoji: 0.25, slang: 0.4, caps: 0.05, verbosity: 0.15, extro: 0.2 },
    leal: { humor: 0.5, emoji: 0.45, slang: 0.6, caps: 0.2, verbosity: 0.55, extro: 0.6 },
    ambicioso: { humor: 0.35, emoji: 0.3, slang: 0.45, caps: 0.2, verbosity: 0.5, extro: 0.55 },
    arrogante: { humor: 0.55, emoji: 0.55, slang: 0.65, caps: 0.5, verbosity: 0.45, extro: 0.75 },
    lider: { humor: 0.4, emoji: 0.3, slang: 0.5, caps: 0.15, verbosity: 0.7, extro: 0.7 },
    emocional: { humor: 0.5, emoji: 0.85, slang: 0.6, caps: 0.6, verbosity: 0.6, extro: 0.65 },
  };
  const b = base[type];
  const j = (v: number | undefined) => Math.round(clamp((v ?? 0.5) + rng.normal(0, 0.1), 0, 1) * 100) / 100;
  const addressPool = nation === "BRA" || nation === "POR" ? ADDRESS_BRA : nation === "ARG" || nation === "URU" ? ADDRESS_ARG : nation === "ESP" || nation === "COL" ? ADDRESS_ESP : ADDRESS_OTHER;
  return {
    type,
    secondary,
    humor: j(b.humor),
    emoji: j(b.emoji),
    slang: j((b.slang ?? 0.5) - (age > 30 ? 0.15 : 0)),
    caps: j(b.caps),
    verbosity: j(b.verbosity),
    typo: Math.round(rng.next() * 50) / 100,
    extro: j(b.extro),
    laugh: type === "timido" ? rng.pick(["kkk", "rsrs", "haha"]) : rng.pick(LAUGHS),
    address: rng.pick(addressPool),
    pet: rng.pick(PET_PHRASES),
    hobby: rng.pick(HOBBIES),
    food: rng.pick(FOODS),
    dream: rng.pick(DREAMS),
    hometown: "",
    birthday: rng.int(0, 363),
  };
}

export function altPositions(rng: Rng, pos: Pos): Pos[] {
  const near = POS_NEAR[pos];
  if (!near.length) return [];
  return rng.chance(0.55) ? [rng.pick(near)] : [];
}

export interface NewPlayerOpts {
  nation: NationId;
  pos: Pos;
  age: number;
  ovr: number;
  potential: number;
  clubId: string | null;
  style?: string;
  first?: string;
  last?: string;
  foot?: Foot;
  height?: number;
}

export function createPlayer(g: GameState, rng: Rng, o: NewPlayerOpts): Player {
  const id = `p${g.ids++}`;
  const birth = g.day - o.age * SEASON_DAYS - rng.int(0, SEASON_DAYS - 1);
  const attrs = generateAttrs(rng, o.pos, o.ovr, o.style);
  const persona = generatePersona(rng, o.nation, o.age);
  persona.birthday = ((birth % SEASON_DAYS) + SEASON_DAYS) % SEASON_DAYS;
  const height = o.height ?? Math.round(o.pos === "GOL" ? rng.range(183, 197) : o.pos === "ZAG" ? rng.range(178, 194) : rng.range(166, 189));
  const p: Player = {
    id,
    first: o.first ?? rng.pick(FIRST[o.nation]),
    last: o.last ?? rng.pick(LAST[o.nation]),
    nation: o.nation,
    birth,
    pos: o.pos,
    alt: altPositions(rng, o.pos),
    foot: o.foot ?? (rng.chance(0.24) ? "E" : rng.chance(0.05) ? "A" : "D"),
    height,
    attrs,
    potential: Math.round(clamp(Math.max(o.potential, o.ovr), 30, 99)),
    ovr: 0,
    clubId: o.clubId,
    contract: { wage: 0, until: g.season + rng.int(1, 4) },
    value: 0,
    morale: rng.int(60, 80),
    fitness: 100,
    form: [],
    injury: null,
    suspended: 0,
    yellowAcc: 0,
    reputation: 0,
    persona,
    stats: emptyStats(),
    compStats: {},
    career: [],
    clubs: [],
    intl: { caps: 0, goals: 0 },
    joinedDay: g.day,
    style: o.style,
    trophies: [],
    progressAcc: 0,
  };
  p.ovr = calcOvr(p);
  p.reputation = Math.round(clamp((p.ovr - 55) * 2.2 + rng.normal(0, 5), 0, 100));
  p.contract.wage = fairWage(p, g.day);
  p.value = marketValue(p, g.season, g.day);
  g.players[id] = p;
  return p;
}
