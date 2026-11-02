// Modelos centrais do universo Football Legacy.
// O estado inteiro do jogo é um objeto JSON serializável (GameState).

export type Pos = "GOL" | "ZAG" | "LAT" | "VOL" | "MEI" | "PON" | "ATA";
export type AttrKey = "vel" | "fin" | "pas" | "dri" | "def" | "fis" | "res" | "vis" | "cab" | "men" | "gol";
export type Attrs = Record<AttrKey, number>;
export type Foot = "D" | "E" | "A";
export type NationId = "BRA" | "ARG" | "ING" | "ESP" | "ITA" | "ALE" | "FRA" | "POR" | "URU" | "COL" | "HOL";

export type PersonalityType =
  | "brincalhao"
  | "competitivo"
  | "timido"
  | "leal"
  | "ambicioso"
  | "arrogante"
  | "lider"
  | "emocional";

export interface Persona {
  type: PersonalityType;
  secondary: PersonalityType;
  humor: number; // 0..1
  emoji: number; // 0..1
  slang: number; // 0..1
  caps: number; // 0..1 tendência a gritar
  verbosity: number; // 0..1
  typo: number; // 0..1
  extro: number; // 0..1 extroversão
  laugh: string;
  address: string; // como chama os amigos (mano, irmão, parça...)
  pet: string; // bordão
  hobby: string;
  food: string;
  dream: string;
  hometown: string;
  birthday: number; // dia do ano 0..363
}

export interface Injury {
  name: string;
  days: number;
}

export interface Contract {
  wage: number; // salário semanal
  until: number; // temporada em que termina (fim da temporada)
}

export interface SeasonStats {
  apps: number;
  starts: number;
  minutes: number;
  goals: number;
  assists: number;
  yellows: number;
  reds: number;
  ratingSum: number;
  cleanSheets: number;
  motm: number;
}

export interface CareerLine {
  season: number;
  clubId: string | null;
  clubName: string;
  apps: number;
  goals: number;
  assists: number;
  rating: number;
  ovr: number;
  value: number;
}

export interface Player {
  id: string;
  first: string;
  last: string;
  nation: NationId;
  birth: number; // dia absoluto de nascimento (pode ser negativo)
  pos: Pos;
  alt: Pos[];
  foot: Foot;
  height: number;
  attrs: Attrs;
  potential: number;
  ovr: number;
  clubId: string | null;
  contract: Contract;
  value: number;
  morale: number; // 0..100
  fitness: number; // 0..100
  form: number[]; // últimas notas
  injury: Injury | null;
  suspended: number; // jogos
  yellowAcc: number;
  reputation: number; // 0..100 fama
  persona: Persona;
  stats: SeasonStats;
  compStats: Record<string, { g: number; a: number; apps: number }>;
  career: CareerLine[];
  clubs: { clubId: string; clubName: string; season: number; fee: number }[];
  intl: { caps: number; goals: number };
  isUser?: boolean;
  retired?: boolean;
  listed?: boolean; // à venda
  joinedDay: number;
  style?: string;
  trophies: string[]; // nomes de títulos/prêmios
  progressAcc: number; // acumulador fracionário de evolução
}

export type Mentality = -2 | -1 | 0 | 1 | 2;

export interface Tactic {
  formation: string;
  mentality: Mentality;
  pressing: 0 | 1 | 2;
}

export interface Club {
  id: string;
  name: string;
  short: string;
  city: string;
  nation: NationId;
  colors: [string, string];
  pattern: "liso" | "listras" | "faixa" | "metade" | "cruz";
  reputation: number;
  balance: number;
  transferBudget: number;
  wageBudget: number;
  facilities: number; // 1..5
  academy: number; // 1..5
  stadium: number;
  squad: string[];
  leagueId: string;
  tactic: Tactic;
  lineup?: string[]; // ids dos 11 (somente time do usuário no modo treinador)
  cohesion: number; // 0..100 entrosamento coletivo
  coachName: string;
  coachRep: number;
  coachPressure: number; // 0..100
  rivals: string[];
  trophies: Record<string, number>;
  seasonsHistory: { season: number; leagueId: string; pos: number }[];
  founded: number;
}

export interface TableRow {
  clubId: string;
  p: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  pts: number;
  form: ("V" | "E" | "D")[];
}

export type CompType = "league" | "cup" | "continental" | "supercup" | "intercontinental" | "national" | "friendly";

export interface Group {
  name: string;
  teamIds: string[];
  table: TableRow[];
}

export interface Competition {
  id: string;
  name: string;
  short: string;
  type: CompType;
  nation?: NationId;
  region?: "AS" | "EU" | "MUNDO";
  tier?: number;
  teamIds: string[];
  table: TableRow[];
  groups?: Group[];
  stage: string; // descrição da fase atual
  winnerId?: string;
  runnerUpId?: string;
  finished: boolean;
  promote?: number;
  relegate?: number;
  prestige: number; // 1..10
  isNationalTeams?: boolean;
  ko?: KnockoutState;
}

export interface KnockoutState {
  names: string[];
  days: number[];
  round: number; // índice da fase atual
  alive: string[];
  neutralFinal: boolean;
  pendingFrom?: "groups";
}

export interface MatchEvent {
  min: number;
  type: "goal" | "pen_goal" | "pen_miss" | "own_goal" | "yellow" | "red" | "injury" | "sub" | "chance" | "save" | "info" | "decision";
  side: 0 | 1;
  playerId?: string;
  assistId?: string;
  outId?: string;
  text: string;
}

export interface PlayerMatchLine {
  playerId: string;
  side: 0 | 1;
  started: boolean;
  minutes: number;
  rating: number;
  goals: number;
  assists: number;
}

export interface MatchResult {
  hg: number;
  ag: number;
  pens?: [number, number];
  poss: [number, number];
  shots: [number, number];
  sot: [number, number];
  events: MatchEvent[];
  lines: PlayerMatchLine[];
  motm?: string;
}

export interface Fixture {
  id: string;
  compId: string;
  season: number;
  day: number;
  homeId: string;
  awayId: string;
  round: string;
  neutral?: boolean;
  tieId?: string;
  played: boolean;
  result?: MatchResult;
  isNational?: boolean;
  importance: number; // 0..3
}

export interface NewsItem {
  id: string;
  day: number;
  title: string;
  body: string;
  tag: "transferencia" | "lesao" | "titulo" | "carreira" | "liga" | "pressao" | "promessa" | "selecao" | "quimica" | "premio" | "clube";
  importance: number;
  clubIds?: string[];
  playerIds?: string[];
}

export interface DecisionOption {
  id: string;
  label: string;
  hint?: string;
}

export interface Decision {
  id: string;
  kind: string;
  day: number;
  title: string;
  body: string;
  options: DecisionOption[];
  data?: Record<string, string | number>;
  expires: number;
}

export interface TransferOffer {
  id: string;
  playerId: string;
  fromClubId: string; // clube comprador
  toClubId: string | null; // clube vendedor (null = agente livre)
  fee: number;
  wage: number;
  years: number;
  role: "titular" | "rotacao" | "promessa";
  day: number;
  expires: number;
  status: "pendente" | "aceita" | "recusada" | "expirada" | "negociando" | "retirada";
  direction: "in" | "out" | "user"; // in: usuário (treinador) comprando; out: clube do usuário recebendo; user: proposta pelo jogador do usuário
  note?: string;
  counter?: number;
}

export interface ChampionEntry {
  season: number;
  compId: string;
  compName: string;
  winnerId: string;
  winnerName: string;
  runnerUpName?: string;
}

export interface AwardEntry {
  season: number;
  award: string;
  playerId?: string;
  name: string;
  clubName: string;
  detail: string;
}

export interface TransferRecord {
  season: number;
  day: number;
  playerId: string;
  name: string;
  fromName: string;
  toName: string;
  fee: number;
}

export interface History {
  champions: ChampionEntry[];
  awards: AwardEntry[];
  transfers: TransferRecord[];
  userSeasons: UserSeasonSummary[];
  records: { label: string; value: number; holder: string; season: number }[];
  milestones: { day: number; text: string }[];
}

export interface UserSeasonSummary {
  season: number;
  clubName: string;
  league: string;
  pos: number;
  apps?: number;
  goals?: number;
  assists?: number;
  rating?: number;
  ovr?: number;
  trophies: string[];
  awards: string[];
  record?: { w: number; d: number; l: number };
}

// ---------- Química / relações ----------
export interface Relation {
  a: string;
  b: string;
  friendship: number;
  trust: number;
  chemistry: number;
  rivalry: number;
  minutes: number;
  combos: number; // gols com assistência um do outro
  titles: number;
  seasons: number[];
  lastDay: number;
  dailyDelta: number; // limitador de variação diária
  dailyDay: number;
}

export type GroupLevel = "dupla" | "promissor" | "entrosado" | "lendario";

export interface ChemGroup {
  id: string;
  members: string[];
  name: string; // nome personalizado ou sugerido
  custom: boolean;
  level: GroupLevel;
  clubId: string;
  clubName: string;
  formedDay: number;
  active: boolean;
  endedDay?: number;
  reunions: number;
  matches: number;
  goals: number;
  assists: number;
  titles: number;
  seasons: number[];
  peakChem: number;
}

// ---------- Vestiário / mensagens ----------
export interface ChatMsg {
  id: number;
  from: string; // "me" | playerId | "sys"
  text: string;
  day: number;
}

export interface ChatThread {
  id: string;
  kind: "dm" | "group";
  members: string[]; // ids de personagens (não inclui "me")
  name: string;
  groupId?: string;
  messages: ChatMsg[];
  read: number; // id da última mensagem lida
  muted?: boolean;
}

export type MemoryKind =
  | "promessa_ficar"
  | "quebrou_promessa"
  | "apoio"
  | "ofensa"
  | "titulo_junto"
  | "saiu_sem_avisar"
  | "avisou_saida"
  | "aniversario"
  | "conflito"
  | "reconciliacao"
  | "conselho"
  | "zoeira"
  | "elogio"
  | "convite"
  | "derrota_dura"
  | "pediu_conselho"
  | "fato";

export interface Memory {
  id: number;
  day: number;
  kind: MemoryKind;
  text: string;
  weight: number; // 1..5
}

export interface Mind {
  id: string;
  memories: Memory[];
  mood: number; // -100..100, decai
  lastTalk: number;
  used: string[]; // ids de falas recentes
  pending?: { topic: string; day: number };
  talks: number;
  lastSpont: number;
}

export interface ChatState {
  threads: Record<string, ChatThread>;
  minds: Record<string, Mind>;
  seq: number;
  aiUsedToday: number;
  aiDay: number;
  flags: Record<string, number>;
}

export interface Settings {
  typingAnimation: boolean;
  matchSpeed: 1 | 2 | 4;
  defaultMatchMode: "instantanea" | "ao_vivo" | "interativa";
  advancedAI: boolean;
  aiDailyLimit: number;
  aiProvider: "servidor" | "ollama"; // ollama = chamado direto do navegador, no computador do jogador
  ollamaUrl: string;
  ollamaModel: string;
  autosave: boolean;
}

export interface UserCareer {
  mode: "player" | "coach";
  name: string;
  nation: NationId;
  playerId?: string; // modo jogador
  clubId: string | null;
  coachRelation: number; // modo jogador: relação com treinador
  training: { focus: TrainingFocus; intensity: 0 | 1 | 2 };
  reputation: number; // treinador: reputação
  boardConfidence: number;
  objectives: Objective[];
  unemployed: boolean;
  firedCount: number;
  seasonsAtClub: number;
  jobOffers: { clubId: string; day: number; expires: number }[];
  retired: boolean;
  startSeason: number;
  coachRecord: { w: number; d: number; l: number };
  promisedStay?: number; // dia em que prometeu ficar
  wantsTransfer?: boolean;
  lastBenchStreak: number;
  legacyScore: number;
  money: number; // patrimônio pessoal (modo jogador)
  pendingSummary?: number; // temporada concluída para mostrar resumo
  hallOfFameSaved?: boolean;
}

export type TrainingFocus = "equilibrado" | "fisico" | "tecnico" | "finalizacao" | "defesa" | "mental" | "descanso";

export interface Objective {
  id: string;
  text: string;
  kind: "liga_pos" | "copa_fase" | "continental" | "acesso" | "nao_rebaixar";
  target: number;
  compId: string;
  status: "andamento" | "cumprido" | "falhou";
}

export interface GameState {
  schema: number;
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  seed: number;
  rng: number;
  day: number;
  season: number;
  ids: number;
  user: UserCareer;
  nations: Record<string, { id: NationId; name: string; adj: string; region: "AS" | "EU"; colors: [string, string]; coach: string }>;
  clubs: Record<string, Club>;
  players: Record<string, Player>;
  comps: Record<string, Competition>;
  fixtures: Record<string, Fixture>;
  news: NewsItem[];
  decisions: Decision[];
  offers: TransferOffer[];
  history: History;
  relations: Record<string, Relation>;
  groups: ChemGroup[];
  chat: ChatState;
  achievements: Record<string, number>;
  settings: Settings;
  callups: string[]; // convocados da seleção do usuário (ids)
  lastResults: { fixtureId: string; day: number }[];
  log: string[];
  celebrations: { groupId: string; level: GroupLevel; kind: string; day: number }[];
  inbox: GameEvent[];
  seasonSummary?: SeasonEndSummary;
}

export interface SeasonEndSummary {
  season: number;
  champions: { comp: string; club: string }[];
  awards: { award: string; name: string; club: string; detail: string }[];
  userLine: string;
  promoted: string[];
  relegated: string[];
}

/** Eventos do dia, consumidos pelos gatilhos do Vestiário e das notícias. */
export type GameEvent =
  | { t: "match"; fixtureId: string }
  | { t: "transfer"; playerId: string; from: string | null; to: string | null; fee: number }
  | { t: "title"; compId: string; clubId: string }
  | { t: "final_lost"; compId: string; clubId: string }
  | { t: "injury"; playerId: string; days: number }
  | { t: "offer"; offerId: string }
  | { t: "callup"; playerId: string }
  | { t: "group"; kind: string; groupId: string }
  | { t: "fired"; clubId: string }
  | { t: "hired"; clubId: string }
  | { t: "user_moved"; from: string | null; to: string }
  | { t: "bench"; streak: number }
  | { t: "coach_sacked"; clubId: string }
  | { t: "promise"; playerId: string }
  | { t: "advice"; playerId: string; decisionId: string };
