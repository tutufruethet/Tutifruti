/**
 * Gerador local de respostas: intenção + contexto real + personalidade +
 * memória + relação. Produz falas curtas, com opinião própria e sem cara de
 * assistente. Os personagens só afirmam fatos que existem no estado do jogo.
 */
import { monthOfSeasonDay } from "./months";
import type { Analysis, Intent } from "./intents";
import type { ChatCtx } from "./context";
import type { Emo } from "./style";
import type { GameState, MemoryKind, PersonalityType, Player } from "../types";
import type { Rng } from "../rng";
import { hasMemory } from "./memory";
import { getRel } from "../chemistry/relations";
import { autoLineup } from "../match/lineup";

export interface Reply {
  lines: string[];
  emo: Emo;
  delta?: { friendship?: number; trust?: number; rivalry?: number };
  memory?: { kind: MemoryKind; text: string };
  pending?: string;
  clearPending?: boolean;
  action?: { kind: "advice"; option: "vai" | "fica" | "decide" } | { kind: "rename"; name: string };
  id: string;
  dup?: boolean;
  free?: boolean; // resposta genérica: a IA (se ligada) pode responder livremente
}

export interface TurnInput {
  g: GameState;
  rng: Rng;
  p: Player;
  ctx: ChatCtx;
  a: Analysis;
  pending?: string;
  prev: { name: string; type: PersonalityType; emo: Emo }[];
  group?: { name: string; goals: number; level: string; size: number };
  used: string[];
  raw: string;
  turnUsed?: Set<string>;
}

type Variants = Partial<Record<PersonalityType | "default", string[]>>;

/** Escolhe uma variante ainda não usada recentemente pelo personagem. */
function choose(t: TurnInput, key: string, v: Variants): { text: string; id: string; dup: boolean } {
  const type = t.p.persona.type;
  const sec = t.p.persona.secondary;
  const pool = v[type] ?? (t.rng.chance(0.5) ? v[sec] : undefined) ?? v.default ?? Object.values(v)[0] ?? [""];
  const free = (i: number) => !t.used.includes(`${key}:${type}:${i}`) && !t.turnUsed?.has(`${key}:${i}:${pool[i]}`);
  const idx = pool.map((_, i) => i).filter(free);
  const notInTurn = pool.map((_, i) => i).filter((i) => !t.turnUsed?.has(`${key}:${i}:${pool[i]}`));
  const i = idx.length ? t.rng.pick(idx) : notInTurn.length ? t.rng.pick(notInTurn) : t.rng.int(0, pool.length - 1);
  const dup = !!t.turnUsed?.has(`${key}:${i}:${pool[i]}`);
  t.turnUsed?.add(`${key}:${i}:${pool[i]}`);
  return { text: pool[i], id: `${key}:${type}:${i}`, dup };
}

const lines = (s: string) => s.split("|").map((x) => x.trim()).filter(Boolean);

function R(t: TurnInput, key: string, v: Variants, emo: Emo, extra: Partial<Reply> = {}): Reply {
  const c = choose(t, key, v);
  return { lines: lines(c.text), emo, id: c.id, dup: c.dup, ...extra };
}

const friendship = (t: TurnInput) => t.ctx.char?.rel?.friendship ?? 30;
const daysTxt = (d: number) => (d <= 0 ? "hoje" : d === 1 ? "amanhã" : d === 2 ? "depois de amanhã" : d <= 6 ? "nesse próximo jogo" : "no próximo jogo");

// ---------------- handlers ----------------

function saudacao(t: TurnInput): Reply {
  const nx = t.ctx.next;
  const r = R(t, "oi", {
    brincalhao: ["Fala {a}!! {l}", "Eae {me}, sumido", "Salve salve {a}", "Opa! Achei que tinha esquecido de mim {l}"],
    competitivo: ["Fala {a}", "Eae, focado?", "Salve. Tava pensando no jogo"],
    timido: ["oi", "e aí", "opa, tudo bem?"],
    leal: ["Fala {a}! Tudo certo?", "Eae {me}! Como tá?", "Salve, {a}"],
    ambicioso: ["Fala {me}", "Eae, tudo certo?", "Opa, fala"],
    arrogante: ["Fala, plebe {l}", "Eae {a}", "Diga"],
    lider: ["Fala, {me}. Tudo certo por aí?", "Eae {a}, como tá a cabeça?", "Salve. Tudo em ordem?"],
    emocional: ["EAEEE {a}", "Fala {me}!! Que bom que mandou msg", "Eaee"],
  }, "feliz");
  if (nx && nx.daysTo <= 2 && t.rng.chance(0.5)) r.lines.push(`${nx.daysTo === 0 ? "Hoje" : "Amanhã"} tem ${nx.opp}, hein`);
  return r;
}

function comoVai(t: TurnInput): Reply {
  const c = t.ctx.char;
  if (c?.injured) return R(t, "cv_lesao", { default: [`Tô na fisio ainda… ${c.injured.toLowerCase()} chata demais | E {vc}?`, "Recuperando. Já já volto | e tu?"], emocional: ["Mal, {a}. Essa lesão tá me matando 😩 | Mas e {vc}?"] }, "triste");
  if (c?.benched) return R(t, "cv_banco", { default: ["Mais ou menos. O professor não tá me dando chance", "Indo… cansado de ver jogo do banco"], arrogante: ["Bem, mas não entendo por que tô no banco. Sério"], timido: ["indo... só queria jogar mais"] }, "triste");
  if (t.ctx.last && t.ctx.last.charGoals > 0 && t.ctx.last.daysAgo <= 4) return R(t, "cv_gol", { default: ["Tô feliz demais com aquele gol {l} | E {vc}?", "De boa! Ainda pensando no meu gol contra o {lopp}"], arrogante: ["Bem demais. Viu meu gol né? {l}"] }, "feliz");
  if (t.ctx.last?.res === "D" && t.ctx.last.daysAgo <= 3) return R(t, "cv_derrota", { default: ["Chateado ainda com o jogo | Mas bora", "Meio mal com a derrota, sendo sincero"], competitivo: ["Puto com aquela derrota. Não consigo esquecer"], brincalhao: ["Tô bem, só não me pergunta do jogo {l}"] }, "triste");
  return R(t, "cv", {
    brincalhao: ["Tô suave, {a}! Só pensando no {food} de hoje {l}", "De boa demais. E tu, véi?", "Melhor agora {l} e aí?"],
    competitivo: ["Bem. Focado. E tu?", "Tranquilo, treinando forte"],
    timido: ["tudo bem sim", "de boa... e vc?"],
    leal: ["Tô bem, {a}! E tu, tá precisando de algo?", "Tudo certo! E contigo?"],
    ambicioso: ["Bem. Correndo atrás das minhas coisas", "Tranquilo. E você?"],
    arrogante: ["Melhor impossível {l}", "Bem, sempre"],
    lider: ["Tudo certo. E a cabeça, como tá?", "Bem, graças a Deus. E tu?"],
    emocional: ["Tô bem!! Meio cansado mas feliz", "Ah, tô bem! Saudade de casa só"],
  }, "neutro");
}

function sairClube(t: TurnInput): Reply {
  const promised = hasMemory(t.g, t.p.id, "promessa_ficar", 200);
  const offer = t.ctx.offers[0];
  const close = friendship(t) >= 55;
  const base: Partial<Reply> = { pending: "why_leave", memory: { kind: "avisou_saida", text: "Você contou que estava pensando em sair do clube." }, delta: { trust: 1 } };
  if (t.ctx.coachMode) return R(t, "sair_coach", { default: ["Sério, professor? Logo agora?", "Pô, professor… o grupo confia no senhor"], ambicioso: ["Se for clube grande, entendo. Mas e a gente?"] }, "duvida", base);
  if (promised && t.rng.chance(0.75)) return R(t, "sair_promessa", { default: ["Ué. Tu não falou na entrevista que ia ficar?", "Peraí… e aquela história de 'meu foco é aqui'?"], brincalhao: ["KKKKK e a entrevista dizendo que ia ficar? Tá de zoeira"], emocional: ["Mas tu prometeu que ia ficar 😔"] }, "duvida", base);
  const v: Variants = {
    brincalhao: ["QUE??? Tá maluco, {a}? {l}", "Aí tu me quebra {l} | Vai pra onde?", "Sair? E quem vai pagar o {food} da resenha? {l}"],
    competitivo: ["Sair agora? A gente ainda não ganhou nada aqui", "Vai fugir da briga? Logo agora que tá encaixando?"],
    timido: ["sério?", "pô... por quê?"],
    leal: close ? ["Pô, {a}, sério? A gente tá construindo uma história aqui. Por que tu quer sair?", "Não faz isso, irmão. Senta aqui e me conta o que tá pegando"] : ["Sério? Por quê?", "Poxa. O que aconteceu?"],
    ambicioso: ["Depende. Pra onde? Se for clube grande, eu entendo", "Faz sentido se for pra crescer. Tem proposta?"],
    arrogante: ["Vai lá, a gente se vira {l}", "Sair pra jogar onde, no banco de outro time? {l}"],
    lider: ["Calma. Antes de decidir, pensa bem: o que tá faltando aqui?", "Senta aí. Me fala o motivo real"],
    emocional: ["Não faz isso comigo, {a} 😭", "Mano, sério?? Vou sentir muita falta"],
  };
  const r = R(t, "sair", v, t.p.persona.type === "emocional" ? "triste" : "duvida", base);
  if (offer && t.rng.chance(0.6)) r.lines.push(`É por causa da proposta do ${offer.club}?`);
  return r;
}

function proposta(t: TurnInput): Reply {
  const offer = t.ctx.offers.find((o) => t.a.clubIds.includes(o.clubId)) ?? (t.a.clubIds.length ? undefined : t.ctx.offers[0]);
  if (t.ctx.coachMode) return R(t, "prop_coach", { default: ["Proposta pro senhor? Espero que fique, professor"] }, "duvida");
  if (offer) {
    const v: Variants = {
      brincalhao: [`Aquela do ${offer.club}? Tá todo mundo comentando {l} | ${offer.wage} por semana, hein, rico`, `${offer.club}?? Aí tu me quebra {l}`],
      competitivo: [`O ${offer.club} é bom, mas aqui tu é peça importante. Pensa bem`],
      timido: [`do ${offer.club}? caramba`, "nossa... e vc vai aceitar?"],
      leal: [`Vi que o ${offer.club} quer tu… só não queria perder nossa parceria`, `${offer.club}, né? Se for bom pra tua carreira eu entendo. Mas vou sentir falta`],
      ambicioso: [`${offer.fee} e ${offer.wage}/sem? Pô, dá pra pensar seriamente`, `O ${offer.club} tá pagando bem. Eu iria, sendo sincero`],
      arrogante: [`${offer.club}? Eles queriam era eu, mas beleza {l}`, `Até que é um clube decente`],
      lider: [`Pensa no papel que te prometeram: ${offer.role}. Dinheiro sem jogar não adianta`, `O ${offer.club} é uma boa vitrine. Mas avalia o momento daqui`],
      emocional: [`Já tô sabendo do ${offer.club}... vou chorar se tu for 😢`],
    };
    return R(t, "prop_real", v, "duvida", { clearPending: true });
  }
  // usuário fala de proposta que o jogo não registra: reage sem afirmar como fato
  const name = t.a.clubIds.length ? t.g.clubs[t.a.clubIds[0]].name : t.a.clubText ? t.a.clubText.replace(/\b\w/g, (c) => c.toUpperCase()) : "";
  const v: Variants = {
    brincalhao: [`${name ? name + "?? " : ""}Aí tu me quebra {l} | Mas quanto tão oferecendo?`, `Proposta? Ninguém falou nada disso no CT {l} | Quanto é?`],
    competitivo: [`${name || "Quem"}? E tu vai largar a gente no meio da temporada?`, "Proposta de quem? Quanto?"],
    timido: ["sério? de quem?", "nossa... quanto?"],
    leal: [`${name ? "Do " + name + "? " : ""}Pô… se for bom pra tua carreira, eu entendo. Só não queria perder nossa parceria`],
    ambicioso: ["Quanto tão oferecendo? Isso muda tudo", `${name ? name + " é" : "Depende de quem é"}. E o salário?`],
    arrogante: [`${name || "Quem"}? Nunca ouvi falar que eles queriam tu {l}`, "Proposta pra tu? Duvido {l} | Quanto?"],
    lider: ["Calma. Já chegou algo oficial pro clube ou é só sondagem?", "Antes de tudo: é oficial? Quanto e pra jogar?"],
    emocional: [`Ai não… ${name ? "o " + name + "?" : "de quem?"} Quanto tão oferecendo?`],
  };
  return R(t, "prop_rumor", v, "duvida", { pending: "offer_amount" });
}

function valor(t: TurnInput): Reply {
  const m = t.a.money ?? 0;
  const me = t.ctx.coachMode ? undefined : t.g.players[t.ctx.meId];
  const annual = (me?.contract.wage ?? 20_000) * 52;
  const big = m >= Math.max(annual * 1.8, (me?.value ?? 1e6) * 1.2);
  const v: Variants = big
    ? {
        brincalhao: ["CARAMBA {l} | Isso é dinheiro pra caramba", "Aí sim, vai comprar um carro pra mim? {l}"],
        competitivo: ["É muito dinheiro. Mas título não se compra"],
        timido: ["caramba... é muito"],
        leal: ["É muito dinheiro, entendo se tu pensar. Mas lembra do que a gente tá construindo"],
        ambicioso: ["Aceita. Sério. Isso não aparece duas vezes", "Com esse valor eu nem pensava"],
        arrogante: ["Bom valor. Eu valho o dobro, mas pra tu tá ótimo {l}"],
        lider: ["É uma proposta séria. Conversa com teu empresário e com a família antes"],
        emocional: ["Nossa… com isso eu nem consigo te pedir pra ficar 😔"],
      }
    : {
        brincalhao: ["Só isso? {l} Pede mais", "Isso aí tu ganha aqui {l}"],
        competitivo: ["Pouco. Não vale largar o que a gente tem aqui"],
        timido: ["hmm... não sei se vale"],
        leal: ["Por isso aí não vale sair, {a}"],
        ambicioso: ["Pouco. Segura que vem coisa melhor", "Negocia. Dá pra tirar mais"],
        arrogante: ["Isso é proposta ou esmola? {l}"],
        lider: ["Não muda tua vida. Fica e cresce aqui"],
        emocional: ["Então fica!! Por isso não vale"],
      };
  return R(t, big ? "valor_alto" : "valor_baixo", v, big ? "duvida" : "feliz", { clearPending: true });
}

function assinei(t: TurnInput): Reply {
  const mv = t.ctx.movedRecently;
  if (!mv) {
    return R(t, "assinei_falso", {
      brincalhao: ["Assinou?? Para de mentir {l} ninguém tá sabendo disso", "KKKKK assinou com quem, com o time do videogame?"],
      timido: ["sério? não vi nada sobre isso"],
      arrogante: ["Até parece {l}"],
      lider: ["Assinou? Nada foi anunciado. Tá falando sério?"],
      default: ["Assinou? Não tô sabendo de nada disso não", "Tá de zoeira né? Ninguém anunciou nada"],
    }, "duvida", { pending: "confirm_sign" });
  }
  const told = hasMemory(t.g, t.p.id, "avisou_saida", 60);
  const promised = hasMemory(t.g, t.p.id, "promessa_ficar", 250);
  if (told) {
    return R(t, "assinei_avisado", {
      default: [`Eu sabia que ia acontecer… vai com tudo no ${mv.to}`, `Já esperava. Boa sorte lá no ${mv.to}, {a}`],
      emocional: ["Ainda tô triste, mas vou torcer por ti 😔", `Vai voar no ${mv.to}. Só não esquece da gente`],
      arrogante: [`Boa. Agora vou ser o craque daqui sozinho {l}`],
      ambicioso: [`Decisão certa. O ${mv.to} é outro patamar`],
    }, "carinho", { delta: { friendship: 1 } });
  }
  return R(t, "assinei_surpresa", {
    leal: ["Pô, tu nem falou comigo antes, velho?", "Sério que eu soube pela notícia?"],
    emocional: ["Tu nem me contou?? 💔", "Achei que a gente era amigo de verdade…"],
    brincalhao: ["Tu nem avisou, safado {l} | Mas tá suave"],
    competitivo: ["Saiu sem falar nada. Beleza. A gente vai te enfrentar"],
    timido: ["pô... nem falou nada"],
    arrogante: ["Nem avisou, mas sem problema. Problema teu {l}"],
    ambicioso: [`Entendo. Era tua chance. Só podia ter avisado`],
    lider: [`Respeito a decisão. Mas devia ter conversado com o grupo`],
    default: ["Pô, tu nem falou comigo antes, velho?"],
  }, "triste", {
    delta: { trust: promised ? -7 : -5, friendship: -3 },
    memory: { kind: promised ? "quebrou_promessa" : "saiu_sem_avisar", text: promised ? `Você prometeu ficar e depois assinou com o ${mv.to} sem avisar.` : `Você assinou com o ${mv.to} sem falar com ele antes.` },
  });
}

function desculpa(t: TurnInput): Reply {
  const hurt = ["saiu_sem_avisar", "quebrou_promessa", "ofensa", "conflito"].map((k) => hasMemory(t.g, t.p.id, k as MemoryKind, 120)).find(Boolean);
  if (hurt) {
    const v: Variants = {
      leal: ["Suave... só achei que a gente ia ganhar mais coisa junto", "Tá tudo bem, {a}. Só fiquei chateado na hora"],
      emocional: ["Tá bom… eu só fiquei magoado mesmo | Mas tá perdoado 🫂"],
      arrogante: ["Beleza, beleza. Já passou"],
      competitivo: ["Ok. Bola pra frente"],
      timido: ["tudo bem..."],
      brincalhao: ["Desculpo se tu pagar o {food} {l}"],
      default: ["Suave. Bola pra frente"],
    };
    return R(t, "desculpa_ok", v, "carinho", { delta: { friendship: 2, trust: 3, rivalry: -2 }, memory: { kind: "reconciliacao", text: "Você pediu desculpas e vocês fizeram as pazes." } });
  }
  return R(t, "desculpa_nada", { default: ["Desculpa pelo quê? {l}", "Relaxa, tá tudo certo"], timido: ["ué, por quê?"] }, "neutro");
}

function ficar(t: TurnInput): Reply {
  const wasLeaving = t.pending === "why_leave" || !!hasMemory(t.g, t.p.id, "avisou_saida", 40) || t.ctx.offers.length > 0;
  if (!wasLeaving) return R(t, "ficar_nada", { default: ["Claro que vai, ué {l}", "E alguém falou o contrário?"], lider: ["Isso. Foco aqui"] }, "feliz");
  return R(t, "ficar", {
    brincalhao: ["AGORA SIM {l} | Sabia que tu não ia aguentar sem mim", "Isso aí!! Bora fazer história"],
    competitivo: ["Boa. Agora bora ganhar alguma coisa", "Decisão certa. A gente vai buscar o título"],
    timido: ["que bom, sério", "fico feliz"],
    leal: ["Isso, {a}!! Juntos a gente vai longe", "Melhor notícia da semana. Tamo junto"],
    ambicioso: ["Ok. Só garante que vão te valorizar aqui"],
    arrogante: ["Sabia. Ninguém larga um time comigo dentro {l}"],
    lider: ["Decisão madura. O grupo precisa de você"],
    emocional: ["AAAAA que alívio 😭❤️", "Tu não sabe como eu fiquei feliz agora"],
  }, "feliz", { delta: { friendship: 2, trust: 2 }, memory: { kind: "promessa_ficar", text: "Você disse a ele que ia ficar no clube." }, clearPending: true });
}

function jogoFacil(t: TurnInput): Reply {
  const nx = t.ctx.next;
  if (!nx) return R(t, "facil_sem", { default: ["Que jogo? A gente nem tem jogo marcado {l}"] }, "neutro");
  const strong = (nx.oppWins ?? 0) >= 3 || (nx.oppPos ?? 20) <= 4;
  const confident: PersonalityType[] = ["brincalhao", "arrogante", "competitivo", "emocional"];
  const followsCaution = t.prev.some((x) => !confident.includes(x.type));
  const isConf = confident.includes(t.p.persona.type) && !(t.p.persona.type === "emocional" && strong);
  const why = nx.oppWins !== undefined && nx.oppWins >= 3 ? `Os caras ganharam ${nx.oppWins} dos últimos 5` : nx.oppPos && nx.oppPos <= 4 ? `Eles tão em ${nx.oppPos}º` : nx.derby ? "É clássico, não tem jogo fácil" : nx.final ? "É final, {a}" : "Não tem jogo fácil";
  if (isConf && !(followsCaution && t.p.persona.type === "competitivo")) {
    return R(t, "facil_conf", {
      brincalhao: [`KKKKK os caras do ${nx.opp} vão sofrer ${daysTxt(nx.daysTo)} 😂`, "Vai ser baile! Já separei a dancinha {l}"],
      arrogante: ["Fácil demais. Eu resolvo sozinho {l}", `${nx.opp}? Chama de treino {l}`],
      competitivo: ["Vamo amassar. Quero 3 gols de diferença", `Fácil não sei, mas vamo pra cima do ${nx.opp} desde o primeiro minuto`],
      emocional: ["BORAAAA 🔥 vai ser lindo"],
    }, "hype");
  }
  return R(t, "facil_cautela", {
    default: [`Calma aí, {a}. ${why}. Bora entrar concentrado`, `Ih, cuidado com isso. ${why}`],
    lider: [`Calma. ${why}. Respeita o adversário e a gente ganha`, `Não fala isso nem de brincadeira. ${why}`],
    timido: [`calma... ${why.toLowerCase()}`],
    leal: [`Calma aí, {a}. ${why}. Mas a gente consegue`],
  }, "neutro");
}

function jogoDificil(t: TurnInput): Reply {
  return R(t, "dificil", {
    brincalhao: ["Relaxa! Se der ruim a gente culpa o juiz {l}", "Nervoso? Tu? Quem vê pensa {l}"],
    competitivo: ["Difícil nada. Vamo pra cima deles", "Pressão é privilégio. Bora"],
    timido: ["também tô nervoso", "vai dar certo..."],
    leal: ["Tamo junto, {a}. Um ajuda o outro em campo", "Confia no grupo. A gente segura"],
    ambicioso: ["Jogo grande é onde a gente aparece pra mercado"],
    arrogante: ["Difícil pra eles {l}"],
    lider: ["Normal sentir isso. Foca na tua função e no primeiro passe certo", "Respira. Treinamos pra isso"],
    emocional: ["Eu também tô com frio na barriga 😅 mas bora"],
  }, "carinho", { delta: { friendship: 1 } });
}

function proximoJogo(t: TurnInput): Reply {
  const nx = t.ctx.next;
  if (!nx) return R(t, "prox_sem", { default: ["Por enquanto não tem nada marcado"] }, "neutro");
  const r = R(t, "prox", {
    default: [`${daysTxt(nx.daysTo).replace(/^./, (c) => c.toUpperCase())}, ${nx.home ? "em casa" : "fora"}, contra o ${nx.opp}. ${nx.comp}`],
  }, "neutro");
  const op = R(t, "prox_op", {
    brincalhao: ["Vai ter gol meu {l}"],
    competitivo: ["Tô com sangue nos olhos"],
    timido: ["tô treinando bastante pra esse"],
    leal: ["Bora fazer o nosso"],
    ambicioso: ["Jogo pra mostrar serviço"],
    arrogante: ["Vai ser fácil"],
    lider: ["Precisa de concentração total"],
    emocional: ["Tô ansioso já"],
  }, "hype");
  r.lines.push(...op.lines);
  return r;
}

function ultimoJogo(t: TurnInput): Reply {
  const l = t.ctx.last;
  if (!l) return R(t, "ult_sem", { default: ["Ainda nem jogamos {l}"] }, "neutro");
  const res = l.res === "V" ? `Ganhamos de ${l.gf} a ${l.ga}` : l.res === "D" ? `Perdemos de ${l.ga} a ${l.gf}` : `Empate em ${l.gf} a ${l.ga}`;
  const when = l.daysAgo <= 1 ? "" : l.daysAgo <= 7 ? " no último jogo" : " na última vez que jogamos";
  const r = R(t, "ult", { default: [`${res} do {lopp}${when}`] }, l.res === "V" ? "feliz" : l.res === "D" ? "triste" : "neutro");
  const op: Variants = l.res === "V"
    ? { default: ["Jogamos bem", "Merecido"], competitivo: ["Podia ter sido mais"], brincalhao: ["Foi lindo {l}"], arrogante: ["Fácil"], emocional: ["Que alegria"] }
    : l.res === "D"
      ? { default: ["Dia ruim", "Dói ainda"], competitivo: ["Não aceito perder assim"], lider: ["Tem coisa pra corrigir"], emocional: ["Fiquei mal demais"] }
      : { default: ["Podia ter sido melhor", "Ponto é ponto"], competitivo: ["Empate é derrota pra mim"], brincalhao: ["Empate com gosto de nada {l}"] };
  r.lines.push(...R(t, `ult_op_${l.res}`, op, r.emo).lines);
  if (!l.charPlayed && t.ctx.char?.sameClub && t.rng.chance(0.5)) r.lines.push("Pena que eu nem entrei");
  else if (l.charRating && l.charRating >= 7.5) r.lines.push(`Joguei bem, né? Nota ${l.charRating.toFixed(1).replace(".", ",")} {l}`);
  return r;
}

function vitoria(t: TurnInput): Reply {
  const l = t.ctx.last;
  if (!l || l.daysAgo > 6) return R(t, "vit_sem", { default: ["Ganhamos o quê? {l} faz tempo que não tem jogo"] }, "duvida");
  if (l.res !== "V") return R(t, "vit_falsa", { default: [`Ganhamos? A gente ${l.res === "D" ? "perdeu" : "empatou"} pro ${l.opp}, tá sonhando? {l}`] }, "duvida");
  const r = R(t, "vit", {
    brincalhao: [`QUE JOGO {l} ${l.gf} a ${l.ga} no ${l.opp}`, "Toma toma toma {l}"],
    competitivo: ["Isso! Agora é manter o ritmo", `${l.gf} a ${l.ga}. Podia ter sido mais`],
    timido: ["foi muito bom", "que jogo..."],
    leal: ["Vitória do grupo, {a}! Orgulho dessa rapaziada"],
    ambicioso: ["Três pontos importantes. Bora subir na tabela"],
    arrogante: ["Falei que ia ser fácil {l}"],
    lider: ["Boa vitória. Descansa que tem mais"],
    emocional: ["QUE ALEGRIAAA 😭🔥", "Chorei no vestiário, sério"],
  }, "hype");
  if (l.charGoals > 0 && t.rng.chance(0.7)) r.lines.push(l.charGoals > 1 ? `E eu fiz ${l.charGoals}, né {l}` : "E o meu gol, hein?");
  else if (l.myGoals > 0 && t.rng.chance(0.6)) r.lines.push(l.myGoals >= 3 ? "E que hat-trick o teu! 😂" : "E teu gol foi lindo");
  return r;
}

function derrota(t: TurnInput): Reply {
  const l = t.ctx.last;
  if (!l || l.daysAgo > 6) return R(t, "der_sem", { default: ["Que jogo? {l}"] }, "duvida");
  if (l.res !== "D") return R(t, "der_falsa", { default: [`Perdemos? A gente ${l.res === "V" ? `ganhou de ${l.gf} a ${l.ga}` : "empatou"}, tá doido? {l}`] }, "duvida");
  return R(t, "der", {
    brincalhao: ["Nem me lembra {l}… dói", "Bora esquecer isso com um {food}"],
    competitivo: ["Inaceitável. Não dá pra perder pro " + l.opp, "Tô puto até agora"],
    timido: ["foi ruim mesmo", "é..."],
    leal: ["Cabeça erguida, {a}. A gente se levanta junto", "Derrota de todo mundo. Ninguém tem culpa sozinho"],
    ambicioso: ["Isso pesa na tabela. Precisa reagir rápido"],
    arrogante: ["Se tivessem passado mais a bola pra mim…"],
    lider: ["Analisa, aprende e esquece. Próximo jogo é o que importa"],
    emocional: ["Tô arrasado 😞", "Não consegui dormir, sério"],
  }, l.final ? "triste" : "triste", { delta: { friendship: t.p.persona.type === "leal" || t.p.persona.type === "lider" ? 1 : 0 } });
}

function meuGol(t: TurnInput): Reply {
  const l = t.ctx.last;
  if (l && l.myGoals > 0 && l.daysAgo <= 6) {
    return R(t, "meugol", {
      brincalhao: ["Golaço mesmo, {a}! Mas a comemoração foi horrível {l}", "Tá se achando né {l} mas foi bonito"],
      competitivo: ["Bom gol. Agora faz mais um no próximo"],
      timido: ["foi muito bonito"],
      leal: ["Que gol, {a}! Fiquei feliz demais por ti"],
      ambicioso: ["Gol assim valoriza teu passe, hein"],
      arrogante: ["Bonito, mas o meu foi mais {l}", "Até que tu chuta bem"],
      lider: ["Mereceu. Treinou pra isso"],
      emocional: ["CHOREI com teu gol 😭"],
    }, "feliz", { delta: { friendship: 1 } });
  }
  const none = t.ctx.meGoalsSeason === 0;
  return R(t, "meugol_falso", { default: [none ? "Que gol? Tu nem marcou na temporada ainda {l}" : "Que gol? No último jogo tu não marcou não {l}"], timido: ["hm, qual gol?"] }, "duvida");
}

function elogio(t: TurnInput): Reply {
  return R(t, "elogio", {
    brincalhao: ["Eu sei {l} mas fala mais", "Para que eu fico vermelho {l}"],
    competitivo: ["Valeu. Mas dá pra melhorar"],
    timido: ["valeu... sério", "obrigado 😊"],
    leal: ["Valeu, {a}! Mérito teu também"],
    ambicioso: ["Valeu. Tomara que os olheiros pensem igual"],
    arrogante: ["Eu sei {l}", "Novidade nenhuma"],
    lider: ["Obrigado. O grupo todo jogou bem"],
    emocional: ["Aaaa obrigado, isso me deixa muito feliz ❤️"],
  }, "feliz", { delta: { friendship: 2 }, memory: { kind: "elogio", text: "Você elogiou o futebol dele." } });
}

function aniversario(t: TurnInput): Reply {
  if (t.ctx.char?.birthdayToday) {
    return R(t, "niver", {
      brincalhao: ["Valeuu {a}!! Cadê o presente? {l}", "Obrigado! Hoje o {food} é por minha conta"],
      timido: ["obrigado, de verdade", "nossa, valeu por lembrar"],
      emocional: ["Tu lembrou!! Que felicidade ❤️", "Obrigado, {a}, de coração 🙏"],
      arrogante: ["Valeu. Mais um ano sendo o melhor {l}"],
      default: ["Valeu, {a}! Tmj", "Obrigado por lembrar!"],
    }, "carinho", { delta: { friendship: 4, trust: 1 }, memory: { kind: "aniversario", text: "Você lembrou do aniversário dele." } });
  }
  const month = monthOfSeasonDay(t.p.persona.birthday);
  return R(t, "niver_errado", { default: [`Hoje não é meu aniversário não {l} é em ${month}`] }, "feliz");
}

function ofensa(t: TurnInput): Reply {
  const joking = t.a.laugh && friendship(t) >= 38;
  if (joking) return R(t, "ofensa_zoeira", { default: ["Perna de pau é tu {l}", "Vai sonhando {l}"], timido: ["kkk para"] }, "feliz");
  return R(t, "ofensa", {
    brincalhao: ["Pô, pegou pesado agora", "Ei, sem essa. Zoeira tem limite"],
    competitivo: ["Fala isso na minha cara no treino", "Beleza. Vou lembrar disso"],
    timido: ["...", "ok"],
    leal: ["Não esperava isso de ti", "Pô, desnecessário, {a}"],
    ambicioso: ["Tranquilo. Cada um com sua opinião"],
    arrogante: ["Olha quem fala {l} | Vai treinar"],
    lider: ["Calma. Isso não ajuda ninguém"],
    emocional: ["Isso doeu, sério 😞"],
  }, t.p.persona.type === "arrogante" || t.p.persona.type === "competitivo" ? "raiva" : "triste", { delta: { friendship: -5, trust: -3, rivalry: 4 }, memory: { kind: "ofensa", text: "Você o ofendeu numa conversa." } });
}

const JOKES = [
  "Sabe por que o goleiro não vai em festa? Porque ele só pega bola {l}",
  "Hoje o professor mandou eu correr mais. Corri pro refeitório {l}",
  "Meu chute de hoje no treino tá em órbita até agora {l}",
  "O roupeiro disse que minha chuteira cheira pior que o gramado {l}",
];

function zoeira(t: TurnInput): Reply {
  if (t.p.persona.type === "brincalhao" && t.rng.chance(0.5)) return { lines: [t.rng.pick(JOKES)], emo: "feliz", id: `piada:${t.rng.int(0, 99)}`, delta: { friendship: 1 } };
  return R(t, "zoeira", {
    default: ["{l}", "{l} tu não presta", "Kkkkk para"],
    timido: ["kkk"],
    lider: ["Kkk vocês não têm jeito"],
    competitivo: ["{l} foco, rapaziada"],
  }, "feliz", { delta: { friendship: 0.5 } });
}

function banco(t: TurnInput): Reply {
  if (t.ctx.coachMode) return R(t, "banco_coach", { default: ["Professor, quero muito jogar mais. Tô treinando forte", "Tô pronto quando o senhor precisar"] }, "neutro");
  if (t.ctx.benchStreak < 1 && t.ctx.last && t.ctx.last.myRating) return R(t, "banco_falso", { default: ["Banco? Tu jogou o último jogo {l}"] }, "duvida");
  return R(t, "banco", {
    brincalhao: ["O banco é confortável pelo menos {l} | Mas sério, tua hora chega"],
    competitivo: ["Então mostra no treino. Toma a vaga", "Reclamar não adianta. Faz o professor te escalar"],
    timido: ["pô... vai melhorar", "eu também passei por isso"],
    leal: ["Pra mim tu é titular, {a}. O professor tá errado", "Continua firme. Eu falo de ti pro professor se precisar"],
    ambicioso: ["Se não tá jogando, pensa no teu futuro. Carreira é curta"],
    arrogante: ["Normal, a concorrência aqui é forte {l}"],
    lider: ["Treina forte e com cabeça boa. Tua chance vem e tu tem que estar pronto"],
    emocional: ["Isso me deixa triste por ti 😔 tu merece jogar"],
  }, "carinho", { delta: { friendship: 1 }, memory: { kind: "pediu_conselho", text: "Você desabafou com ele sobre ficar no banco." } });
}

function tecnico(t: TurnInput): Reply {
  const club = t.g.user.clubId ? t.g.clubs[t.g.user.clubId] : undefined;
  if (t.ctx.coachMode) return R(t, "tec_coach", { default: ["O senhor tá fazendo bom trabalho, professor", "Confio no senhor, professor"], arrogante: ["O senhor é bom, mas tem que me escalar mais"] }, "neutro");
  if (t.ctx.char?.benched) return R(t, "tec_ruim", { default: [`O ${club?.coachName.split(" ")[0] ?? "professor"}? Não tá me dando chance`, "Sei lá. Tem uns critérios estranhos"] }, "triste");
  return R(t, "tec", {
    default: [`O ${club?.coachName.split(" ")[0] ?? "professor"} é exigente, mas sabe o que faz`, "Gosto dele. Cobra bastante, mas é justo"],
    arrogante: ["Ele precisa me ouvir mais {l}"],
    brincalhao: ["Ele grita mais que minha mãe {l}"],
  }, "neutro");
}

function conselho(t: TurnInput): Reply {
  if (t.ctx.offers.length) return proposta(t);
  if (t.ctx.benchStreak >= 2) return banco(t);
  return R(t, "conselho", {
    brincalhao: ["Meu conselho? Come um {food} que tudo melhora {l}", "Faz o que teu coração mandar. E me paga um açaí"],
    competitivo: ["Faz o que te deixa mais perto de ganhar"],
    timido: ["acho que tu sabe o que é melhor"],
    leal: ["Seja o que for, tô contigo. Mas pensa nas pessoas que tão do teu lado"],
    ambicioso: ["Pensa na tua carreira primeiro. Ninguém vai pensar por ti"],
    arrogante: ["Faz o que eu faria: o melhor pra ti {l}"],
    lider: ["Lista prós e contras. E não decide com raiva nem empolgado"],
    emocional: ["Segue o coração, {a}"],
  }, "neutro", { delta: { trust: 1 } });
}

function obrigado(t: TurnInput): Reply {
  return R(t, "obg", { default: ["Tmj {a}", "Nada! Conta comigo", "{pet}"], lider: ["Conta comigo sempre"], timido: ["imagina"], arrogante: ["Me deve uma {l}"] }, "carinho", { delta: { friendship: 0.5 } });
}

function convite(t: TurnInput): Reply {
  const hobby = t.p.persona.hobby;
  const matches = t.a.norm.includes(hobby.split(" ")[0].normalize("NFD").replace(/[̀-ͯ]/g, ""));
  const nx = t.ctx.next;
  if (nx && nx.daysTo <= 1 && ["lider", "competitivo", "ambicioso"].includes(t.p.persona.type)) {
    return R(t, "conv_jogo", { default: [`Hoje não, ${nx.daysTo === 0 ? "hoje" : "amanhã"} tem jogo. Depois a gente marca`] }, "neutro");
  }
  return R(t, matches ? "conv_hobby" : "conv", matches ? {
    default: [`BORA! Tu sabe que eu amo ${hobby}`, `Agora tu falou minha língua. ${hobby} é comigo mesmo`],
    timido: [`opa, ${hobby} eu topo`],
  } : {
    brincalhao: ["Bora!! Mas quem paga é tu {l}", "Fechou, tô dentro"],
    competitivo: ["Bora, mas vou te ganhar {l}"],
    timido: ["pode ser...", "acho que dá"],
    leal: ["Bora sim, {a}! Chama o resto da rapaziada"],
    ambicioso: ["Pode ser, se não atrapalhar o treino"],
    arrogante: ["Se eu tiver tempo na agenda {l}"],
    lider: ["Bora. Bom pra unir o grupo"],
    emocional: ["SIMMM bora 😁"],
  }, "feliz", { delta: { friendship: 2 }, memory: { kind: "convite", text: "Vocês combinaram de sair juntos." } });
}

function pessoal(t: TurnInput): Reply {
  const p = t.p.persona;
  return R(t, "pessoal", {
    default: [`Sou de ${p.hometown || "longe"}. Saudade de lá | E tu, tá curtindo a cidade?`, `Nas folgas é ${p.hobby} direto {l}`, `Ninguém faz ${p.food} igual minha mãe, sem discussão`],
    timido: [`gosto de ${p.hobby}... e tu?`],
    brincalhao: [`Meu negócio é ${p.hobby} e ${p.food} {l} vida boa`],
  }, "neutro", { delta: { friendship: 1 } });
}

function sonho(t: TurnInput): Reply {
  const p = { ...t.p.persona };
  const inEurope = t.p.clubId && t.g.nations[t.g.clubs[t.p.clubId]?.nation]?.region === "EU";
  if (inEurope && p.dream === "jogar na Europa") p.dream = "ganhar um título continental";
  return R(t, "sonho", {
    default: [`Meu sonho é ${p.dream}. E o teu?`, `Penso muito em ${p.dream}. Um dia chega`],
    timido: [`sonho com ${p.dream}... mas não conto pra ninguém`],
    arrogante: [`Vou ${p.dream.replace(/^ser /, "virar ")}, é questão de tempo {l}`],
  }, "neutro", { delta: { trust: 1 } });
}

function grupo(t: TurnInput): Reply {
  const gr = t.group;
  if (gr) {
    return R(t, "grupo", {
      default: [`${gr.name} tá voando. ${gr.goals} gols juntos já`, `A gente se entende de olho fechado, né? ${gr.goals} gols combinados`],
      brincalhao: [`${gr.name} é o terror da liga {l}`],
      arrogante: [`O trio é bom porque eu tô nele {l}`],
      emocional: ["Amo jogar com vocês, sério ❤️"],
    }, "hype", { delta: { friendship: 1 } });
  }
  const chem = t.ctx.char?.rel?.chemistry ?? 0;
  if (chem >= 45) return R(t, "grupo_quase", { default: ["Tá encaixando, né? Mais uns jogos e a gente vira dupla de respeito", "Sinto que tá melhorando nosso entrosamento"] }, "feliz");
  return R(t, "grupo_nao", { default: ["A gente mal joga junto ainda {l}", "Entrosamento a gente constrói em campo"] }, "neutro");
}

function tchau(t: TurnInput): Reply {
  return R(t, "tchau", { default: ["Falou {a}", "Tmj", "Valeu, até amanhã"], timido: ["falou"], lider: ["Descansa bem"], brincalhao: ["Vai lá, vai sonhar comigo {l}"] }, "neutro");
}

function lesao(t: TurnInput): Reply {
  if (t.ctx.meInjured) return R(t, "les_user", { default: ["Como tá a recuperação? Faz tudo que o fisio mandar", "Melhoras, {a}! A gente precisa de ti"], brincalhao: ["Para de fazer corpo mole {l} brincadeira, melhoras"] }, "carinho", { delta: { friendship: 1 } });
  if (t.ctx.char?.injured) return comoVai(t);
  return R(t, "les_nada", { default: ["Graças a Deus tô inteiro", "Tô bem, sem dor"] }, "neutro");
}

function titulo(t: TurnInput): Reply {
  const won = t.g.history.champions.find((c) => c.winnerId === t.g.user.clubId && t.g.day - (t.g.history.milestones.find((m) => m.text.includes(c.compName))?.day ?? -999) <= 14);
  if (won) return R(t, "tit_ganho", { default: [`${won.compName} é NOSSA {l}`, "Ainda não caiu a ficha que somos campeões"], emocional: ["Chorei tanto 😭🏆"] }, "hype", { memory: { kind: "titulo_junto", text: `Vocês comemoraram juntos o título da ${won.compName}.` } });
  return R(t, "tit", { default: ["Esse ano é nosso, tô sentindo", "Quero muito levantar uma taça com essa camisa"], competitivo: ["Só penso em título"], ambicioso: ["Título valoriza todo mundo. Bora"] }, "hype");
}

function companheiro(t: TurnInput): Reply {
  const mid = t.a.mates.find((m) => m !== t.p.id);
  if (!mid) return fallback(t);
  const mate = t.g.players[mid];
  const rel = getRel(t.g, t.p.id, mid);
  if (rel && rel.rivalry >= 40) return R(t, "comp_rival", { default: [`Nem me fala do ${mate.first}...`, `O ${mate.first} e eu não se bica muito, tu sabe`] }, "raiva");
  if (rel && rel.friendship >= 55) return R(t, "comp_amigo", { default: [`O ${mate.first} é gente boa demais`, `${mate.first} é parceiro de verdade`] }, "feliz");
  return R(t, "comp", { default: [`O ${mate.first}? Bom jogador`, `${mate.first} tá jogando bem`] }, "neutro");
}

function simNao(t: TurnInput, yes: boolean): Reply {
  if (t.pending === "confirm_sign") return yes ? R(t, "conf_sign", { default: ["Então me mostra o anúncio {l} não vi nada"] }, "duvida", { clearPending: true }) : R(t, "conf_sign_n", { default: ["Sabia {l} quase caí"] }, "feliz", { clearPending: true });
  return R(t, yes ? "sim" : "nao", yes ? { default: ["Pode crer", "Isso aí", "Fechou"] } : { default: ["Tranquilo", "Beleza então", "Hmm, ok"] }, "neutro");
}

function advice(t: TurnInput, opt: "vai" | "fica"): Reply | null {
  if (!t.ctx.char?.adviceDecision) return null;
  return {
    lines: lines(opt === "fica" ? "Pô… vou pensar com carinho nisso | Valeu por falar" : "Valeu, {a}. Vou pensar mesmo | Tu é parceiro"),
    emo: "carinho", id: `advice:${opt}`, action: { kind: "advice", option: opt }, delta: { trust: 1 },
  };
}

function rename(t: TurnInput): Reply | null {
  const m = t.raw.match(/(?:chamar de|nome de|se chamar|vai ser|apelido de|chama de)\s+["“]?([^"”?!.]{2,28})["”]?/i);
  if (!m || !t.group) return null;
  const name = m[1].trim();
  return R(t, "rename", {
    default: [`"${name}"? Gostei! Fechou`, `${name}... até que é bom {l}`],
    arrogante: [`${name}? Podia ter meu nome no meio {l} mas tá bom`],
    timido: [`${name.toLowerCase()}... gostei`],
  }, "feliz", { action: { kind: "rename", name } });
}

const FOOTBALL = ["jogo", "gol", "bola", "time", "campeonato", "tabela", "liga", "partida", "classico", "copa", "titulo", "vitoria", "placar"];

function fallback(t: TurnInput): Reply {
  const n = t.a.norm;
  // assunto de futebol sem intenção clara: comenta a situação real do time
  if (FOOTBALL.some((w) => n.includes(` ${w}`)) && (t.ctx.pos || t.ctx.next)) {
    const pos = t.ctx.pos ? `A gente tá em ${t.ctx.pos}º` : "";
    const nx = t.ctx.next ? `próximo é o ${t.ctx.next.opp}` : "";
    return R(t, "fut", {
      default: [`${pos}${pos && nx ? ", " : ""}${nx}. Tem que pontuar`, `Pois é. ${pos || "A temporada tá longa"}… bora focar no ${t.ctx.next?.opp ?? "próximo"}`],
      brincalhao: [`Futebol é isso aí {l} ${pos ? pos.toLowerCase() : ""}, bora subir`],
      competitivo: [`${pos ? pos + " é pouco. " : ""}Quero ganhar tudo que vier`],
      timido: ["é... bora ver o próximo jogo"],
    }, "neutro", { free: true });
  }
  if (t.a.question) {
    return R(t, "perg", {
      brincalhao: ["Boa pergunta {l} deixa eu pensar e te falo", "Aí tu me pegou {l}", "Pergunta pro professor, ele sabe tudo {l}"],
      competitivo: ["Sei lá. Só penso no próximo jogo", "Não parei pra pensar nisso, sinceramente"],
      timido: ["hmm... não sei direito", "boa pergunta..."],
      leal: ["Hmm, e tu, o que acha?", "Não sei, {a}. Tu pensa o quê?"],
      ambicioso: ["Depende. Por quê?", "Hmm. Por que tu quer saber? {l}"],
      arrogante: ["Óbvio que sim {l}", "Isso nem é pergunta {l}"],
      lider: ["Depende. Me conta melhor", "Boa. O que te fez pensar nisso?"],
      emocional: ["Ai, não sei, me pegou agora", "Nossa, nunca pensei nisso"],
    }, "duvida", { free: true });
  }
  const r = R(t, "fill", {
    brincalhao: ["{l} tu é figura", "Kkkk conta mais", "Rapaz {l}", "Ah, para {l}", "Tu não existe {l}"],
    competitivo: ["Hm. E aí?", "Saquei", "Beleza"],
    timido: ["hm", "ah, legal", "sério?"],
    leal: ["Pode crer, {a}", "Conta mais", "Tô contigo"],
    ambicioso: ["Saquei", "Interessante", "E aí, deu em quê?"],
    arrogante: ["Se tu tá dizendo {l}", "Tá bom, tá bom", "Hm, ok"],
    lider: ["Faz sentido", "Entendi. E como tu tá com isso?", "Certo"],
    emocional: ["Sério? Me conta", "Nossa", "Ai, conta tudo"],
  }, "neutro", { free: true });
  // às vezes puxa outro assunto
  if (t.rng.chance(0.15 + t.p.persona.extro * 0.2)) {
    const nx = t.ctx.next;
    const opts = [`Bora um ${t.p.persona.hobby} depois do treino?`, nx ? `Tu tá preparado pro ${nx.opp}?` : "", `Tô com uma vontade de ${t.p.persona.food}…`].filter(Boolean);
    r.lines.push(t.rng.pick(opts));
  }
  return r;
}

function humorMal(t: TurnInput): Reply {
  const l = t.ctx.last;
  // no grupo, só o primeiro pergunta o motivo; os outros só apoiam
  const hint = t.prev.length ? "" : l && l.res === "D" && l.daysAgo <= 3 ? "É por causa do jogo?" : t.ctx.benchStreak >= 2 ? "É o banco, né?" : "Aconteceu alguma coisa?";
  return R(t, "mal", {
    brincalhao: [`Ei, que isso {a}. ${hint} | Se precisar, chama pra um ${t.p.persona.food} que resolve`],
    competitivo: [`Levanta a cabeça. ${hint}`, "Sentir é normal, ficar parado não. Bora pra cima"],
    timido: ["poxa... quer conversar?", hint ? hint.toLowerCase() : "força aí..."],
    leal: [`Tô aqui, {a}. ${hint}`, `Fala comigo. ${hint} Tô contigo pro que precisar`],
    ambicioso: [`${hint} Foca no que dá pra controlar`],
    arrogante: ["Ih, que isso. Anima aí {l}", `Relaxa. ${hint}`],
    lider: [`${hint} Me conta que a gente resolve junto`, "Respira. Ninguém fica bem o tempo todo. O que pegou?"],
    emocional: [`Aaa não fica assim 😢${hint ? " | " + hint : ""}`, `Te entendo demais. ${hint}`],
  }, "carinho", { delta: { friendship: 1, trust: 1 }, memory: { kind: "pediu_conselho", text: "Você desabafou com ele num dia ruim." }, pending: "desabafo" });
}

function humorBom(t: TurnInput): Reply {
  return R(t, "bom", {
    default: ["Aí sim! Que bom, {a}", "Boa! Essa energia no jogo"],
    brincalhao: ["Feliz assim? Ganhou na loteria? {l}", "Tá radiante hein {l}"],
    timido: ["que bom :)"],
    emocional: ["AAAA que bom!! Fico feliz por ti"],
    competitivo: ["Boa. Leva isso pro campo"],
  }, "feliz", { delta: { friendship: 0.5 } });
}

function cansaco(t: TurnInput): Reply {
  const nx = t.ctx.next;
  return R(t, "cans", {
    default: [`Descansa, {a}.${nx && nx.daysTo <= 2 ? ` Tem ${nx.opp} logo` : ""}`, "Vai dormir que amanhã tem treino"],
    brincalhao: ["Cansado de quê? Tu nem correu {l}", "Dorme que tu tá precisando, tá com cara de zumbi {l}"],
    competitivo: ["Descansa direito. Recuperação também é treino"],
    lider: ["Dorme cedo, hidrata. O corpo agradece no jogo"],
    timido: ["descansa aí"],
    emocional: ["Eu também tô morto 😴"],
  }, "carinho");
}

const ACTIVITIES: Record<string, string> = {
  videogame: "jogando um videogame aqui", pagode: "ouvindo um pagodinho", pescaria: "arrumando as coisas pra pescar no fim de semana", "série": "maratonando uma série",
  truco: "num truco com a rapaziada", sinuca: "numa sinuca", academia: "saindo da academia", churrasco: "vendo a carne do churrasco", "música gospel": "ouvindo um louvor",
  trap: "ouvindo um trap", cozinhar: "cozinhando", carro: "lavando o carro", tatuagem: "pensando na próxima tatuagem", xadrez: "jogando xadrez no celular", surf: "vendo vídeo de surf",
  basquete: "vendo jogo de basquete", funk: "ouvindo um funk", sertanejo: "ouvindo um sertanejo", leitura: "lendo um livro", moda: "vendo roupa na internet",
};

function atividade(t: TurnInput): Reply {
  const p = t.p;
  const act = p.injury ? "na fisio ainda" : ACTIVITIES[p.persona.hobby] ?? "de boa em casa";
  return R(t, "ativ", {
    default: [`Tô ${act}. E tu?`, `Nada demais, ${act}`],
    brincalhao: [`Tô ${act} {l} e tu, fazendo nada como sempre?`],
    timido: [`${act}... e vc?`],
    competitivo: [`${p.injury ? "Fisio" : "Vendo vídeo do próximo adversário"}. E tu?`],
    lider: [`Tô ${act}. Tudo certo por aí?`],
  }, "neutro", { delta: { friendship: 0.5 } });
}

function tedio(t: TurnInput): Reply {
  const h = t.p.persona.hobby;
  return R(t, "tedio", {
    default: [`Bora ${h === "videogame" ? "jogar uma partida online" : `um ${h}`}?`, "Vem pra cá que a gente inventa alguma coisa"],
    brincalhao: [`Entediado? Vem pro ${h} que tu esquece {l}`],
    timido: [`quer jogar alguma coisa?`],
    competitivo: ["Vai treinar finalização então {l}"],
    lider: ["Aproveita e descansa, semana vai ser puxada"],
  }, "feliz", { delta: { friendship: 1 } });
}

function comida(t: TurnInput): Reply {
  const f = t.p.persona.food;
  return R(t, "comida", {
    default: [`Agora tu me deu vontade de ${f}`, `Só penso em ${f}, sério`],
    brincalhao: [`Bora num ${f}? Tu paga {l}`],
    competitivo: ["Cuidado com a dieta, hein. O nutricionista tá de olho"],
    timido: [`também tô com fome...`],
    lider: [`Come direito, mas lembra da dieta da semana de jogo`],
  }, "feliz");
}

function autocritica(t: TurnInput): Reply {
  const l = t.ctx.last;
  const real = l?.myRating !== undefined ? (l.myRating < 6.3 ? "Foi abaixo mesmo, mas acontece" : `Tu teve nota ${l.myRating.toFixed(1).replace(".", ",")}, nem foi tão ruim`) : "";
  return R(t, "autocrit", {
    default: [`${real || "Acontece"}. Próximo jogo tu compensa`],
    leal: [`Ei, ninguém ganha nem perde sozinho. ${real}`],
    lider: [`${real || "Todo mundo tem dia ruim"}. Assiste o vídeo, corrige e segue`],
    competitivo: [`${real}. Então treina mais e mostra no próximo`],
    brincalhao: [`${real || "Foi feio mesmo"} {l} brincadeira, próximo tu arrebenta`],
    emocional: ["Não fica assim, tu é muito bom 😔"],
    arrogante: ["Foi mal mesmo {l} mas relaxa, eu seguro o time"],
  }, "carinho", { delta: { trust: 1 } });
}

function gabar(t: TurnInput): Reply {
  return R(t, "gabar", {
    brincalhao: ["Melhor do time? No FIFA talvez {l}", "Senta lá, Cláudia {l}"],
    competitivo: ["Prova no treino amanhã então", "Melhor? Vamo ver no rachão"],
    arrogante: ["Kkkk o melhor sou eu, tu é no máximo o segundo", "Sonhar é de graça {l}"],
    timido: ["kkk se tu diz..."],
    leal: ["Pra mim tu é um dos melhores mesmo {l}"],
    ambicioso: ["Então mostra pros olheiros, não pra mim {l}"],
    lider: ["Humildade, {a}. Mas confiança é bom"],
    emocional: ["Kkkk amo essa confiança"],
  }, "feliz", { delta: { rivalry: t.p.persona.type === "arrogante" || t.p.persona.type === "competitivo" ? 1 : 0 } });
}

function melhorTime(t: TurnInput): Reply {
  const club = t.g.user.clubId ? t.g.clubs[t.g.user.clubId] : undefined;
  if (!club) return fallback(t);
  const squad = club.squad.map((id) => t.g.players[id]).filter(Boolean);
  const best = [...squad].sort((a, b) => b.ovr - a.ovr)[0];
  const scorer = [...squad].sort((a, b) => b.stats.goals - a.stats.goals)[0];
  const me = t.p;
  const isMe = best?.id === me.id;
  const bestName = best?.isUser ? "tu" : best?.first;
  const sc = !scorer || scorer.stats.goals === 0 ? "" : scorer.id === best?.id ? ` E ainda é o artilheiro, ${scorer.stats.goals} gols` : ` Mas quem mais fez gol foi ${scorer.isUser ? "tu" : scorer.id === me.id ? "eu" : scorer.first} (${scorer.stats.goals})`;
  if (me.persona.type === "arrogante" && !isMe) return R(t, "melhor_arr", { default: [`Eu, óbvio {l}.${sc}`] }, "feliz");
  return R(t, "melhor", { default: [isMe ? `Modéstia à parte… eu {l}.${sc}` : `Hoje? ${bestName}, não tem jeito.${sc}`] }, "neutro");
}

function titular(t: TurnInput): Reply {
  const club = t.g.user.clubId ? t.g.clubs[t.g.user.clubId] : undefined;
  if (!club || t.ctx.coachMode) return fallback(t);
  const xi = autoLineup(t.g, club.squad, club.tactic.formation).xi;
  const meIn = xi.includes(t.ctx.meId);
  const heIn = xi.includes(t.p.id);
  return R(t, "titular", {
    default: [
      `${meIn ? "Tu deve começar, pelo que o professor tá mostrando no treino" : "Acho que tu começa no banco, mas entra"}. ${heIn ? "E eu acho que tô no time" : "Eu acho que fico de fora"}`,
    ],
    competitivo: [`${heIn ? "Eu tô no time." : "Ainda não tô no time, mas vou brigar."} ${meIn ? "Tu também" : "Tu tá no banco por enquanto"}`],
  }, "neutro");
}

function juiz(t: TurnInput): Reply {
  return R(t, "juiz", {
    default: ["Juiz ruim demais, sério", "Esse juiz não pode apitar mais nada"],
    brincalhao: ["O juiz tava de óculos escuros {l}", "Juiz comprado {l} brincadeira… ou não"],
    lider: ["Não adianta reclamar de juiz. A gente tem que fazer mais"],
    timido: ["foi estranho mesmo"],
    competitivo: ["Roubaram, mas a gente também não fez nossa parte"],
    emocional: ["Fiquei revoltado 😤"],
  }, "raiva");
}

function torcida(t: TurnInput): Reply {
  const pos = t.ctx.pos;
  return R(t, "torcida", {
    default: [`Torcida cobra porque ama. ${pos && pos > 8 ? "E com a gente lá embaixo, é normal" : "Mas tão com a gente"}`],
    lider: ["Responde em campo. Não adianta rede social"],
    emocional: ["Me afeta muito quando vaiam 😞"],
    arrogante: ["Daqui a pouco tão gritando meu nome de novo {l}"],
    brincalhao: ["Fica tranquilo, ganhou o próximo e tu vira ídolo {l}"],
  }, "neutro");
}

function clima(t: TurnInput): Reply {
  return R(t, "clima", {
    default: ["Aqui também tá assim", "Tempo doido né"],
    brincalhao: ["Bom pra ficar debaixo da coberta {l}"],
    competitivo: ["Gramado pesado é bom pra quem corre mais"],
    timido: ["aqui tbm"],
  }, "neutro");
}

function emprestimo(t: TurnInput): Reply {
  const f = friendship(t);
  return R(t, f >= 60 ? "emp_sim" : "emp_nao", f >= 60 ? {
    default: ["Quanto tu precisa? Se for pouco eu mando", "Tá precisando mesmo? Me fala que eu ajudo"],
    brincalhao: ["Empresto, mas com juros de 300% {l} brincadeira, quanto?"],
  } : {
    default: ["Ih, tô apertado também {l}", "Ganha o que, tu? {l} Tá liso?"],
    arrogante: ["Kkkk com o salário que tu ganha?"],
    ambicioso: ["Dinheiro e amizade não se mistura, {a}"],
    timido: ["hm... agora não dá..."],
  }, "neutro");
}

function compra(t: TurnInput): Reply {
  return R(t, "compra", {
    default: ["Aí sim! Me leva pra dar uma volta", "Que isso, tá rico hein"],
    brincalhao: ["Ostentação {l} me empresta?"],
    ambicioso: ["Boa. Investe também, não gasta tudo"],
    lider: ["Parabéns. Só não esquece de guardar um pouco"],
    arrogante: ["O meu é melhor {l}"],
    timido: ["que legal"],
  }, "feliz");
}

function treino(t: TurnInput): Reply {
  const int = t.g.user.training.intensity;
  return R(t, "treino", {
    default: [int === 2 ? "Tu tá treinando pesado, hein. Cuidado com lesão" : "Treino hoje foi puxado mesmo", "O professor tá cobrando muito no treino"],
    competitivo: ["Treino é onde se ganha vaga. Bora com tudo"],
    brincalhao: ["Treino? Eu fui só pelo café da manhã {l}"],
    lider: ["Treino bom é jogo fácil. Bora manter"],
    timido: ["foi pesado..."],
    emocional: ["Tô todo dolorido 😩"],
  }, "neutro");
}

function idolo(t: TurnInput): Reply {
  const p = t.p.persona;
  const IDOLS = ["meu pai, que jogava na várzea", "um meia antigo da minha cidade", "o capitão do time que eu torcia quando era moleque", "meu primeiro treinador da base"];
  const idol = IDOLS[p.birthday % IDOLS.length];
  return R(t, "idolo", {
    default: [`Meu ídolo é ${idol}. E o teu?`, `Cresci vendo ${idol}. Foi por isso que comecei`],
    timido: [`${idol}... e o seu?`],
    arrogante: [`Meu ídolo? Eu mesmo {l} brincadeira, ${idol}`],
  }, "neutro", { delta: { trust: 1 } });
}

function amor(t: TurnInput): Reply {
  return R(t, "amor", {
    brincalhao: ["Kkkk essa parte eu não conto {l}", "Tô focado no futebol… e no zap {l}"],
    timido: ["kkk não gosto de falar disso", "ah... tô tentando"],
    leal: ["Tô com a mesma pessoa faz tempo, graças a Deus", "Família em primeiro lugar, {a}"],
    arrogante: ["Fila grande {l}"],
    emocional: ["Ai, nem me fala, tô apaixonado 😍", "Tô sofrendo por amor, sério {l}"],
    competitivo: ["Agora o foco é título {l}"],
    ambicioso: ["Primeiro a carreira, depois o resto"],
    lider: ["Tô casado, tranquilo. E tu?"],
  }, "feliz", { delta: { friendship: 1 } });
}

export function respond(t: TurnInput): Reply {
  // respostas a perguntas pendentes
  if (t.pending === "offer_amount" && t.a.money) return valor(t);
  if (t.pending === "why_leave") {
    if (t.a.intents.some((i) => i.name === "proposta" || i.name === "valor")) return t.a.money ? valor(t) : proposta(t);
    if (t.a.intents.some((i) => i.name === "banco" || i.name === "tecnico")) {
      const r = banco(t);
      r.lines.unshift("Por causa do banco? Faz sentido…");
      r.clearPending = true;
      return r;
    }
  }
  const top = t.a.top as Intent;
  if (t.pending === "desabafo" && ["desconhecido", "pergunta", "sim", "nao", "zoeira", "humor_mal", "pessoal", "amor", "cansaco"].includes(top)) {
    return R(t, "desabafo", {
      default: ["Entendi, {a}. Conta comigo pro que precisar", "Pô, faz sentido tu estar assim. Vai passar, tô aqui"],
      brincalhao: ["Pô, sério… vem cá que a gente resolve com um {food} e resenha", "Entendi. Qualquer coisa me chama, tô sempre on {l}"],
      timido: ["entendi... se quiser conversar, tô aqui"],
      lider: ["Entendi. Uma coisa de cada vez. Amanhã a gente conversa melhor no CT", "Obrigado por me contar. Tu não tá sozinho nisso"],
      competitivo: ["Tá. Usa isso como combustível no próximo treino"],
      emocional: ["Te entendo demais 🫂 tô aqui", "Poxa… manda mensagem quando quiser, de verdade"],
      arrogante: ["Relaxa, vai dar certo. Tu é bom, só tá numa fase"],
      ambicioso: ["Entendi. Pensa no que dá pra mudar e foca nisso"],
    }, "carinho", { clearPending: true, delta: { trust: 2, friendship: 1 }, memory: { kind: "apoio", text: "Ele te ouviu num momento difícil." } });
  }
  if (top === "nome_grupo" || /chamar de|se chamar|apelido de/.test(t.raw.toLowerCase())) { const r = rename(t); if (r) return r; }
  if (top === "fica" || top === "vai") { const r = advice(t, top); if (r) return r; }
  switch (top) {
    case "saudacao": return t.a.intents.some((i) => i.name === "como_vai") ? comoVai(t) : saudacao(t);
    case "como_vai": return comoVai(t);
    case "sair_clube": return sairClube(t);
    case "proposta": return proposta(t);
    case "valor": return t.pending === "offer_amount" || t.a.intents.some((i) => i.name === "proposta") ? valor(t) : fallback(t);
    case "assinei": return assinei(t);
    case "ficar": return ficar(t);
    case "jogo_facil": return jogoFacil(t);
    case "jogo_dificil": return jogoDificil(t);
    case "proximo_jogo": return proximoJogo(t);
    case "ultimo_jogo": return ultimoJogo(t);
    case "humor_mal": return humorMal(t);
    case "humor_bom": return humorBom(t);
    case "cansaco": return cansaco(t);
    case "atividade": return atividade(t);
    case "tedio": return tedio(t);
    case "comida": return comida(t);
    case "autocritica": return autocritica(t);
    case "gabar": return gabar(t);
    case "melhor_time": return melhorTime(t);
    case "titular": return titular(t);
    case "juiz": return juiz(t);
    case "torcida": return torcida(t);
    case "clima": return clima(t);
    case "dinheiro_emprestado": return emprestimo(t);
    case "compra": return compra(t);
    case "treino": return treino(t);
    case "idolo": return idolo(t);
    case "amor": return amor(t);
    case "vitoria": return vitoria(t);
    case "derrota": return derrota(t);
    case "meu_gol": return meuGol(t);
    case "elogio": return elogio(t);
    case "aniversario": return aniversario(t);
    case "ofensa": return ofensa(t);
    case "zoeira": return zoeira(t);
    case "banco": return banco(t);
    case "tecnico": return tecnico(t);
    case "conselho": return conselho(t);
    case "desculpa": return desculpa(t);
    case "obrigado": return obrigado(t);
    case "convite": return convite(t);
    case "pessoal": return pessoal(t);
    case "sonho": return sonho(t);
    case "grupo": return grupo(t);
    case "tchau": return tchau(t);
    case "lesao": return lesao(t);
    case "titulo": return titulo(t);
    case "companheiro": return companheiro(t);
    case "sim": return simNao(t, true);
    case "nao": return simNao(t, false);
    case "fica": return t.pending === "why_leave" ? ficar(t) : fallback(t);
    default: return fallback(t);
  }
}

/** Relevância de uma mensagem para um personagem (decide quem responde no grupo). */
export function relevanceFor(t: Omit<TurnInput, "prev" | "used">, mentioned: boolean): number {
  let r = 0.35 + t.p.persona.extro * 0.45;
  if (mentioned) r += 0.6;
  const top = t.a.top;
  if (["sair_clube", "proposta", "assinei", "jogo_facil", "vitoria", "derrota"].includes(top)) r += 0.25;
  if (t.p.persona.type === "timido") r -= 0.2;
  return r;
}
