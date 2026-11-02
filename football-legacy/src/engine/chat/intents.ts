/**
 * Compreensão de mensagens livres (modo local): normaliza gírias, abreviações e
 * erros de digitação, e classifica intenções com pesos. Também extrai entidades
 * do universo (clubes, companheiros, valores).
 */
import type { GameState } from "../types";

const SLANG: Record<string, string> = {
  vc: "voce", vcs: "voces", voce: "voce", tu: "voce", ce: "voce", oce: "voce",
  q: "que", oq: "o que", pq: "porque", pqp: "nossa", tb: "tambem", tbm: "tambem", mt: "muito", mto: "muito", mtu: "muito",
  n: "nao", ñ: "nao", nn: "nao", naum: "nao", num: "nao", s: "sim", ss: "sim", sim: "sim",
  to: "estou", tô: "estou", ta: "esta", tá: "esta", tao: "estao", tava: "estava", tamo: "estamos", tamos: "estamos",
  blz: "beleza", bls: "beleza", vlw: "valeu", vlww: "valeu", obg: "obrigado", brigado: "obrigado", tmj: "tamo junto",
  sla: "sei la", slk: "nossa", mlk: "moleque", mano: "mano", mn: "mano", irmao: "irmao", parca: "parceiro", vei: "mano", veio: "mano",
  hj: "hoje", amn: "amanha", amanha: "amanha", dps: "depois", agr: "agora", agora: "agora", cmg: "comigo", ctg: "contigo",
  fds: "fim de semana", msg: "mensagem", kd: "cade", qnd: "quando", qdo: "quando", qnt: "quanto", qto: "quanto", qm: "quem",
  tipo: "tipo", cara: "cara", eae: "eai", iae: "eai", eai: "eai", salve: "salve", coe: "eai", fala: "fala", opa: "opa",
  flw: "falou", fui: "falou", tchau: "tchau", xau: "tchau", bjs: "tchau",
  mi: "milhoes", mil: "mil", kk: "kkk", kkk: "kkk", rs: "kkk", rsrs: "kkk", haha: "kkk", hahaha: "kkk", ksks: "kkk",
  td: "tudo", tds: "todos", vamo: "vamos", bora: "bora", partiu: "bora", simbora: "bora",
  joguei: "joguei", golaço: "golaco", golaco: "golaco", treta: "briga", resenha: "festa", churras: "churrasco",
  tecnico: "tecnico", professor: "tecnico", prof: "tecnico", mister: "tecnico", treinador: "tecnico",
  time: "time", clube: "clube", equipe: "time",
};

export function normalize(text: string): string {
  let t = text.toLowerCase();
  t = t.normalize("NFD").replace(/[̀-ͯ]/g, "");
  t = t.replace(/k{3,}/g, " kkk ").replace(/(ha){2,}h?/g, " kkk ").replace(/(rs){2,}/g, " kkk ");
  t = t.replace(/([aeiou])\1+/g, "$1").replace(/([b-df-hjl-np-tv-z])\1{2,}/g, "$1"); // "maanoooo" -> "mano"
  t = t.replace(/[^a-z0-9?!\s€$.,]/g, " ");
  const words = t.split(/\s+/).filter(Boolean).map((w) => {
    const clean = w.replace(/[?!.,]+$/, "");
    const tail = w.slice(clean.length);
    return (SLANG[clean] ?? clean) + tail;
  });
  return " " + words.join(" ") + " ";
}

/** Distância de edição limitada para tolerar erros de digitação. */
export function lev(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 9;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

function hasWord(t: string, words: string[]): boolean {
  const toks = t.trim().split(/\s+/).map((w) => w.replace(/[?!.,]+$/, ""));
  for (const w of words) {
    if (w.includes(" ")) { if (t.includes(` ${w} `) || t.includes(` ${w}`)) return true; continue; }
    const ww = w.replace(/[?!.,]+$/, "");
    for (const tok of toks) {
      if (tok === ww) return true;
      if (ww.length >= 6 && tok.length >= 5 && lev(tok, ww) <= 1) return true;
    }
  }
  return false;
}

export type Intent =
  | "saudacao" | "como_vai" | "sair_clube" | "proposta" | "assinei" | "ficar" | "jogo_facil" | "jogo_dificil" | "proximo_jogo"
  | "vitoria" | "derrota" | "meu_gol" | "elogio" | "aniversario" | "ofensa" | "zoeira" | "banco" | "tecnico" | "conselho"
  | "desculpa" | "obrigado" | "convite" | "pessoal" | "sonho" | "grupo" | "tchau" | "valor" | "sim" | "nao" | "vai" | "fica"
  | "lesao" | "rival" | "companheiro" | "pergunta" | "desconhecido" | "nome_grupo" | "titulo" | "provocar_rival" | "ultimo_jogo"
  | "humor_mal" | "humor_bom" | "atividade" | "tedio" | "comida" | "autocritica" | "gabar" | "melhor_time" | "titular"
  | "juiz" | "torcida" | "clima" | "dinheiro_emprestado" | "compra" | "treino" | "idolo" | "amor" | "cansaco";

export interface Analysis {
  norm: string;
  intents: { name: Intent; score: number }[];
  top: Intent;
  clubIds: string[];
  clubText?: string;
  mates: string[];
  money?: number;
  question: boolean;
  laugh: boolean;
  sentiment: number;
  quoted?: string;
}

const RULES: [Intent, number, (t: string) => boolean][] = [
  ["saudacao", 1, (t) => hasWord(t, ["oi", "ola", "eai", "e ai", "salve", "fala", "opa", "bom dia", "boa tarde", "hey", "alo", "iai", "coe", "rapaziada", "tropa"])],
  ["como_vai", 1.4, (t) => hasWord(t, ["tudo bem", "tudo bom", "tudo certo", "como esta", "como vai", "como voce esta", "voce esta bem", "esta bem", "como estao", "como anda", "como tem passado"]) || /^\s*(beleza|suave|firmeza|de boa|tranquilo|tudo)\s*\??\s*$/.test(t.replace(/\s+(mano|irmao|parceiro)\b/g, "")) && t.includes("?")],
  ["humor_mal", 2.0, (t) => hasWord(t, ["triste", "mal", "pra baixo", "desanimado", "chateado", "depressivo", "sozinho", "estressado", "ansioso", "saudade", "com raiva", "puto", "nervoso", "chorando", "dia ruim", "dia horrivel", "briguei", "brigamos", "discuti", "terminei", "terminou comigo", "levei um fora", "problema em casa", "perdi"])],
  ["humor_bom", 1.8, (t) => hasWord(t, ["feliz", "animado", "felizao", "alegre", "dia bom", "to bem demais", "radiante", "empolgado"])],
  ["cansaco", 2, (t) => hasWord(t, ["cansado", "exausto", "morto", "quebrado", "acabado", "sem energia", "com sono", "sono", "vou dormir", "dormir"])],
  ["atividade", 2.2, (t) => hasWord(t, ["o que voce esta fazendo", "que voce esta fazendo", "fazendo o que", "o que ta fazendo", "o que voce faz agora", "ta fazendo o que", "esta fazendo o que", "que faz ai", "o que esta fazendo", "fazendo oq"]) || /\bo que .*fazendo\b/.test(t)],
  ["tedio", 2, (t) => hasWord(t, ["entediado", "tedio", "sem nada pra fazer", "nada pra fazer", "que tedio", "morgado"])],
  ["comida", 1.8, (t) => hasWord(t, ["fome", "comer", "almoco", "janta", "jantar", "cafe da manha", "lanche", "comida", "pizza", "hamburguer", "churrasco", "acai"])],
  ["autocritica", 2.4, (t) => hasWord(t, ["joguei mal", "fui mal", "errei", "joguei muito mal", "perdi o gol", "fui horrivel", "nao joguei nada", "culpa minha", "minha culpa", "falhei"])],
  ["gabar", 2.6, (t) => hasWord(t, ["eu sou o melhor", "sou o melhor", "sou craque", "eu sou craque", "sou o cara", "eu jogo muito", "sou o rei", "melhor do mundo"])],
  ["melhor_time", 2.3, (t) => hasWord(t, ["melhor do time", "melhor jogador do time", "melhor do elenco", "quem e o melhor", "quem joga mais", "craque do time"])],
  ["titular", 2.3, (t) => hasWord(t, ["vai ser titular", "quem vai jogar", "time titular", "vai jogar domingo", "escalacao", "quem joga", "vai comecar jogando", "vou ser titular"])],
  ["juiz", 2.3, (t) => hasWord(t, ["juiz", "arbitro", "arbitragem", "roubou", "roubado", "var", "impedimento", "penalti mal marcado"])],
  ["torcida", 2.1, (t) => hasWord(t, ["torcida", "torcedor", "torcedores", "vaias", "vaiaram", "protesto", "cobrando a gente", "pegando no pe"])],
  ["clima", 1.6, (t) => hasWord(t, ["chovendo", "chuva", "frio", "calor", "tempo hoje", "temperatura", "nevando"])],
  ["dinheiro_emprestado", 2.4, (t) => hasWord(t, ["me empresta", "empresta uma grana", "emprestar dinheiro", "to sem grana", "to duro", "me ajuda com grana", "pix"])],
  ["compra", 2, (t) => hasWord(t, ["comprei", "vou comprar", "carro novo", "casa nova", "relogio novo", "tenis novo", "mansao"])],
  ["treino", 1.9, (t) => hasWord(t, ["treino", "treinar", "treinamento", "academia", "preparacao fisica", "rachao", "coletivo"])],
  ["idolo", 2.2, (t) => hasWord(t, ["idolo", "time do coracao", "torcia pra", "torce pra", "inspiracao", "jogador favorito", "posicao favorita", "irmao", "irma", "tem filho"])],
  ["amor", 2, (t) => hasWord(t, ["namorando", "namorada", "namorado", "as mina", "as minas", "crush", "ficante", "casado", "casar", "solteiro", "date", "gata"])],
  ["sair_clube", 3, (t) => hasWord(t, ["sair do clube", "sair do time", "sair daqui", "ir embora", "deixar o clube", "vou sair", "quero sair", "pensando em sair", "mudar de time", "mudar de clube", "vou embora", "saindo do", "trocar de time", "sair da equipe"])],
  ["proposta", 2.6, (t) => hasWord(t, ["proposta", "oferta", "querem me contratar", "me querem", "sondagem", "interesse", "me sondou", "fizeram uma proposta"])],
  ["assinei", 3.2, (t) => hasWord(t, ["assinei", "ja assinei", "fechei com", "acertei com", "vou jogar no", "vou jogar na", "sou do", "assinar com"])],
  ["ficar", 2.6, (t) => hasWord(t, ["vou ficar", "fico aqui", "nao vou sair", "permanecer", "renovei", "vou renovar", "ficar aqui", "decidi ficar", "nao saio"])],
  ["jogo_facil", 2.4, (t) => hasWord(t, ["facil", "moleza", "passeio", "atropelar", "amassar", "golear", "baile", "vamos ganhar facil", "ganhar facil", "vai ser tranquilo", "barbada", "sem dificuldade"])],
  ["jogo_dificil", 2, (t) => hasWord(t, ["dificil", "pedreira", "complicado", "medo", "nervoso", "ansioso", "preocupado", "tenso", "pressao"])],
  ["proximo_jogo", 2, (t) => hasWord(t, ["proximo jogo", "quem a gente pega", "contra quem", "quando joga", "jogo de amanha", "jogo de hoje", "o jogo", "a partida", "proxima partida"])],
  ["ultimo_jogo", 2.3, (t) => hasWord(t, ["ultimo jogo", "jogo de ontem", "como foi o jogo", "viu o jogo", "e o jogo", "resultado", "placar", "jogo passado"])],
  ["vitoria", 2.2, (t) => hasWord(t, ["ganhamos", "vencemos", "que vitoria", "amassamos", "ganhamo", "vitoria", "goleamos", "passamos", "classificamos", "tres pontos"])],
  ["derrota", 2.2, (t) => hasWord(t, ["perdemos", "derrota", "que vergonha", "jogamos mal", "fomos mal", "perdemo", "tomamos", "levamos", "eliminados", "vexame"])],
  ["meu_gol", 2.3, (t) => hasWord(t, ["meu gol", "fiz gol", "marquei", "viu meu gol", "hat trick", "fiz dois", "fiz tres", "meus gols", "que golaco eu", "fiz um golaco"])],
  ["elogio", 2, (t) => hasWord(t, ["jogou muito", "joga muito", "jogando muito", "ta voando", "esta voando", "joga demais", "e bom de bola", "voce e foda", "jogou pra caramba", "jogou bem", "craque", "monstro", "brabo", "mandou bem", "que jogada", "voce e bom", "fera", "jogou demais", "foi o melhor", "golaco"])],
  ["aniversario", 3.5, (t) => hasWord(t, ["aniversario", "niver", "feliz aniversario", "parabens pelo", "felicidades", "muitos anos"])],
  ["ofensa", 3, (t) => hasWord(t, ["lixo", "perna de pau", "bagre", "horrivel", "idiota", "burro", "fraco", "inutil", "ridiculo", "otario", "babaca", "pereba", "vagabundo", "ruim", "mediocre", "fraquinho"])],
  ["zoeira", 1, (t) => /\bkkk\b/.test(t) || hasWord(t, ["zoando", "zoeira", "brincadeira", "piada", "to de boa"])],
  ["banco", 2.4, (t) => hasWord(t, ["banco", "reserva", "nao jogo", "nao estou jogando", "nao me escala", "sem jogar", "no banco", "ficar no banco", "titular"])],
  ["tecnico", 1.8, (t) => hasWord(t, ["tecnico"])],
  ["conselho", 2, (t) => hasWord(t, ["o que voce acha", "me ajuda", "conselho", "que eu faco", "o que eu faco", "devo", "voce faria", "que faco", "opiniao", "voce acha"])],
  ["desculpa", 2.5, (t) => hasWord(t, ["desculpa", "foi mal", "perdao", "mal ai", "me desculpa", "desculpe", "vacilei"])],
  ["obrigado", 1.6, (t) => hasWord(t, ["valeu", "obrigado", "tamo junto", "agradeco", "gratidao"])],
  ["convite", 2.2, (t) => hasWord(t, ["bora jogar", "bora pro", "bora pra", "vamos jogar", "videogame", "churrasco", "festa", "bora sair", "pescar", "bora treinar", "bora", "jantar", "cinema", "sinuca", "truco"])],
  ["pessoal", 1.5, (t) => hasWord(t, ["familia", "mae", "pai", "namorada", "esposa", "filho", "filha", "cidade", "hobby", "gosta de", "o que voce faz", "comida", "folga", "terra"])],
  ["sonho", 1.8, (t) => hasWord(t, ["sonho", "objetivo", "meta", "europa", "selecao", "futuro", "bola de ouro", "aposentar"])],
  ["grupo", 1.8, (t) => hasWord(t, ["trio", "dupla", "nosso trio", "nossa dupla", "a gente junto", "nos tres", "nos dois", "parceria", "entrosamento"])],
  ["nome_grupo", 3, (t) => hasWord(t, ["nome do trio", "nome da dupla", "chamar o trio", "chamar a dupla", "nome pro trio", "nome pra dupla", "apelido"])],
  ["tchau", 1.5, (t) => hasWord(t, ["falou", "tchau", "ate mais", "ate amanha", "vou dormir", "boa noite", "fui"])],
  ["sim", 0.8, (t) => /^\s*(sim|claro|isso|exato|com certeza|verdade|e mesmo|pode crer|uhum|aham|bora|fechou)\b/.test(t)],
  ["nao", 0.8, (t) => /^\s*(nao|nada|nunca|jamais|nem|negativo)\b/.test(t)],
  ["vai", 1.2, (t) => hasWord(t, ["vai la", "aceita", "pode ir", "vai sim", "e tua chance", "vai nessa", "manda ver", "fecha com eles"])],
  ["fica", 1.2, (t) => hasWord(t, ["fica", "fica aqui", "nao vai", "recusa", "nao aceita", "fica com a gente", "fica no time"])],
  ["lesao", 2, (t) => hasWord(t, ["lesao", "machucado", "machuquei", "dor", "contusao", "lesionado", "joelho", "tornozelo", "coxa", "departamento medico"])],
  ["titulo", 2.2, (t) => hasWord(t, ["titulo", "campeao", "campeoes", "taca", "trofeu", "final"])],
];

export function analyze(g: GameState, text: string, mateIds: string[]): Analysis {
  const norm = normalize(text);
  const scores = new Map<Intent, number>();
  for (const [name, w, test] of RULES) if (test(norm)) scores.set(name, (scores.get(name) ?? 0) + w);
  // entidades: clubes do universo (por nome, cidade ou sigla)
  const clubIds: string[] = [];
  let clubText: string | undefined;
  for (const c of Object.values(g.clubs)) {
    const city = normalize(c.city).trim();
    const short = c.short.toLowerCase();
    if (city.length >= 4 && norm.includes(` ${city}`)) { clubIds.push(c.id); continue; }
    if (norm.includes(` ${short} `) && short.length === 3 && !["que", "nao", "sim", "ele", "ela", "mas", "pra", "tem", "foi", "vai"].includes(short)) clubIds.push(c.id);
  }
  const m = norm.match(/ (?:do|da|no|na|pro|pra|com o|com a|pelo|pela) ([a-z]+(?: [a-z]+)?) /);
  if (m && !clubIds.length && (scores.has("proposta") || scores.has("assinei") || scores.has("sair_clube"))) clubText = m[1];
  // companheiros mencionados pelo nome
  const mates: string[] = [];
  for (const id of mateIds) {
    const p = g.players[id];
    if (!p) continue;
    const f = normalize(p.first).trim();
    const l = normalize(p.last).trim();
    if ((f.length >= 3 && norm.includes(` ${f} `)) || (l.length >= 4 && norm.includes(` ${l} `))) mates.push(id);
  }
  if (mates.length) scores.set("companheiro", 1.2);
  // dinheiro
  let money: number | undefined;
  const mm = norm.match(/(\d+(?:[.,]\d+)?)\s*(milhoes|milhao|mi\b|m\b|mil\b|k\b)?/);
  if (mm) {
    const v = parseFloat(mm[1].replace(",", "."));
    const unit = mm[2] ?? "";
    money = unit.startsWith("mil") && unit !== "milhoes" && unit !== "milhao" ? v * 1_000 : unit === "k" ? v * 1_000 : unit ? v * 1_000_000 : v >= 1000 ? v : v * 1_000_000;
    if (unit || scores.has("proposta") || /euro|€|\$|reais|salario|oferec/.test(norm)) scores.set("valor", (scores.get("valor") ?? 0) + 1.5);
    else money = undefined;
  }
  const question = text.includes("?") || /^\s*(como|quando|quem|qual|onde|por que|porque|cade|sera|voce acha)\b/.test(norm);
  const laugh = /\bkkk\b/.test(norm);
  const neg = ["triste", "mal", "pessimo", "odeio", "raiva", "chateado", "puto", "vergonha", "horrivel", "cansado", "frustrado"].filter((w) => norm.includes(` ${w}`)).length;
  const pos = ["feliz", "bom", "otimo", "demais", "top", "brabo", "massa", "show", "animado", "amo", "incrivel"].filter((w) => norm.includes(` ${w}`)).length;
  if (question && scores.size === 0) scores.set("pergunta", 0.6);
  const intents = [...scores.entries()].map(([name, score]) => ({ name, score })).sort((a, b) => b.score - a.score);
  return {
    norm, intents, top: intents[0]?.name ?? "desconhecido", clubIds, clubText, mates, money, question, laugh,
    sentiment: Math.max(-1, Math.min(1, (pos - neg) / 2)),
  };
}
