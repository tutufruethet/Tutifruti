/**
 * Vida pessoal: fãs (sempre adultas) mandam mensagem conforme a fama cresce.
 * Dá para conversar, sair, namorar, noivar e casar — ou levar um fora.
 * Tem consequência no jogo: moral, cansaço antes de jogo, relação com o
 * técnico, fama, ciúme e reação dos companheiros. Conteúdo sempre leve.
 */
import { addMemory } from "../chat/memory";
import { ensureTeamThread, meId, sayLine } from "../chat/chat";
import { normalize } from "../chat/intents";
import { addNews, milestone } from "../news/news";
import { clamp, hashSeed, Rng } from "../rng";
import { nextUserFixture } from "../season/queries";
import { teamName } from "../season/schedule";
import type { Fan, FanStage, FanVibe, GameEvent, GameState, NationId } from "../types";
import { formatMoney } from "../world/players";

export const FAN_PREFIX = "fa:";
export const fanThreadId = (id: string) => `${FAN_PREFIX}${id}`;

const NAMES: Record<string, string[]> = {
  BRA: ["Ana Clara", "Bruna", "Camila", "Duda", "Fernanda", "Gabriela", "Isabela", "Júlia", "Larissa", "Letícia", "Mariana", "Natália", "Rafaela", "Thaís", "Yasmin", "Bianca", "Carol", "Lívia", "Manu", "Sofia"],
  ARG: ["Valentina", "Martina", "Agustina", "Camila", "Lucía", "Sofía", "Milagros", "Florencia"],
  ING: ["Emily", "Olivia", "Grace", "Chloe", "Lucy", "Amelia", "Hannah", "Ella"],
  ESP: ["Lucía", "Paula", "Carmen", "Alba", "Nerea", "Irene", "Marta", "Claudia"],
  ITA: ["Giulia", "Chiara", "Francesca", "Sara", "Martina", "Alessia", "Elena", "Aurora"],
  ALE: ["Lena", "Hannah", "Mia", "Lea", "Anna", "Clara", "Emma", "Marie"],
};
const JOBS = ["estudante de medicina", "influenciadora digital", "jornalista esportiva", "cantora", "arquiteta", "advogada", "fisioterapeuta", "atriz de novela", "modelo", "professora", "dentista", "designer", "veterinária", "personal trainer", "DJ", "engenheira", "chef de cozinha", "fotógrafa"];
const LIKES = ["praia", "cinema", "pagode", "sertanejo", "viajar", "comer bem", "série", "academia", "balada", "livros", "café", "show", "cachorro", "futebol", "dançar", "arte"];
const VIBES: FanVibe[] = ["romantica", "divertida", "ciumenta", "independente", "timida", "famosa", "torcedora", "intelectual"];
export const VIBE_LABEL: Record<FanVibe, string> = {
  romantica: "Romântica", divertida: "Divertida", ciumenta: "Ciumenta", independente: "Independente", timida: "Tímida", famosa: "Famosa", torcedora: "Torcedora fanática", intelectual: "Intelectual",
};
export const STAGE_LABEL: Record<FanStage, string> = {
  fa: "Fã", conversando: "Conversando", ficando: "Ficando", namorando: "Namorando", noivos: "Noivos", casados: "Casados", ex: "Ex",
};

export const DATES = [
  { id: "parque", label: "Passeio no parque", cost: 0, power: 5, like: "praia" },
  { id: "cafe", label: "Café", cost: 80, power: 5, like: "café" },
  { id: "cinema", label: "Cinema", cost: 200, power: 6, like: "cinema" },
  { id: "jantar", label: "Jantar chique", cost: 1500, power: 9, like: "comer bem" },
  { id: "show", label: "Show", cost: 900, power: 8, like: "show" },
  { id: "viagem", label: "Viagem de fim de semana", cost: 15000, power: 15, like: "viajar" },
] as const;

const GIFTS = [
  { id: "flores", label: "Flores", cost: 150, power: 3 },
  { id: "perfume", label: "Perfume", cost: 900, power: 5 },
  { id: "joia", label: "Joia", cost: 8000, power: 9 },
] as const;

export function romance(g: GameState) {
  if (!g.romance) g.romance = { fans: [], log: [] };
  return g.romance;
}
export const partnerOf = (g: GameState): Fan | undefined => (g.romance?.partnerId ? g.romance.fans.find((f) => f.id === g.romance!.partnerId) : undefined);
const fanById = (g: GameState, id: string) => g.romance?.fans.find((f) => f.id === id);

function fame(g: GameState): number {
  return g.user.mode === "player" && g.user.playerId ? g.players[g.user.playerId]?.reputation ?? 0 : g.user.reputation;
}
const firstName = (g: GameState) => g.user.name.split(" ")[0];

function log(g: GameState, text: string) {
  const r = romance(g);
  r.log.unshift({ day: g.day, text });
  if (r.log.length > 60) r.log.length = 60;
}

function bump(g: GameState, f: Fan, d: { attraction?: number; affection?: number; trust?: number }, cap = 12) {
  if (f.dailyDay !== g.day) { f.dailyDay = g.day; f.dailyDelta = 0; }
  const room = Math.max(0, cap - f.dailyDelta);
  let used = 0;
  for (const k of ["attraction", "affection", "trust"] as const) {
    const v = d[k];
    if (!v) continue;
    const lim = v > 0 ? Math.min(v, room) : v; // perder não tem teto: grosseria pesa
    f[k] = clamp(f[k] + lim, 0, 100);
    if (v > 0) used = Math.max(used, lim);
  }
  f.dailyDelta += used;
}

// ---------- estilo de escrita das fãs ----------
const EMO: Record<string, string[]> = { feliz: ["😊", "😍", "🥰", "😂", "✨"], carinho: ["❤️", "🥰", "😘", "💕"], neutro: ["🙂", "👀", "😅"], triste: ["😔", "🥺"], raiva: ["🙄", "😒", "😤"] };
function say(g: GameState, f: Fan, rng: Rng, raw: string, emo: keyof typeof EMO = "neutro"): string {
  let t = raw.replace(/\{l\}/g, f.laugh).replace(/\{me\}/g, firstName(g)).replace(/\s+/g, " ").trim();
  if (f.vibe === "timida") t = t.toLowerCase();
  if (rng.chance(f.emoji)) t = `${t} ${rng.pick(EMO[emo])}`;
  return t;
}

function pickLine(f: Fan, rng: Rng, key: string, pool: string[]): string {
  const free = pool.map((_, i) => i).filter((i) => !f.used.includes(`${key}:${i}`));
  const i = free.length ? rng.pick(free) : rng.int(0, pool.length - 1);
  f.used.push(`${key}:${i}`);
  if (f.used.length > 40) f.used.splice(0, f.used.length - 40);
  return pool[i];
}

function ensureThread(g: GameState, f: Fan) {
  const id = fanThreadId(f.id);
  let t = g.chat.threads[id];
  if (!t) { t = { id, kind: "dm", members: [], name: f.name, messages: [], read: 0 }; g.chat.threads[id] = t; }
  t.name = g.romance?.partnerId === f.id ? `${f.name} ❤️` : f.name;
  return t;
}

function fanSays(g: GameState, f: Fan, rng: Rng, raw: string, emo: keyof typeof EMO = "neutro") {
  const t = ensureThread(g, f);
  for (const part of raw.split("|").map((x) => x.trim()).filter(Boolean)) {
    t.messages.push({ id: g.chat.seq++, from: f.id, text: say(g, f, rng, part, emo), day: g.day });
  }
  if (t.messages.length > 220) t.messages.splice(0, t.messages.length - 220);
}

// ---------- geração ----------
export function createFan(g: GameState, rng: Rng): Fan {
  const club = g.user.clubId ? g.clubs[g.user.clubId] : undefined;
  const nation = (club?.nation ?? g.user.nation) as NationId;
  const names = NAMES[nation] ?? NAMES.BRA;
  const vibe = rng.pick(VIBES);
  const famous = vibe === "famosa" || rng.chance(0.08);
  const id = `fa${g.ids++}`;
  const f: Fan = {
    id,
    name: rng.pick(names),
    age: rng.int(20, 31),
    city: club?.city ?? g.nations[nation]?.name ?? "",
    nation,
    job: famous ? rng.pick(["influenciadora digital", "cantora", "atriz de novela", "modelo", "apresentadora de TV"]) : rng.pick(JOBS),
    vibe,
    likes: rng.shuffle([...LIKES]).slice(0, 3),
    attraction: rng.int(30, 55) + (famous ? -10 : 0),
    affection: rng.int(5, 15),
    trust: rng.int(35, 55),
    stage: "fa",
    metDay: g.day,
    stageDay: g.day,
    lastTalk: g.day,
    dates: 0,
    famous,
    laugh: rng.pick(["kkkk", "kkkkkk", "hahaha", "rsrs", "KKKKK", "kkk"]),
    emoji: vibe === "timida" || vibe === "intelectual" ? 0.25 : vibe === "romantica" || vibe === "divertida" ? 0.75 : 0.5,
    birthday: rng.int(0, 363),
    used: [],
    dailyDelta: 0,
    dailyDay: g.day,
  };
  // nomes únicos entre as fãs ativas
  if (romance(g).fans.some((x) => x.name === f.name && x.stage !== "ex")) f.name = `${f.name.split(" ")[0]} ${rng.pick(["Alves", "Prado", "Lins", "Rocha", "Duarte", "Melo"])}`;
  return f;
}

function firstMessage(g: GameState, f: Fan, rng: Rng, reason: string) {
  const player = g.user.mode === "player";
  const lines: Record<FanVibe, string[]> = {
    romantica: [`Oi, ${firstName(g)}! ${reason} Tu é muito talentoso`, `Oii! Desculpa a ousadia, mas ${reason.toLowerCase()} Não resisti e vim falar`],
    divertida: [`Oi sumido que eu nem conheço {l} ${reason}`, `Oi! ${reason} Tô te seguindo desde ontem {l}`],
    ciumenta: [`Oi ${firstName(g)}. ${reason} Tu responde todo mundo ou só as especiais?`],
    independente: [`Oi. ${reason} Achei interessante te mandar mensagem.`],
    timida: [`oi... ${reason.toLowerCase()} desculpa incomodar`],
    famosa: [`Oi, ${firstName(g)}! Sou a ${f.name}, talvez tu já tenha me visto por aí {l} ${reason}`],
    torcedora: [`${player ? "QUE JOGADOR" : "QUE TREINADOR"}! ${reason} Sou ${g.user.clubId ? `do ${g.clubs[g.user.clubId].short}` : "tua fã"} desde pequena`],
    intelectual: [`Oi, ${firstName(g)}. ${reason} Gosto de quem joga com inteligência.`],
  };
  fanSays(g, f, rng, rng.pick(lines[f.vibe]), "feliz");
}

/** Pode aparecer uma fã nova: depende da fama e do momento. */
export function maybeNewFan(g: GameState, rng: Rng, boost = 0, reason?: string) {
  const r = romance(g);
  const active = r.fans.filter((f) => f.stage === "fa" || f.stage === "conversando").length;
  if (active >= 5 || !g.user.clubId) return;
  const p = clamp(0.04 + fame(g) / 280 + boost, 0, 0.8);
  if (!rng.chance(p)) return;
  const f = createFan(g, rng);
  r.fans.push(f);
  const why = reason ?? (g.user.mode === "player" ? "Vi teus jogos e virei fã." : "Adoro o jeito que tu comanda o time.");
  firstMessage(g, f, rng, why);
  log(g, `${f.name} (${f.age}, ${f.job}) começou a te seguir.`);
}

// ---------- conversa ----------
type RIntent = "saudacao" | "como_vai" | "elogio" | "convite" | "sobre_ela" | "futebol" | "carinho" | "namorar" | "casar" | "desculpa" | "grosseria" | "outras" | "tchau" | "risada" | "outro";

function rIntent(text: string): RIntent {
  const n = normalize(text);
  const has = (re: RegExp) => re.test(n);
  if (has(/\b(nudes?|manda (uma )?foto|safada|gostosa|cala a boca|chata|feia|burra|interesseira)\b/)) return "grosseria";
  if (has(/\b(casa comigo|casar|se casar|noivar|aliança)\b/)) return "casar";
  if (has(/\b(namora comigo|quer namorar|ser minha namorada|namorar comigo|pedir (voce )?em namoro)\b/)) return "namorar";
  if (has(/\b(sair|jantar|cinema|encontro|date|te ver|nos ver|a gente se ver|cafe|praia|passear|rolê|role)\b/)) return "convite";
  if (has(/\b(te amo|amo voce|saudade|beijo|gosto de voce|apaixonad|meu amor|amor|carinho|minha linda)\b/)) return "carinho";
  if (has(/\b(linda|gata|bonita|maravilhosa|perfeita|princesa|sorriso|charmosa|deusa)\b/)) return "elogio";
  if (has(/\b(desculpa|foi mal|perdao|me perdoa)\b/)) return "desculpa";
  if (has(/\b(outra|ex|ciume|ciumes|outras fas|outra mina)\b/)) return "outras";
  if (has(/\b(o que voce faz|trabalha|estuda|de onde|quantos anos|idade|gosta de|teu sonho|tua familia|signo)\b/)) return "sobre_ela";
  if (has(/\b(jogo|gol|partida|treino|campeonato|vitoria|derrota|time|tecnico|titular)\b/)) return "futebol";
  if (has(/\b(tudo bem|como voce esta|como esta|como foi teu dia|e ai como)\b/)) return "como_vai";
  if (has(/\b(oi|ola|eai|e ai|bom dia|boa tarde|boa noite|opa|salve)\b/)) return "saudacao";
  if (has(/\b(tchau|ate mais|vou dormir|beijos|fui)\b/)) return "tchau";
  if (has(/\bkkk\b/)) return "risada";
  return "outro";
}

export interface RomancePlan {
  threadId: string;
  fanId: string;
  text: string;
  lines: string[];
  free: boolean;
  apply: () => void;
}

function ctxFact(g: GameState): { last?: string; next?: string } {
  const nx = nextUserFixture(g);
  const club = g.user.clubId;
  let last: string | undefined;
  const lr = g.lastResults[0] ? g.fixtures[g.lastResults[0].fixtureId] : undefined;
  if (lr?.result && club && g.day - lr.day <= 5) {
    const home = lr.homeId === club;
    const gf = home ? lr.result.hg : lr.result.ag, ga = home ? lr.result.ag : lr.result.hg;
    last = gf > ga ? "vitória" : gf < ga ? "derrota" : "empate";
  }
  const next = nx && !nx.isNational ? teamName(g, nx.homeId === club ? nx.awayId : nx.homeId) : undefined;
  return { last, next };
}

/** Planeja a resposta da fã (local). O efeito só acontece em apply(). */
export function planRomance(g: GameState, threadId: string, text: string): RomancePlan | null {
  const f = fanById(g, threadId.slice(FAN_PREFIX.length));
  if (!f) return null;
  const rng = new Rng(hashSeed(g.seed, f.id, g.chat.seq, text));
  const it = rIntent(text);
  const partner = partnerOf(g);
  const isPartner = partner?.id === f.id;
  const stage = f.stage;
  const close = ["namorando", "noivos", "casados"].includes(stage);
  const { last, next } = ctxFact(g);
  let lines: string[] = [];
  let d: { attraction?: number; affection?: number; trust?: number } = {};
  let emo: keyof typeof EMO = "neutro";
  let free = false;
  let after: (() => void) | undefined;
  const L = (key: string, pool: string[]) => pickLine(f, rng, key, pool);

  if (f.stage === "ex") {
    lines = [L("ex", ["Acho melhor a gente não conversar agora", "Tô seguindo minha vida, {me}", "Hm. Oi."])];
    emo = "raiva";
  } else switch (it) {
    case "grosseria":
      lines = [L("gross", ["Opa, calma aí. Não gostei disso", "Nossa, que falta de respeito", "Achei que tu era diferente…"])];
      d = { attraction: -15, trust: -12, affection: -8 };
      emo = "raiva";
      break;
    case "elogio":
      lines = [close ? L("elog_c", ["Para que eu fico boba {l}", "Tu sempre sabe o que dizer ❤️"]) : f.vibe === "timida" ? L("elog_t", ["obrigada... fiquei sem graça", "ai, para..."]) : f.vibe === "independente" ? L("elog_i", ["Obrigada. Mas me conta algo que eu não sei {l}", "Elogio fácil, hein. Vamos ver se tu é bom de papo também"]) : L("elog", ["Ai, obrigada {l}", "Tá jogando charme, é? {l}", "Fiquei vermelha aqui"])];
      d = { attraction: f.vibe === "independente" ? 2 : 4, affection: 2 };
      emo = "feliz";
      break;
    case "convite": {
      const ok = f.attraction >= 45 || close;
      if (!ok) { lines = [L("conv_no", ["Calma, a gente mal se conhece {l} Conversa mais comigo primeiro", "Hmm, quem sabe… me conquista mais um pouco"])]; d = { attraction: 1 }; emo = "neutro"; }
      else {
        const nxTxt = next ? ` Mas tu não tem jogo contra o ${next}?` : "";
        lines = [L("conv_ok", ["Topo! Me chama quando quiser 😊", "Bora! Escolhe o lugar e me fala", "Achei que tu nunca ia chamar {l}"]) + (next && f.vibe === "torcedora" ? nxTxt : "")];
        lines.push("Marca o encontro em Vida pessoal que eu tô dentro");
        d = { attraction: 2, affection: 2 };
        emo = "feliz";
      }
      break;
    }
    case "sobre_ela":
      lines = [L("ela", [`Sou ${f.job}, tenho ${f.age} anos. E amo ${f.likes[0]}`, `Moro em ${f.city}. Nas folgas é ${f.likes[1]} ou ${f.likes[2]}`, `Trabalho como ${f.job}. Corrido, mas eu gosto`])];
      lines.push(L("ela_q", ["E tu, fora do futebol, gosta de quê?", "Agora me conta de ti", "Tua vez: o que te faz feliz?"]));
      d = { attraction: 2, affection: 2, trust: 1 };
      emo = "feliz";
      break;
    case "futebol":
      lines = [last === "vitória" ? L("fut_v", ["Vi o jogo! Que vitória", "Fiquei vendo o jogo todo, gritei no gol {l}"]) : last === "derrota" ? L("fut_d", ["Vi o jogo… não fica mal, tá?", "Derrota acontece. Tu tá bem?"]) : next ? L("fut_n", [`Vou assistir o jogo contra o ${next}`, `Boa sorte contra o ${next}! Vou torcer`]) : L("fut_x", ["Futebol é tua vida, né? Admiro isso", f.vibe === "torcedora" ? "Me explica essa tática aí que eu amo {l}" : "Confesso que entendo pouco, mas tô aprendendo por tua causa {l}"])];
      d = { attraction: f.vibe === "torcedora" ? 4 : 1, affection: 1 };
      emo = last === "derrota" ? "triste" : "feliz";
      break;
    case "carinho":
      if (close) { lines = [L("car_c", ["Também te amo ❤️", "Tô morrendo de saudade", "Volta logo pra casa", "Tu é meu tudo"])]; d = { affection: 4, trust: 1 }; emo = "carinho"; }
      else if (f.affection >= 45) { lines = [L("car_m", ["Ai, também tô gostando de ti", "Saudade de ti também… pronto, falei {l}"])]; d = { affection: 4 }; emo = "carinho"; }
      else { lines = [L("car_e", ["Calma, tá indo rápido demais {l}", "Nossa, já? Vai devagar {l}"])]; d = { attraction: -2 }; emo = "neutro"; }
      break;
    case "namorar":
      if (isPartner || close) { lines = ["A gente já namora, bobo {l}"]; emo = "feliz"; break; }
      if (f.affection >= 60 && f.dates >= 2 && f.trust >= 40) {
        lines = [L("nam_sim", ["SIM! Achei que tu nunca ia pedir 😭❤️", "Sim, sim, sim! ❤️"])];
        after = () => startDating(g, f, rng);
        emo = "carinho";
      } else {
        lines = [L("nam_nao", ["Ai… gosto de ti, mas ainda é cedo. Vamos sair mais?", "Calma! A gente nem saiu direito ainda"])];
        d = { affection: f.affection >= 40 ? 1 : -2 };
        emo = "neutro";
      }
      break;
    case "casar":
      if (stage === "namorando" && f.affection >= 85 && g.day - f.stageDay >= 90 && f.trust >= 60) {
        lines = [L("casa_sim", ["MEU DEUS. SIM! 😭💍", "Sim!!! Vou contar pra todo mundo 💍"])];
        after = () => engage(g, f);
        emo = "carinho";
      } else if (stage === "noivos" || stage === "casados") { lines = ["A gente já tá nessa, amor {l}"]; emo = "carinho"; }
      else { lines = [L("casa_nao", ["Casar?? Calma {l} vamos com calma", "Tu tá muito apressado… mas fiquei feliz que tu pensa nisso"])]; d = { affection: stage === "namorando" ? 2 : -1 }; emo = "neutro"; }
      break;
    case "desculpa":
      lines = [f.trust < 50 ? L("desc_r", ["Tá… vou pensar", "Desculpo, mas não faz de novo"]) : L("desc", ["Relaxa, tá tudo bem", "Que isso, de boa"])];
      d = { trust: 4, affection: 1 };
      emo = "neutro";
      break;
    case "outras":
      lines = [f.vibe === "ciumenta" ? L("out_c", ["Que outra? Me fala agora", "Tu tá falando com outra?? 😒"]) : L("out", ["Hmm. Espero que tu seja sincero comigo", "Só não gosto de mentira, tá?"])];
      d = { trust: f.vibe === "ciumenta" ? -6 : -2 };
      emo = f.vibe === "ciumenta" ? "raiva" : "neutro";
      break;
    case "como_vai":
      lines = [L("cv", [`Tô bem! Dia corrido de ${f.job}. E tu?`, "Melhor agora que tu mandou mensagem {l}", "Cansada, mas feliz. E tu, como foi o treino?"])];
      d = { affection: 1 };
      emo = "feliz";
      break;
    case "saudacao":
      lines = [L("oi", [close ? "Oi, amor!" : `Oi, ${firstName(g)}!`, "Oiee", "Apareceu! {l}"])];
      d = { affection: 1 };
      emo = "feliz";
      break;
    case "tchau":
      lines = [L("tchau", [close ? "Boa noite, amor ❤️ dorme bem" : "Tchau! Gostei de conversar", "Até amanhã {l}"])];
      emo = "carinho";
      break;
    case "risada":
      lines = [L("kk", ["{l} tu é bobo", "Kkkk para", "Tu é muito engraçado {l}"])];
      d = { attraction: 2 };
      emo = "feliz";
      break;
    default:
      free = true;
      lines = [L("outro", ["Hmm, me conta mais", "Sério? Que legal", "Tu sempre me surpreende {l}", "E aí, como tá a vida de jogador?"])];
      d = { affection: 1 };
      emo = "neutro";
  }
  // flertar com outra enquanto namora: risco de ciúme
  const flirt = ["elogio", "convite", "carinho", "namorar", "casar"].includes(it);
  const styled = lines.map((l) => say(g, f, rng, l, emo));
  return {
    threadId, fanId: f.id, text, lines: styled, free,
    apply: () => {
      bump(g, f, d);
      f.lastTalk = g.day;
      if (f.stage === "fa") { f.stage = "conversando"; f.stageDay = g.day; }
      if (flirt && partner && partner.id !== f.id) jealousyCheck(g, partner, f, rng);
      after?.();
    },
  };
}

export function commitRomance(g: GameState, plan: RomancePlan, override?: string[]) {
  const f = fanById(g, plan.fanId);
  if (!f) return;
  const t = ensureThread(g, f);
  t.messages.push({ id: g.chat.seq++, from: "me", text: plan.text, day: g.day });
  for (const l of override?.length ? override : plan.lines) t.messages.push({ id: g.chat.seq++, from: f.id, text: l, day: g.day });
  t.read = t.messages[t.messages.length - 1].id;
  plan.apply();
}

function jealousyCheck(g: GameState, partner: Fan, other: Fan, rng: Rng) {
  const k = `ciume:${g.day}`;
  if (g.chat.flags[k]) return;
  const p = 0.12 + (partner.vibe === "ciumenta" ? 0.25 : 0) + (other.famous ? 0.15 : 0);
  if (!rng.chance(p)) return;
  g.chat.flags[k] = 1;
  bump(g, partner, { trust: -15, affection: -10 });
  fanSays(g, partner, rng, partner.vibe === "ciumenta" ? `Quem é ${other.name.split(" ")[0]}?? | Me mandaram print, ${firstName(g)}` : `Fiquei sabendo que tu tá de conversa com a ${other.name.split(" ")[0]}… | Pensei que a gente tinha algo sério`, "raiva");
  log(g, `${partner.name} descobriu sua conversa com ${other.name}.`);
  if (partner.trust < 25) breakUp(g, partner, rng, "ela");
}

// ---------- ações ----------
export function goOnDate(g: GameState, fanId: string, dateId: string, rng: Rng): string {
  const f = fanById(g, fanId);
  const dt = DATES.find((x) => x.id === dateId);
  if (!f || !dt || f.stage === "ex") return "";
  if (f.stage === "fa" || (f.attraction < 45 && !["namorando", "noivos", "casados"].includes(f.stage))) return `${f.name.split(" ")[0]} ainda não topa sair. Converse mais com ela.`;
  if (dt.id === "viagem" && !["namorando", "noivos", "casados"].includes(f.stage)) return "Viagem só depois de namorar.";
  const key = `date:${f.id}`;
  if ((g.chat.flags[key] ?? -99) > g.day - 3) return "Vocês saíram há pouco. Espera uns dias.";
  if (g.user.money < dt.cost) return `Sem dinheiro: custa ${formatMoney(dt.cost)}.`;
  g.chat.flags[key] = g.day;
  g.user.money -= dt.cost;
  const likeIt = f.likes.includes(dt.like);
  const success = rng.chance(clamp(0.5 + f.attraction / 250 + (likeIt ? 0.2 : 0), 0.2, 0.95));
  f.dates++;
  f.lastTalk = g.day;
  // consequência no futebol: sair na véspera de jogo cansa
  const nx = nextUserFixture(g);
  let warn = "";
  if (nx && nx.day - g.day <= 1 && g.user.mode === "player" && g.user.playerId) {
    const me = g.players[g.user.playerId];
    me.fitness = clamp(me.fitness - 8, 0, 100);
    if (rng.chance(0.4)) { g.user.coachRelation = clamp(g.user.coachRelation - 3, 0, 100); warn = " O técnico soube que você saiu na véspera do jogo."; }
    else warn = " Você dormiu tarde e chega mais cansado ao jogo.";
  }
  if (success) {
    bump(g, f, { affection: dt.power, attraction: 4, trust: 2 }, 20);
    if (f.stage === "conversando") { f.stage = "ficando"; f.stageDay = g.day; }
    if (g.user.playerId) g.players[g.user.playerId].morale = clamp(g.players[g.user.playerId].morale + 3, 0, 100);
    fanSays(g, f, rng, rng.pick(["Amei nosso encontro", "Que noite boa! Quando a gente repete?", `${dt.label.toLowerCase()} perfeito. Obrigada`]), "carinho");
    if (f.famous && rng.chance(0.5)) {
      addNews(g, { title: `${g.user.name} é visto com a ${f.job} ${f.name}`, body: `Os dois foram flagrados em ${dt.label.toLowerCase()} em ${f.city}.`, tag: "carreira", importance: 2, playerIds: g.user.playerId ? [g.user.playerId] : [] });
      if (g.user.playerId) g.players[g.user.playerId].reputation = clamp(g.players[g.user.playerId].reputation + 1, 0, 100);
    }
    log(g, `${dt.label} com ${f.name}: deu certo.`);
    return `${dt.label} com ${f.name.split(" ")[0]} foi ótimo!${likeIt ? " Ela adora isso." : ""}${warn}`;
  }
  bump(g, f, { affection: 1, attraction: -2 });
  fanSays(g, f, rng, rng.pick(["Foi legal… mas acho que a gente tava meio sem assunto", "Gostei, mas fiquei esperando mais de ti {l}"]), "neutro");
  log(g, `${dt.label} com ${f.name}: meio sem graça.`);
  return `O encontro foi meio sem graça.${warn}`;
}

export function giveGift(g: GameState, fanId: string, giftId: string, rng: Rng): string {
  const f = fanById(g, fanId);
  const gift = GIFTS.find((x) => x.id === giftId);
  if (!f || !gift || f.stage === "ex" || f.stage === "fa") return "";
  if (g.user.money < gift.cost) return `Sem dinheiro: custa ${formatMoney(gift.cost)}.`;
  const key = `gift:${f.id}`;
  if ((g.chat.flags[key] ?? -99) > g.day - 7) return "Você deu presente há poucos dias.";
  g.chat.flags[key] = g.day;
  g.user.money -= gift.cost;
  bump(g, f, { affection: f.vibe === "independente" ? Math.ceil(gift.power / 2) : gift.power }, 15);
  fanSays(g, f, rng, rng.pick([`Recebi ${gift.label === "Flores" ? "as flores" : gift.label === "Joia" ? "a joia" : "o perfume"}!! Que fofo`, "Tu não existe ❤️", "Amei o presente"]), "carinho");
  return `${f.name.split(" ")[0]} amou o presente.`;
}

export function askOut(g: GameState, fanId: string, rng: Rng): string {
  const f = fanById(g, fanId);
  if (!f) return "";
  const plan = planRomance(g, fanThreadId(f.id), "quer namorar comigo?");
  if (plan) commitRomance(g, plan);
  void rng;
  return partnerOf(g)?.id === f.id ? `Vocês estão namorando!` : `${f.name.split(" ")[0]} ainda não aceitou.`;
}

export function propose(g: GameState, fanId: string): string {
  const f = fanById(g, fanId);
  if (!f) return "";
  const plan = planRomance(g, fanThreadId(f.id), "casa comigo?");
  if (plan) commitRomance(g, plan);
  return f.stage === "noivos" ? "Ela disse sim! Casamento marcado." : "Ela ainda não está pronta.";
}

function startDating(g: GameState, f: Fan, rng: Rng) {
  const r = romance(g);
  const old = partnerOf(g);
  if (old && old.id !== f.id) breakUp(g, old, rng, "voce");
  r.partnerId = f.id;
  f.stage = "namorando";
  f.stageDay = g.day;
  ensureThread(g, f);
  milestone(g, `Começou a namorar ${f.name}`);
  log(g, `Namoro com ${f.name} oficializado.`);
  addNews(g, { title: `${g.user.name} assume namoro com ${f.name}`, body: `${f.name} é ${f.job}, de ${f.city}.${f.famous ? " O casal virou assunto nas redes." : ""}`, tag: "carreira", importance: 2, playerIds: g.user.playerId ? [g.user.playerId] : [] });
  if (g.user.playerId) { const me = g.players[g.user.playerId]; me.morale = clamp(me.morale + 6, 0, 100); if (f.famous) me.reputation = clamp(me.reputation + 3, 0, 100); }
  // os companheiros comentam
  const t = ensureTeamThread(g);
  const club = g.user.clubId ? g.clubs[g.user.clubId] : undefined;
  const mate = club?.squad.map((id) => g.players[id]).find((p) => p && !p.isUser && p.persona.extro > 0.6);
  if (t && mate) {
    sayLine(g, rng, t.id, mate.id, rng.pick([`Tá namorando, hein {me}?? {l}`, `Vi a notícia {l} parabéns pro casal`, `Agora vai ter que pagar o churrasco de comemoração {l}`]), "feliz");
    addMemory(g, mate.id, "fato", `Você começou a namorar ${f.name}.`);
  }
}

function engage(g: GameState, f: Fan) {
  f.stage = "noivos";
  f.stageDay = g.day;
  romance(g).weddingDay = g.day + 60;
  milestone(g, `Noivado com ${f.name}`);
  addNews(g, { title: `${g.user.name} fica noivo de ${f.name}`, body: "O casamento deve acontecer nos próximos meses.", tag: "carreira", importance: 2 });
  if (g.user.playerId) g.players[g.user.playerId].morale = clamp(g.players[g.user.playerId].morale + 8, 0, 100);
}

export function breakUp(g: GameState, f: Fan, rng: Rng, who: "voce" | "ela" = "voce") {
  const r = romance(g);
  const wasPartner = r.partnerId === f.id;
  f.stage = "ex";
  f.stageDay = g.day;
  if (wasPartner) { r.partnerId = undefined; r.weddingDay = undefined; }
  if (who === "voce") fanSays(g, f, rng, rng.pick(["Tá bom. Se é o que tu quer…", "Sério? Depois de tudo? | Tchau, {me}"]), "triste");
  else fanSays(g, f, rng, rng.pick(["Pra mim chega. Acabou.", "Não dá mais. Vou seguir minha vida."]), "raiva");
  if (g.user.playerId && wasPartner) g.players[g.user.playerId].morale = clamp(g.players[g.user.playerId].morale - 8, 0, 100);
  if (wasPartner) {
    log(g, `Fim do namoro com ${f.name}.`);
    addNews(g, { title: `${g.user.name} e ${f.name} terminam`, body: who === "ela" ? "Segundo pessoas próximas, foi ela quem pôs fim." : "O jogador teria decidido encerrar o relacionamento.", tag: "carreira", importance: f.famous ? 2 : 1 });
  }
}

export function ignoreFan(g: GameState, fanId: string) {
  const r = romance(g);
  r.fans = r.fans.filter((f) => f.id !== fanId || f.stage !== "fa");
  delete g.chat.threads[fanThreadId(fanId)];
}

// ---------- semanal e eventos ----------
export function romanceWeekly(g: GameState, rng: Rng) {
  if (!g.user.clubId && g.user.mode === "player") return;
  const r = romance(g);
  maybeNewFan(g, rng);
  const p = partnerOf(g);
  const me = g.user.playerId ? g.players[g.user.playerId] : undefined;
  if (p) {
    if (g.day - p.lastTalk > 10) { bump(g, p, { affection: -4, trust: -1 }); if (rng.chance(0.5)) fanSays(g, p, rng, rng.pick(["Tu sumiu, hein…", "Lembra que eu existo? 🥺", "Tô sentindo tua falta"]), "triste"); }
    if (me) me.morale = clamp(me.morale + (p.affection > 60 ? 1.5 : p.affection < 30 ? -1.5 : 0), 0, 100);
    if (p.famous && me) me.reputation = clamp(me.reputation + 0.3, 0, 100);
    if (p.affection < 15 || p.trust < 15) breakUp(g, p, rng, "ela");
  }
  // casamento
  if (r.weddingDay && g.day >= r.weddingDay && p && p.stage === "noivos") {
    p.stage = "casados";
    p.stageDay = g.day;
    r.weddingDay = undefined;
    milestone(g, `Casou com ${p.name}`);
    addNews(g, { title: `${g.user.name} se casa com ${p.name}`, body: "Cerimônia íntima, com os companheiros de time entre os convidados.", tag: "carreira", importance: 3 });
    fanSays(g, p, rng, "Oficialmente tua esposa 💍❤️", "carinho");
    if (me) me.morale = clamp(me.morale + 10, 0, 100);
  }
  // fãs que ninguém respondeu somem
  r.fans = r.fans.filter((f) => !(f.stage === "fa" && g.day - f.metDay > 30));
  void meId;
}

/** Reações aos acontecimentos da carreira (chamado pelos gatilhos do Vestiário). */
export function romanceOnEvent(g: GameState, rng: Rng, ev: GameEvent) {
  if (!g.romance) return;
  const p = partnerOf(g);
  if (ev.t === "match") {
    const fx = g.fixtures[ev.fixtureId];
    if (!fx?.result) return;
    const me = g.user.playerId;
    const line = me ? fx.result.lines.find((l) => l.playerId === me) : undefined;
    const club = g.user.clubId;
    const home = fx.homeId === club;
    const gf = home ? fx.result.hg : fx.result.ag, ga = home ? fx.result.ag : fx.result.hg;
    if (line && line.goals >= 2) maybeNewFan(g, rng, 0.35, line.goals >= 3 ? "Que hat-trick foi aquele?!" : "Teus dois gols ontem foram demais.");
    if (!p) return;
    if (line && line.goals > 0) fanSays(g, p, rng, rng.pick(["Que golaço, amor!! Gritei muito 😍", "Meu jogador ❤️ que gol!", "Vi teu gol e chorei {l}"]), "carinho");
    else if (gf < ga) fanSays(g, p, rng, rng.pick(["Não fica mal pela derrota, tá? Tô aqui", "Vem pra casa que eu te espero ❤️"]), "carinho");
    else if (gf > ga && rng.chance(0.5)) fanSays(g, p, rng, rng.pick(["Que vitória! Orgulho de ti", "Ganhou! Hoje tem comemoração {l}"]), "feliz");
    p.lastTalk = Math.max(p.lastTalk, g.day - 3);
  }
  if (!p) return;
  if (ev.t === "injury" && ev.playerId === g.user.playerId) fanSays(g, p, rng, "Amor, vi que tu se machucou 🥺 Precisa de alguma coisa?", "triste");
  if (ev.t === "title" && ev.clubId === g.user.clubId) fanSays(g, p, rng, "CAMPEÃO!!! Tô muito orgulhosa de ti 🏆❤️", "carinho");
  if (ev.t === "user_moved") {
    const to = g.clubs[ev.to];
    if (to && to.nation !== p.nation) {
      if (p.affection >= 75 || p.vibe === "romantica") fanSays(g, p, rng, `${to.city}?? Eu vou contigo, amor. A gente dá um jeito`, "carinho");
      else { bump(g, p, { affection: -10, trust: -4 }); fanSays(g, p, rng, `Tu vai pra ${to.city}… e a gente? Namoro à distância não é fácil`, "triste"); }
    } else if (to) fanSays(g, p, rng, `Parabéns pelo ${to.name}! Vamos juntos nessa`, "feliz");
  }
}

export function fanProfile(g: GameState, f: Fan) {
  return {
    id: f.id,
    name: f.name.split(" ")[0],
    persona: `Mulher adulta de ${f.age} anos, ${f.job}, de ${f.city}. Jeito: ${VIBE_LABEL[f.vibe].toLowerCase()}. Gosta de ${f.likes.join(", ")}. Relação com o usuário: ${STAGE_LABEL[f.stage].toLowerCase()}. ${f.famous ? "É famosa." : ""} Conversa leve e respeitosa, sem conteúdo sexual.`,
    style: `Mensagens curtas de app, informal, ri com "${f.laugh}", emojis ${f.emoji > 0.6 ? "frequentes" : "às vezes"}.`,
    relation: `atração ${Math.round(f.attraction)}/100, carinho ${Math.round(f.affection)}/100, confiança ${Math.round(f.trust)}/100, ${f.dates} encontros`,
    memories: romance(g).log.filter((x) => x.text.includes(f.name)).slice(0, 4).map((x) => x.text),
  };
}
