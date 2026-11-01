/** Decisões narrativas com consequências reais em moral, reputação, finanças e relações. */
import { bumpRel, ensureRel, getRel, USER_COACH_ID } from "../chemistry/relations";
import { addMemory } from "../chat/memory";
import { executeTransfer } from "../market/transfers";
import { addNews } from "../news/news";
import { clamp, Rng } from "../rng";
import { teamName } from "../season/schedule";
import type { Decision, GameState, Player } from "../types";
import { ageOf, formatMoney, fullName, roundMoney } from "../world/players";
import { retireUser, userPlayer } from "./player";

const mates = (g: GameState): Player[] => {
  const c = g.user.clubId ? g.clubs[g.user.clubId] : undefined;
  return c ? c.squad.map((id) => g.players[id]).filter((p) => p && !p.isUser) : [];
};

function push(g: GameState, d: Omit<Decision, "id" | "day" | "expires"> & { expires?: number }): Decision {
  const dec: Decision = { ...d, id: `d${g.ids++}`, day: g.day, expires: d.expires ?? g.day + 5 };
  g.decisions.push(dec);
  return dec;
}

/** Gera no máximo uma decisão por semana, conforme o contexto. */
export function maybeDecision(g: GameState, rng: Rng) {
  if (g.decisions.length >= 2 || !g.user.clubId || g.user.retired) return;
  if (!rng.chance(0.38)) return;
  const pool: (() => boolean)[] = [];
  if (g.user.mode === "player") {
    const me = userPlayer(g)!;
    const team = mates(g);
    if (me.reputation >= 30 || g.offers.some((o) => o.direction === "user" && o.status === "pendente")) pool.push(() => {
      push(g, { kind: "entrevista_rumor", title: "Entrevista: e o interesse de outros clubes?", body: "Um repórter pergunta, ao vivo, se você pensa em sair do clube.", options: [
        { id: "ficar", label: "\"Meu foco é aqui. Quero ficar.\"", hint: "torcida e companheiros vão lembrar" },
        { id: "aberto", label: "\"Nunca se sabe o futuro.\"", hint: "atrai propostas, irrita o técnico" },
        { id: "neutro", label: "\"Sem comentários.\"" },
      ] });
      return true;
    });
    const sad = team.filter((p) => p.morale < 45 && (getRel(g, me.id, p.id)?.friendship ?? 0) >= 30)[0];
    if (sad) pool.push(() => {
      push(g, { kind: "amigo_mal", title: `${sad.first} está para baixo`, body: `${fullName(sad)} anda calado no vestiário depois das críticas. Ele é seu ${(getRel(g, me.id, sad.id)?.friendship ?? 0) >= 60 ? "amigo próximo" : "companheiro"}.`, options: [
        { id: "conversar", label: "Chamar para conversar", hint: "confiança e moral dele sobem" },
        { id: "zoar", label: "Zoar pra descontrair" },
        { id: "deixar", label: "Deixar quieto" },
      ], data: { playerId: sad.id } });
      return true;
    });
    const hot = team.filter((p) => p.persona.type === "arrogante" || p.persona.type === "competitivo")[rng.int(0, 3)];
    if (hot) pool.push(() => {
      push(g, { kind: "briga_treino", title: "Discussão no treino", body: `${fullName(hot)} entrou duro em você no rachão e ainda provocou.`, options: [
        { id: "revidar", label: "Revidar na hora", hint: "rivalidade sobe" },
        { id: "relevar", label: "Relevar", hint: "o técnico gosta" },
        { id: "conversar", label: "Conversar depois do treino" },
      ], data: { playerId: hot.id } });
      return true;
    });
    const party = team.filter((p) => p.persona.type === "brincalhao" || p.persona.type === "emocional").slice(0, 3);
    if (party.length) pool.push(() => {
      push(g, { kind: "festa", title: `Resenha na casa do ${party[0].first}`, body: `A rapaziada combinou ${party[0].persona.food === "churrasco" ? "um churrasco" : "uma resenha"} na véspera do próximo jogo. ${party.map((p) => p.first).join(", ")} vão.`, options: [
        { id: "ir", label: "Ir à resenha", hint: "amizade sobe, cansaço também" },
        { id: "passar", label: "Ficar em casa descansando" },
      ], data: { ids: party.map((p) => p.id).join(",") } });
      return true;
    });
    if (me.reputation >= 40) pool.push(() => {
      const v = roundMoney(20_000 + me.reputation * 6_000);
      push(g, { kind: "patrocinio", title: "Proposta de patrocínio", body: `Uma marca esportiva fictícia oferece ${formatMoney(v)} por uma campanha. Exige dias de gravação.`, options: [
        { id: "aceitar", label: `Aceitar ${formatMoney(v)}`, hint: "fama sobe, cansaço também" },
        { id: "recusar", label: "Recusar e focar no futebol", hint: "técnico aprova" },
      ], data: { value: v } });
      return true;
    });
    pool.push(() => {
      push(g, { kind: "improviso", title: "O técnico pede um favor", body: `${teamName(g, g.user.clubId!)} está com desfalques e o técnico quer te improvisar em outra função no próximo jogo.`, options: [
        { id: "aceitar", label: "Topar a missão", hint: "relação com técnico sobe" },
        { id: "recusar", label: "Dizer que rende mais na sua posição" },
      ] });
      return true;
    });
  } else {
    const club = g.clubs[g.user.clubId];
    const squad = mates(g);
    const unhappy = squad.filter((p) => p.ovr >= 68 && p.stats.apps >= 2 && p.stats.starts <= p.stats.apps * 0.4)[0] ?? squad.filter((p) => p.morale < 45)[0];
    if (unhappy) pool.push(() => {
      push(g, { kind: "insatisfeito", title: `${fullName(unhappy)} quer conversar`, body: `Ele está insatisfeito com o tempo de jogo e pede explicações.`, options: [
        { id: "prometer", label: "Prometer mais minutos", hint: "moral sobe; ele vai cobrar" },
        { id: "merecer", label: "\"Precisa merecer no treino\"" },
        { id: "vender", label: "Colocar à venda" },
      ], data: { playerId: unhappy.id } });
      return true;
    });
    pool.push(() => {
      push(g, { kind: "coletiva", title: "Coletiva de imprensa", body: "Jornalistas querem saber sua avaliação do momento do time.", options: [
        { id: "proteger", label: "Proteger o elenco", hint: "moral do grupo sobe" },
        { id: "cobrar", label: "Cobrar publicamente", hint: "diretoria gosta, elenco não" },
        { id: "arbitragem", label: "Reclamar da arbitragem" },
      ] });
      return true;
    });
    if (club.balance > 5_000_000) pool.push(() => {
      const v = roundMoney(club.balance * 0.18);
      push(g, { kind: "verba", title: "Diretoria oferece verba extra", body: `${formatMoney(v)} a mais para contratações, mas a cobrança por resultados vai aumentar.`, options: [
        { id: "aceitar", label: "Aceitar a verba" },
        { id: "recusar", label: "Recusar, o elenco é suficiente" },
      ], data: { value: v } });
      return true;
    });
    const a = squad[rng.int(0, squad.length - 1)];
    const b = squad[rng.int(0, squad.length - 1)];
    if (a && b && a.id !== b.id) pool.push(() => {
      push(g, { kind: "conflito", title: "Briga no vestiário", body: `${fullName(a)} e ${fullName(b)} discutiram feio depois do treino.`, options: [
        { id: "punir", label: "Multar os dois", hint: "disciplina" },
        { id: "conversar", label: "Mediar uma conversa", hint: "pode reaproximar" },
        { id: "ignorar", label: "Ignorar" },
      ], data: { a: a.id, b: b.id } });
      return true;
    });
    const kid = squad.filter((p) => ageOf(p, g.day) <= 19 && p.potential >= 72 && p.stats.apps <= 2)[0];
    if (kid) pool.push(() => {
      push(g, { kind: "jovem", title: `${fullName(kid)} pede uma chance`, body: `O garoto de ${ageOf(kid, g.day)} anos vem se destacando na base e quer estrear.`, options: [
        { id: "promover", label: "Garantir que ele vai ter chances" },
        { id: "esperar", label: "Pedir paciência" },
      ], data: { playerId: kid.id } });
      return true;
    });
  }
  if (!pool.length) return;
  rng.pick(pool)();
}

/** Amigo recebeu proposta: pede conselho antes de decidir (integra química e mercado). */
export function friendAsksAdvice(g: GameState, friend: Player, buyerId: string, fee: number, wage: number) {
  if (g.decisions.some((d) => d.kind === "conselho_amigo" && d.data?.playerId === friend.id)) return;
  const dec = push(g, {
    kind: "conselho_amigo", title: `${friend.first} pede seu conselho`, expires: g.day + 4,
    body: `${fullName(friend)} recebeu proposta do ${teamName(g, buyerId)} (${formatMoney(fee)}). Ele quer saber o que você acha.`,
    options: [
      { id: "vai", label: "\"Vai, é tua chance\"" },
      { id: "fica", label: "\"Fica, a gente tá construindo algo\"" },
      { id: "decide", label: "\"A decisão é tua\"" },
    ],
    data: { playerId: friend.id, buyerId, fee, wage },
  });
  g.inbox.push({ t: "advice", playerId: friend.id, decisionId: dec.id });
}

export function resolveFriendAdvice(g: GameState, rng: Rng, d: Decision, opt: string) {
  const id = String(d.data!.playerId);
  const friend = g.players[id];
  const me = userPlayer(g);
  if (!friend || !me) return;
  const rel = ensureRel(g, me.id, id);
  const buyer = String(d.data!.buyerId);
  const fee = Number(d.data!.fee);
  const wage = Number(d.data!.wage);
  let stayP = 0.35;
  const t = friend.persona.type;
  if (opt === "fica") stayP = 0.25 + rel.friendship / 150 + (t === "leal" || t === "emocional" ? 0.2 : t === "ambicioso" ? -0.25 : 0);
  if (opt === "vai") stayP = 0.08;
  const stays = rng.chance(clamp(stayP, 0.03, 0.92));
  if (stays) {
    bumpRel(g, me.id, id, { friendship: opt === "fica" ? 5 : 2, trust: 4 });
    addMemory(g, id, "conselho", opt === "fica" ? `Você pediu pra ele ficar quando o ${teamName(g, buyer)} quis contratá-lo, e ele ficou.` : `Ele recusou o ${teamName(g, buyer)} depois de conversar com você.`);
    addNews(g, { title: `${fullName(friend)} recusa o ${teamName(g, buyer)} e fica`, body: "O jogador disse que o grupo pesou na decisão.", tag: "transferencia", importance: 2, playerIds: [id] });
  } else {
    if (opt === "fica") { bumpRel(g, me.id, id, { trust: -2 }); addMemory(g, id, "conselho", `Você pediu pra ele ficar, mas ele foi para o ${teamName(g, buyer)}.`); }
    else { bumpRel(g, me.id, id, { friendship: 3, trust: 3 }); addMemory(g, id, "conselho", `Você apoiou a ida dele para o ${teamName(g, buyer)}.`); }
    if (friend.clubId && g.clubs[buyer]) executeTransfer(g, id, buyer, fee, { wage, years: 3 });
  }
}

export function resolveDecision(g: GameState, rng: Rng, decisionId: string, optId: string): string {
  const d = g.decisions.find((x) => x.id === decisionId);
  if (!d) return "";
  g.decisions = g.decisions.filter((x) => x.id !== decisionId);
  const me = userPlayer(g);
  const club = g.user.clubId ? g.clubs[g.user.clubId] : undefined;
  const team = mates(g);
  const pid = d.data?.playerId ? String(d.data.playerId) : "";
  const other = pid ? g.players[pid] : undefined;
  const meId = g.user.mode === "player" ? me?.id ?? USER_COACH_ID : USER_COACH_ID;
  switch (d.kind) {
    case "entrevista_rumor":
      if (optId === "ficar") {
        g.user.promisedStay = g.day;
        g.user.wantsTransfer = false;
        g.user.coachRelation = clamp(g.user.coachRelation + 3, 0, 100);
        if (me) me.reputation = clamp(me.reputation + 1, 0, 100);
        for (const p of team) if ((getRel(g, meId, p.id)?.friendship ?? 0) >= 35) addMemory(g, p.id, "promessa_ficar", "Você disse publicamente que queria ficar no clube.");
        g.inbox.push({ t: "promise", playerId: meId });
        return "A torcida adorou. Seus companheiros vão lembrar dessa promessa.";
      }
      if (optId === "aberto") {
        g.user.wantsTransfer = true;
        g.user.coachRelation = clamp(g.user.coachRelation - 4, 0, 100);
        for (const p of team) if (p.persona.type === "leal") bumpRel(g, meId, p.id, { trust: -3 });
        return "Clubes ficaram atentos. O técnico não gostou muito.";
      }
      return "Resposta protocolar. Nada muda.";
    case "amigo_mal":
      if (!other) return "";
      if (optId === "conversar") {
        other.morale = clamp(other.morale + 12, 0, 100);
        bumpRel(g, meId, other.id, { trust: 6, friendship: 4 });
        addMemory(g, other.id, "apoio", "Você conversou com ele num momento difícil.");
        return `${other.first} agradeceu. A confiança entre vocês cresceu.`;
      }
      if (optId === "zoar") {
        const ok = other.persona.type === "brincalhao" || other.persona.humor > 0.6;
        bumpRel(g, meId, other.id, ok ? { friendship: 3 } : { friendship: -4, trust: -2 });
        other.morale = clamp(other.morale + (ok ? 6 : -4), 0, 100);
        addMemory(g, other.id, ok ? "zoeira" : "ofensa", ok ? "Você zoou ele pra descontrair e ele riu." : "Você fez piada quando ele estava mal.");
        return ok ? `${other.first} riu e relaxou.` : `${other.first} não achou graça.`;
      }
      return "Você preferiu não se meter.";
    case "briga_treino":
      if (!other) return "";
      if (optId === "revidar") {
        bumpRel(g, meId, other.id, { rivalry: 12, friendship: -6 }, 20);
        g.user.coachRelation = clamp(g.user.coachRelation - 4, 0, 100);
        addMemory(g, other.id, "conflito", "Vocês bateram boca no treino.");
        return `O clima com ${other.first} esquentou. O técnico separou os dois.`;
      }
      if (optId === "relevar") {
        g.user.coachRelation = clamp(g.user.coachRelation + 2, 0, 100);
        bumpRel(g, meId, other.id, { rivalry: 3 });
        return "O técnico elogiou sua postura.";
      }
      if (rng.chance(0.6)) {
        bumpRel(g, meId, other.id, { rivalry: -6, trust: 3 });
        addMemory(g, other.id, "reconciliacao", "Vocês conversaram depois da briga no treino e ficou tudo bem.");
        return `Vocês se entenderam. ${other.first} pediu desculpas.`;
      }
      bumpRel(g, meId, other.id, { rivalry: 4 });
      return `${other.first} não quis papo.`;
    case "festa":
      if (optId === "ir") {
        const ids = String(d.data?.ids ?? "").split(",").filter(Boolean);
        for (const id of ids) { bumpRel(g, meId, id, { friendship: 4 }); addMemory(g, id, "convite", "Você foi na resenha com a rapaziada."); }
        if (me) me.fitness = clamp(me.fitness - 10, 0, 100);
        if (rng.chance(0.35)) { g.user.coachRelation = clamp(g.user.coachRelation - 4, 0, 100); return "A resenha foi boa, mas o técnico ficou sabendo e não gostou."; }
        return "Noite boa. O grupo ficou mais unido.";
      }
      g.user.coachRelation = clamp(g.user.coachRelation + 1, 0, 100);
      return "Você descansou para o jogo.";
    case "patrocinio":
      if (optId === "aceitar") {
        g.user.money += Number(d.data?.value ?? 0);
        if (me) { me.reputation = clamp(me.reputation + 2, 0, 100); me.fitness = clamp(me.fitness - 4, 0, 100); }
        return "Contrato assinado. Sua imagem ganhou força.";
      }
      g.user.coachRelation = clamp(g.user.coachRelation + 2, 0, 100);
      return "Foco total no campo.";
    case "improviso":
      g.user.coachRelation = clamp(g.user.coachRelation + (optId === "aceitar" ? 5 : -4), 0, 100);
      return optId === "aceitar" ? "O técnico agradeceu a disponibilidade." : "O técnico entendeu, mas ficou com o pé atrás.";
    case "renovacao": {
      if (!me) return "";
      const wage = Number(d.data?.wage ?? me.contract.wage);
      const years = Number(d.data?.years ?? 2);
      if (optId === "aceitar" || (optId === "pedir_mais" && rng.chance(0.55))) {
        me.contract = { wage: optId === "pedir_mais" ? roundMoney(wage * 1.2, 100) : wage, until: g.season + years };
        g.user.wantsTransfer = false;
        addNews(g, { title: `Você renova com o ${club?.name}`, body: `Novo contrato até ${2027 + me.contract.until}, ${formatMoney(me.contract.wage)}/sem.`, tag: "carreira", importance: 3, playerIds: [me.id] });
        return optId === "pedir_mais" ? "O clube aceitou seu pedido!" : "Contrato renovado.";
      }
      if (optId === "pedir_mais") { g.user.coachRelation = clamp(g.user.coachRelation - 3, 0, 100); return "O clube recusou o aumento. Você sairá livre no fim da temporada, se ninguém mudar de ideia."; }
      g.user.wantsTransfer = true;
      return "Você vai sair de graça no fim da temporada. Propostas devem aparecer.";
    }
    case "aposentadoria":
      if (optId === "aposentar") { retireUser(g); return "Fim de carreira. Obrigado por tudo."; }
      return "Mais uma temporada!";
    case "conselho_amigo":
      resolveFriendAdvice(g, rng, d, optId);
      return "";
    case "insatisfeito":
      if (!other) return "";
      if (optId === "prometer") { other.morale = clamp(other.morale + 12, 0, 100); bumpRel(g, meId, other.id, { trust: 5 }); addMemory(g, other.id, "promessa_ficar", "O treinador prometeu mais minutos."); return `${other.first} saiu animado. Ele vai cobrar.`; }
      if (optId === "merecer") { other.morale = clamp(other.morale - 6, 0, 100); bumpRel(g, meId, other.id, { trust: -3 }); return `${other.first} não gostou, mas aceitou.`; }
      other.listed = true; other.morale = clamp(other.morale - 15, 0, 100); bumpRel(g, meId, other.id, { trust: -10, friendship: -6 }, 16);
      return `${other.first} foi colocado à venda.`;
    case "coletiva":
      if (optId === "proteger") { for (const p of team) p.morale = clamp(p.morale + 3, 0, 100); g.user.boardConfidence = clamp(g.user.boardConfidence - 1, 0, 100); return "O elenco gostou do apoio."; }
      if (optId === "cobrar") { for (const p of team) p.morale = clamp(p.morale - 4, 0, 100); g.user.boardConfidence = clamp(g.user.boardConfidence + 3, 0, 100); return "A diretoria aprovou; o vestiário, nem tanto."; }
      g.user.reputation = clamp(g.user.reputation - 1, 0, 100); for (const p of team) p.morale = clamp(p.morale + 1, 0, 100);
      return "Rendeu manchete, mas pegou mal.";
    case "verba":
      if (optId === "aceitar" && club) { club.transferBudget += Number(d.data?.value ?? 0); g.user.boardConfidence = clamp(g.user.boardConfidence - 6, 0, 100); return "Orçamento ampliado. A cobrança aumentou."; }
      g.user.boardConfidence = clamp(g.user.boardConfidence + 2, 0, 100);
      return "A diretoria gostou da responsabilidade.";
    case "conflito": {
      const a = g.players[String(d.data?.a)], b = g.players[String(d.data?.b)];
      if (!a || !b || !club) return "";
      if (optId === "punir") { a.morale = clamp(a.morale - 8, 0, 100); b.morale = clamp(b.morale - 8, 0, 100); club.cohesion = clamp(club.cohesion + 2, 0, 95); return "Disciplina restabelecida."; }
      if (optId === "conversar") { bumpRel(g, a.id, b.id, { rivalry: -8, friendship: 4 }); club.cohesion = clamp(club.cohesion + 1, 0, 95); return "Os dois apertaram as mãos."; }
      bumpRel(g, a.id, b.id, { rivalry: 10 }); club.cohesion = clamp(club.cohesion - 5, 0, 95);
      return "O clima no vestiário piorou.";
    }
    case "jovem":
      if (!other) return "";
      if (optId === "promover") { other.morale = clamp(other.morale + 15, 0, 100); bumpRel(g, meId, other.id, { trust: 6 }); return `${other.first} está radiante. Escale-o para cumprir a palavra.`; }
      other.morale = clamp(other.morale - 8, 0, 100);
      return `${other.first} vai esperar sua vez.`;
  }
  return "";
}

/** Decisões vencidas escolhem a última opção (neutra). */
export function expireDecisions(g: GameState, rng: Rng) {
  for (const d of [...g.decisions]) if (g.day > d.expires) resolveDecision(g, rng, d.id, d.options[d.options.length - 1].id);
}
