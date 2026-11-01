import type { AttrKey, NationId, Pos } from "./types";

export const ATTR_KEYS: AttrKey[] = ["vel", "fin", "pas", "dri", "def", "fis", "res", "vis", "cab", "men", "gol"];

export const ATTR_LABEL: Record<AttrKey, string> = {
  vel: "Velocidade",
  fin: "Finalização",
  pas: "Passe",
  dri: "Drible",
  def: "Marcação",
  fis: "Físico",
  res: "Resistência",
  vis: "Visão",
  cab: "Cabeceio",
  men: "Mentalidade",
  gol: "Goleiro",
};

export const POS_LABEL: Record<Pos, string> = {
  GOL: "Goleiro",
  ZAG: "Zagueiro",
  LAT: "Lateral",
  VOL: "Volante",
  MEI: "Meia",
  PON: "Ponta",
  ATA: "Atacante",
};

export const POSITIONS: Pos[] = ["GOL", "ZAG", "LAT", "VOL", "MEI", "PON", "ATA"];

/** Pesos de cada atributo no overall por posição (soma 1). */
export const POS_WEIGHTS: Record<Pos, Partial<Record<AttrKey, number>>> = {
  GOL: { gol: 0.72, men: 0.1, pas: 0.05, fis: 0.05, vel: 0.04, cab: 0.04 },
  ZAG: { def: 0.35, cab: 0.17, fis: 0.17, men: 0.1, vel: 0.08, pas: 0.08, res: 0.05 },
  LAT: { def: 0.22, vel: 0.2, res: 0.14, pas: 0.14, dri: 0.1, fis: 0.08, men: 0.06, vis: 0.06 },
  VOL: { def: 0.26, pas: 0.2, res: 0.12, fis: 0.12, men: 0.12, vis: 0.1, vel: 0.04, dri: 0.04 },
  MEI: { pas: 0.24, vis: 0.22, dri: 0.16, men: 0.1, fin: 0.1, res: 0.08, vel: 0.05, def: 0.05 },
  PON: { vel: 0.24, dri: 0.24, fin: 0.14, pas: 0.12, vis: 0.08, res: 0.08, men: 0.06, cab: 0.04 },
  ATA: { fin: 0.32, cab: 0.14, men: 0.12, vel: 0.12, dri: 0.1, fis: 0.1, pas: 0.05, vis: 0.05 },
};

/** Posições parecidas (jogar fora da posição perde menos). */
export const POS_NEAR: Record<Pos, Pos[]> = {
  GOL: [],
  ZAG: ["VOL", "LAT"],
  LAT: ["ZAG", "PON"],
  VOL: ["ZAG", "MEI"],
  MEI: ["VOL", "PON", "ATA"],
  PON: ["MEI", "ATA", "LAT"],
  ATA: ["PON", "MEI"],
};

export const FORMATIONS: Record<string, Pos[]> = {
  "4-3-3": ["GOL", "LAT", "ZAG", "ZAG", "LAT", "VOL", "MEI", "MEI", "PON", "ATA", "PON"],
  "4-4-2": ["GOL", "LAT", "ZAG", "ZAG", "LAT", "VOL", "VOL", "MEI", "PON", "ATA", "ATA"],
  "4-2-3-1": ["GOL", "LAT", "ZAG", "ZAG", "LAT", "VOL", "VOL", "PON", "MEI", "PON", "ATA"],
  "3-5-2": ["GOL", "ZAG", "ZAG", "ZAG", "LAT", "VOL", "MEI", "MEI", "LAT", "ATA", "ATA"],
  "5-3-2": ["GOL", "LAT", "ZAG", "ZAG", "ZAG", "LAT", "VOL", "MEI", "MEI", "ATA", "ATA"],
  "4-1-2-1-2": ["GOL", "LAT", "ZAG", "ZAG", "LAT", "VOL", "MEI", "MEI", "MEI", "ATA", "ATA"],
};

/** Coordenadas (x 0..100 largura, y 0..100 do gol próprio ao ataque) para desenhar o campinho. */
export const FORMATION_COORDS: Record<string, [number, number][]> = {
  "4-3-3": [[50, 6], [12, 28], [37, 22], [63, 22], [88, 28], [50, 44], [30, 56], [70, 56], [15, 78], [50, 86], [85, 78]],
  "4-4-2": [[50, 6], [12, 28], [37, 22], [63, 22], [88, 28], [36, 48], [64, 48], [50, 64], [12, 62], [36, 84], [64, 84]],
  "4-2-3-1": [[50, 6], [12, 28], [37, 22], [63, 22], [88, 28], [36, 44], [64, 44], [15, 68], [50, 66], [85, 68], [50, 86]],
  "3-5-2": [[50, 6], [27, 22], [50, 20], [73, 22], [10, 52], [50, 42], [32, 58], [68, 58], [90, 52], [36, 84], [64, 84]],
  "5-3-2": [[50, 6], [8, 32], [28, 22], [50, 20], [72, 22], [92, 32], [50, 44], [30, 58], [70, 58], [36, 84], [64, 84]],
  "4-1-2-1-2": [[50, 6], [12, 28], [37, 22], [63, 22], [88, 28], [50, 40], [30, 54], [70, 54], [50, 68], [36, 86], [64, 86]],
};

export const SQUAD_TEMPLATE: Record<Pos, number> = { GOL: 3, ZAG: 4, LAT: 4, VOL: 3, MEI: 3, PON: 3, ATA: 4 };

// ---------- Calendário ----------
/** A temporada tem 364 dias. Dia 0 = sábado, 1º de agosto. */
export const SEASON_DAYS = 364;
export const BASE_YEAR = 2026;
export const BASE_DATE = Date.UTC(2026, 7, 1); // 1º ago 2026, sábado
export const LEAGUE_WEEKS = (() => {
  const breaks = new Set([5, 9, 13, 17, 20, 21, 26, 30, 34, 38]);
  const w: number[] = [];
  for (let i = 2; i <= 41 && w.length < 30; i++) if (!breaks.has(i)) w.push(i);
  return w;
})();
export const INTL_BREAK_WEEKS = [5, 9, 13, 17, 26, 30, 38];
export const WINDOW_WEEKS: [number, number][] = [
  [0, 3],
  [19, 23],
  [43, 51],
];
export const SEASON_WRAP_OFFSET = 42 * 7 + 5; // quinta da semana 42, depois do Mundial de Clubes
export const ROLLOVER_OFFSET = SEASON_DAYS - 1;

export interface NationDef {
  id: NationId;
  name: string;
  adj: string;
  region: "AS" | "EU";
  colors: [string, string];
  leagues: { name: string; short: string; teams: number; strength: number; tier: number }[];
  cupName?: string;
  supercupName?: string;
  /** peso para gerar jogadores estrangeiros desta nacionalidade */
  exportWeight: number;
}

export const NATIONS: NationDef[] = [
  {
    id: "BRA", name: "Brasil", adj: "brasileiro", region: "AS", colors: ["#f2d22e", "#1e8c45"],
    leagues: [
      { name: "Liga Nacional Brasileira", short: "LNB", teams: 16, strength: 70, tier: 1 },
      { name: "Liga Brasileira Acesso", short: "LBA", teams: 16, strength: 60, tier: 2 },
    ],
    cupName: "Copa do Brasil Legacy", supercupName: "Supercopa Brasileira", exportWeight: 6,
  },
  {
    id: "ARG", name: "Argentina", adj: "argentino", region: "AS", colors: ["#7cc3ea", "#ffffff"],
    leagues: [{ name: "Primera Liga Argentina", short: "PLA", teams: 16, strength: 67, tier: 1 }],
    cupName: "Copa Argentina Legacy", supercupName: "Supercopa Argentina", exportWeight: 4,
  },
  {
    id: "ING", name: "Inglaterra", adj: "inglês", region: "EU", colors: ["#ffffff", "#c8102e"],
    leagues: [
      { name: "Premier Division", short: "PRD", teams: 16, strength: 78, tier: 1 },
      { name: "Championship League", short: "CHL", teams: 16, strength: 66, tier: 2 },
    ],
    cupName: "Copa da Inglaterra Legacy", supercupName: "Escudo da Inglaterra", exportWeight: 3,
  },
  {
    id: "ESP", name: "Espanha", adj: "espanhol", region: "EU", colors: ["#c60b1e", "#ffc400"],
    leagues: [{ name: "Liga Ibérica", short: "LIB", teams: 16, strength: 76, tier: 1 }],
    cupName: "Copa del Rey Legacy", supercupName: "Supercopa da Espanha", exportWeight: 3,
  },
  {
    id: "ITA", name: "Itália", adj: "italiano", region: "EU", colors: ["#0b4ea2", "#ffffff"],
    leagues: [{ name: "Serie Italiana", short: "SIT", teams: 16, strength: 75, tier: 1 }],
    cupName: "Copa da Itália Legacy", supercupName: "Supercopa da Itália", exportWeight: 3,
  },
  {
    id: "ALE", name: "Alemanha", adj: "alemão", region: "EU", colors: ["#111111", "#dd0000"],
    leagues: [{ name: "Bundesliga Legacy", short: "BDL", teams: 16, strength: 74, tier: 1 }],
    cupName: "Copa da Alemanha Legacy", supercupName: "Supercopa da Alemanha", exportWeight: 3,
  },
  { id: "FRA", name: "França", adj: "francês", region: "EU", colors: ["#002395", "#ffffff"], leagues: [], exportWeight: 4 },
  { id: "POR", name: "Portugal", adj: "português", region: "EU", colors: ["#006600", "#ff0000"], leagues: [], exportWeight: 3 },
  { id: "URU", name: "Uruguai", adj: "uruguaio", region: "AS", colors: ["#5cbfeb", "#ffffff"], leagues: [], exportWeight: 2 },
  { id: "COL", name: "Colômbia", adj: "colombiano", region: "AS", colors: ["#fcd116", "#003893"], leagues: [], exportWeight: 2 },
  { id: "HOL", name: "Holanda", adj: "holandês", region: "EU", colors: ["#ff6600", "#ffffff"], leagues: [], exportWeight: 2 },
];

export const NATION_BY_ID: Record<string, NationDef> = Object.fromEntries(NATIONS.map((n) => [n.id, n]));

/** Seleções que disputam a Copa das Nações. */
export const NATIONAL_TEAMS: NationId[] = ["BRA", "ARG", "ING", "ESP", "ITA", "ALE", "FRA", "POR"];
