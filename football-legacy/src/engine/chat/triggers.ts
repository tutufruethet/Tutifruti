/** Mensagens espontâneas: os personagens reagem ao que acontece na carreira. */
import { bumpRel, getRel, USER_COACH_ID } from "../chemistry/relations";
import { nextUserFixture } from "../season/queries";
import { teamName } from "../season/schedule";
import type { Rng } from "../rng";
import type { GameState, PersonalityType, Player } from "../types";
import { dmId, ensureDm, ensureGroupThread, ensureTeamThread, meId, sayLine, teamThreadId } from "./chat";
import { addMemory, hasMemory, mindOf } from "./memory";
import type { Emo } from "./style";
import { romanceOnEvent } from "../social/romance";

type V = Partial<Record<PersonalityType | "default", string[]>>;

function pickV(rng: Rng, p: Player, v: V): string {
  const pool = v[p.persona.type] ?? v.default ?? Object.values(v)[0]!;
  return rng.pick(pool);
}

function teammates(g: GameState): Player[] {
  const c = g.user.clubId ? g.clubs[g.user.clubId] : undefined;
  const me = meId(g);
  return c ? c.squad.filter((id) => id !== me).map((id) => g.players[id]).filter(Boolean) : [];
}

function friendsSorted(g: GameState, pool: Player[]): Player[] {
  const me = meId(g);
  return [...pool].sort((a, b) => (getRel(g, me, b.id)?.friendship ?? 0) - (getRel(g, me, a.id)?.friendship ?? 0));
}

function dm(g: GameState, rng: Rng, p: Player, v: V, emo: Emo, extra: Record<string, string> = {}) {
  ensureDm(g, p.id);
  sayLine(g, rng, dmId(p.id), p.id, pickV(rng, p, v), emo, extra);
}

function team(g: GameState, rng: Rng, p: Player, v: V, emo: Emo, extra: Record<string, string> = {}) {
  const t = ensureTeamThread(g);
  if (!t) return;
  sayLine(g, rng, t.id, p.id, pickV(rng, p, v), emo, extra);
}

function budget(g: GameState): boolean {
  const k = `spont:${g.day}`;
  const n = g.chat.flags[k] ?? 0;
  if (n >= 4) return false;
  g.chat.flags[k] = n + 1;
  return true;
}

export function processChatTriggers(g: GameState, rng: Rng) {
  if (!g.user.clubId && g.user.mode === "player" && !g.user.playerId) return;
  const me = meId(g);
  const mates = teammates(g);
  const events = g.inbox.splice(0, g.inbox.length);
  for (const ev of events) romanceOnEvent(g, rng, ev);
  for (const ev of events) {
    if (!budget(g)) break;
    switch (ev.t) {
      case "match": {
        const fx = g.fixtures[ev.fixtureId];
        if (!fx?.result || fx.isNational) break;
        const cid = g.user.clubId;
        if (!cid) break;
        const home = fx.homeId === cid;
        const gf = home ? fx.result.hg : fx.result.ag;
        const ga = home ? fx.result.ag : fx.result.hg;
        const myLine = fx.result.lines.find((l) => l.playerId === me);
        const extra = { lopp: teamName(g, home ? fx.awayId : fx.homeId), score: `${gf} a ${ga}` };
        const f = friendsSorted(g, mates);
        if (myLine && myLine.goals >= 2 && f[0]) {
          dm(g, rng, f[0], { brincalhao: [myLine.goals >= 3 ? "HAT-TRICK?? {l} | Tu tá possuído" : "Dois gols, {a}!! Tá se achando hein {l}"], emocional: ["QUE JOGO TEU 😭🔥 | Orgulho demais"], arrogante: ["Jogou bem. Quase no meu nível {l}"], default: [myLine.goals >= 3 ? "Hat-trick!! Monstro demais 🔥" : "Que jogo, {a}! Dois gols é pra poucos"] }, "hype", extra);
          addMemory(g, f[0].id, "fato", `Você fez ${myLine.goals} gols contra o ${extra.lopp}.`);
        } else if (gf > ga && fx.importance >= 2) {
          const p = mates.filter((x) => x.persona.extro > 0.6)[rng.int(0, 2)] ?? f[0];
          if (p) team(g, rng, p, { default: ["QUE VITÓRIA RAPAZIADAAA", "Isso aqui é time grande! {score} no {lopp}"], competitivo: ["Ganhamos o jogo grande. Agora é manter"], brincalhao: ["Chora {lopp} {l}"] }, "hype", extra);
        } else if (gf < ga) {
          const p = mates.find((x) => x.persona.type === "lider") ?? f[0];
          if (p && rng.chance(0.6)) team(g, rng, p, { lider: ["Cabeça erguida, grupo. Amanhã é treino e a gente vira a chave"], default: ["Bora levantar, rapaziada"] }, "carinho", extra);
          const emo = f.find((x) => x.persona.type === "emocional" || x.persona.type === "leal");
          if (emo && myLine && myLine.rating < 6 && rng.chance(0.6)) dm(g, rng, emo, { default: ["Ei, não fica mal pelo jogo. Acontece com todo mundo", "Tô contigo, {a}. Próximo jogo tu arrebenta"] }, "carinho");
        } else if (myLine && myLine.goals === 1 && rng.chance(0.35) && f[0]) {
          dm(g, rng, f[0], { default: ["Teu gol foi lindo, {a}", "Que golzinho hein {l}"], arrogante: ["Bom gol. O meu seria mais bonito {l}"] }, "feliz", extra);
        }
        break;
      }
      case "bench": {
        if (g.user.mode !== "player") break;
        const p = friendsSorted(g, mates).find((x) => ["leal", "lider", "emocional"].includes(x.persona.type));
        if (p && !g.chat.flags[`bench:${g.season}:${ev.streak}`]) {
          g.chat.flags[`bench:${g.season}:${ev.streak}`] = 1;
          dm(g, rng, p, { lider: ["Vi que tu ficou no banco de novo. Mantém a cabeça boa, treina forte que a chance vem"], leal: ["Pô, {a}, não entendi tu no banco. Pra mim tu é titular"], default: ["Ficou no banco de novo… tá tudo bem?"] }, "carinho");
          mindOf(g, p.id).pending = { topic: "bench_talk", day: g.day };
        }
        break;
      }
      case "offer": {
        const o = g.offers.find((x) => x.id === ev.offerId);
        if (!o || o.direction !== "user") break;
        const club = teamName(g, o.fromClubId);
        const f = friendsSorted(g, mates).slice(0, 4);
        const a = f.find((x) => x.persona.type === "leal" || x.persona.type === "emocional");
        const b = f.find((x) => x.persona.type === "ambicioso" || x.persona.type === "brincalhao");
        if (a) dm(g, rng, a, { leal: [`Vi a notícia do ${club}... é verdade? | Não vai largar a gente né`], emocional: [`Mano, que história é essa de ${club}?? 😳`] }, "duvida");
        if (b && rng.chance(0.7)) dm(g, rng, b, { ambicioso: [`Tão falando do ${club}. Se o dinheiro for bom, aceita`], brincalhao: [`${club}?? Vai ficar rico e esquecer dos pobres {l}`] }, "feliz");
        break;
      }
      case "advice": {
        const p = g.players[ev.playerId];
        const d = g.decisions.find((x) => x.id === ev.decisionId);
        if (!p || !d) break;
        const club = teamName(g, String(d.data?.buyerId));
        dm(g, rng, p, { default: [`{a}, recebi proposta do ${club} | O que tu acha? Fico ou vou?`], timido: [`posso te perguntar uma coisa? | o ${club} me quer... o que vc acha?`], ambicioso: [`O ${club} me quer. Tô tentado. Tua opinião?`], emocional: [`Tô dividido demais… o ${club} fez proposta | Me ajuda a decidir?`] }, "duvida");
        mindOf(g, p.id).pending = { topic: "conselho", day: g.day };
        break;
      }
      case "transfer": {
        const p = g.players[ev.playerId];
        if (!p) break;
        const ucid = g.user.clubId;
        if (p.isUser) break;
        if (ev.from === ucid && ucid) {
          const rel = getRel(g, me, p.id);
          if (rel && rel.friendship >= 50) {
            dm(g, rng, p, { emocional: ["Vou sentir muita falta, {a} 😢 | Obrigado por tudo"], brincalhao: ["Vou embora mas tu continua feio {l} | Brincadeira, vou sentir falta"], default: [`Fechei com o ${ev.to ? teamName(g, ev.to) : "outro clube"}. Vou sentir falta, {a}`] }, "carinho");
            addMemory(g, p.id, "fato", `Vocês jogaram juntos no ${g.clubs[ucid].name} até a transferência dele.`);
          }
          const friend = mates.filter((x) => (getRel(g, x.id, p.id)?.friendship ?? 0) >= 45)[0];
          if (friend) team(g, rng, friend, { default: [`Pô, venderam o ${p.first}...`, `Sem o ${p.first} o vestiário vai ficar mais chato`], ambicioso: [`${p.first} foi pro ${ev.to ? teamName(g, ev.to) : "outro clube"}. Boa pra ele`] }, "triste");
        } else if (ev.to === ucid && ucid) {
          const greeter = mates.find((x) => x.id !== p.id && x.persona.extro > 0.65);
          if (greeter && rng.chance(0.6)) team(g, rng, greeter, { default: [`Chegou reforço! Bem-vindo, ${p.first}`, `${p.first} chegou, rapaziada. Bora receber bem`], brincalhao: [`${p.first} chegou e já vai pagar o ${greeter.persona.food} de boas-vindas {l}`] }, "feliz");
          ensureTeamThread(g);
        }
        break;
      }
      case "user_moved": {
        if (g.user.mode !== "player") break;
        const fromClub = ev.from ? g.clubs[ev.from] : undefined;
        const oldMates = fromClub ? fromClub.squad.map((id) => g.players[id]).filter(Boolean) : [];
        const promised = g.user.promisedStay !== undefined && g.day - g.user.promisedStay < 240;
        for (const p of friendsSorted(g, oldMates).slice(0, 3)) {
          const rel = getRel(g, me, p.id);
          if (!rel || rel.friendship < 42) continue;
          const told = hasMemory(g, p.id, "avisou_saida", 60);
          if (told) dm(g, rng, p, { default: [`Vai com tudo no ${g.clubs[ev.to].name}, {a}`, "Já sabia que ia acontecer. Boa sorte, de verdade"], emocional: ["Ainda tô triste mas vou torcer por ti 😔❤️"] }, "carinho");
          else {
            dm(g, rng, p, { leal: ["Pô, tu nem falou comigo antes, velho?"], emocional: ["Tu nem me contou?? 💔"], arrogante: ["Saiu sem avisar. Beleza {l}"], default: ["Soube pela notícia que tu saiu... podia ter avisado"] }, "triste");
            bumpRel(g, me, p.id, { trust: promised ? -7 : -4, friendship: -2 });
            addMemory(g, p.id, promised ? "quebrou_promessa" : "saiu_sem_avisar", promised ? "Você prometeu ficar e saiu do clube." : "Você saiu do clube sem avisar.");
          }
        }
        const newMates = teammates(g);
        const w = newMates.filter((x) => x.persona.extro > 0.6).slice(0, 2);
        for (const p of w) dm(g, rng, p, { default: [`Bem-vindo ao ${g.clubs[ev.to].name}, {a}!`, "Seja bem-vindo! Qualquer coisa me chama"], arrogante: ["Bem-vindo. Aqui quem manda sou eu, mas fica à vontade {l}"], timido: ["oi, bem-vindo ao time"] }, "feliz");
        ensureTeamThread(g);
        break;
      }
      case "title": {
        if (ev.clubId !== g.user.clubId && !(ev.clubId.startsWith("N-"))) break;
        if (ev.clubId.startsWith("N-")) break;
        const comp = g.comps[ev.compId];
        for (const p of mates.filter((x) => x.persona.extro > 0.55).slice(0, 3)) {
          team(g, rng, p, { default: [`É CAMPEÃÃÃO! ${comp?.name ?? ""}`, "Que temporada, rapaziada 🏆"], emocional: ["Tô chorando até agora 😭🏆"], brincalhao: ["Cadê os que duvidaram? {l} 🏆"], lider: ["Orgulho de cada um aqui. Merecido"] }, "hype");
        }
        for (const p of mates) {
          const r = getRel(g, me, p.id);
          if (r) { r.titles++; bumpRel(g, me, p.id, { friendship: 2 }); }
          if (r && r.friendship >= 40) addMemory(g, p.id, "titulo_junto", `Vocês foram campeões juntos da ${comp?.name ?? "competição"}.`);
        }
        break;
      }
      case "final_lost": {
        const comp = g.comps[ev.compId];
        const p = mates.find((x) => x.persona.type === "emocional") ?? mates.find((x) => x.persona.type === "lider");
        if (p) team(g, rng, p, { emocional: ["Não consigo acreditar 😞", "Dói demais perder essa final"], lider: [`Perder a ${comp?.name ?? "final"} dói, mas esse grupo volta mais forte`] }, "triste");
        for (const x of mates) if ((getRel(g, me, x.id)?.friendship ?? 0) >= 45) addMemory(g, x.id, "derrota_dura", `Vocês perderam juntos a final da ${comp?.name ?? "copa"}.`);
        break;
      }
      case "injury": {
        if (ev.playerId === me) {
          for (const p of friendsSorted(g, mates).slice(0, 2)) dm(g, rng, p, { default: ["Melhoras, {a}! Volta logo", "Força na recuperação. A gente precisa de ti"], brincalhao: ["Tá fazendo corpo mole né {l} melhoras, sério"] }, "carinho");
        }
        break;
      }
      case "callup": {
        const p = friendsSorted(g, mates)[0];
        if (p) dm(g, rng, p, { default: ["CONVOCADO!! Orgulho demais, {a} 🔥", "Vi a lista da seleção! Merecido demais"], arrogante: ["Convocado, hein. Ainda vão me chamar também {l}"] }, "hype");
        break;
      }
      case "group": {
        const gr = g.groups.find((x) => x.id === ev.groupId);
        if (!gr) break;
        const t = ensureGroupThread(g, gr.id);
        if (!t) break;
        const members = gr.members.filter((m) => m !== me).map((m) => g.players[m]).filter(Boolean);
        const sp = members[rng.int(0, members.length - 1)];
        if (!sp) break;
        const msg = ev.kind === "formado"
          ? { default: [`Criei esse grupo aqui | A gente tá se entendendo demais em campo`, `Tá todo mundo falando da gente {l} | Bora chamar de "${gr.name}"?`] }
          : ev.kind === "nivel"
            ? { default: [`Viram? Agora somos ${gr.level === "lendario" ? "LENDÁRIOS" : "o trio mais entrosado da liga"} {l}`, "Isso aqui tá virando história 🔥"] }
            : ev.kind === "fim"
              ? { default: ["Fim de uma era, né… | Foi lindo enquanto durou", "Vou sentir falta desse trio"] }
              : { default: ["OLHA QUEM VOLTOU A JOGAR JUNTO {l}", "Reencontro histórico! Bora fazer de novo"] };
        sayLine(g, rng, t.id, sp.id, pickV(rng, sp, msg), ev.kind === "fim" ? "triste" : "hype");
        break;
      }
      case "hired": {
        const t = ensureTeamThread(g);
        const cap = [...mates].sort((a, b) => b.reputation - a.reputation)[0];
        if (t && cap) sayLine(g, rng, t.id, cap.id, "Bem-vindo, professor. O grupo tá com o senhor", "carinho");
        break;
      }
      case "fired": {
        const old = g.clubs[ev.clubId];
        const loyal = old?.squad.map((id) => g.players[id]).find((p) => p && (getRel(g, USER_COACH_ID, p.id)?.friendship ?? 0) >= 45);
        if (loyal) dm(g, rng, loyal, { default: ["Obrigado por tudo, professor. Aprendi muito com o senhor"], emocional: ["Não acredito que te mandaram embora 😔 obrigado por tudo"] }, "carinho");
        break;
      }
      case "coach_sacked": {
        if (ev.clubId !== g.user.clubId || g.user.mode !== "player") break;
        const p = mates.find((x) => x.persona.extro > 0.6);
        if (p) team(g, rng, p, { default: ["Mandaram o professor embora… | Vamos ver o novo", "Técnico novo, vida nova. Todo mundo zerado"], ambicioso: ["Técnico novo = chance nova. Bora mostrar serviço"] }, "neutro");
        break;
      }
    }
  }
  // véspera de jogo importante
  const nx = nextUserFixture(g);
  if (nx && nx.day - g.day === 1 && nx.importance >= 2 && !g.chat.flags[`pre:${nx.id}`] && !nx.isNational) {
    g.chat.flags[`pre:${nx.id}`] = 1;
    const opp = teamName(g, nx.homeId === g.user.clubId ? nx.awayId : nx.homeId);
    const p = mates.find((x) => x.persona.type === "competitivo" || x.persona.type === "lider") ?? mates[0];
    if (p) team(g, rng, p, { competitivo: [`Amanhã é ${opp}. Quero ver todo mundo com sangue nos olhos`, `${nx.round === "Final" ? "FINAL" : "Jogo grande"} amanhã. Sem desculpa`], lider: [`Amanhã é ${nx.round === "Final" ? "final" : "jogo grande"} contra o ${opp}. Descansa, hidrata, foco`], default: [`Amanhã tem ${opp}, hein! Bora`] }, "hype");
  }
  // aniversários
  const today = ((g.day % 364) + 364) % 364;
  for (const p of mates) {
    if (p.persona.birthday !== today || g.chat.flags[`niver:${p.id}:${g.season}`]) continue;
    g.chat.flags[`niver:${p.id}:${g.season}`] = 1;
    const rel = getRel(g, me, p.id);
    if (!rel || rel.friendship < 35) continue;
    if (p.persona.extro > 0.5) team(g, rng, p, { default: ["Hoje é meu niver, rapaziada 🎂", "Mais um ano de vida! Hoje tem bolo no CT {l}"], timido: ["hoje é meu aniversário..."] }, "feliz");
    else {
      const other = mates.find((x) => x.id !== p.id && x.persona.extro > 0.6);
      if (other) team(g, rng, other, { default: [`Hoje é aniversário do ${p.first}! Parabéns, ${p.persona.address}`] }, "feliz");
    }
  }
  // limpeza de flags antigas
  if (Object.keys(g.chat.flags).length > 400) {
    for (const k of Object.keys(g.chat.flags)) if (k.startsWith("spont:") && Number(k.split(":")[1]) < g.day - 3) delete g.chat.flags[k];
  }
  void teamThreadId;
}
