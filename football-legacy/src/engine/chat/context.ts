/** Fatos reais da carreira que os personagens conhecem. Nada aqui é inventado. */
import { getRel, USER_COACH_ID } from "../chemistry/relations";
import { nextUserFixture } from "../season/queries";
import { sortTable, teamName } from "../season/schedule";
import type { Fixture, GameState, Player, Relation } from "../types";
import { formatMoney, shortName } from "../world/players";

/** Nome falado do time (como os jogadores chamam: pela cidade). */
export function spokenTeam(g: GameState, id: string): string {
  if (id.startsWith("N-")) return g.nations[id.slice(2)]?.name ?? id;
  return g.clubs[id]?.city ?? teamName(g, id);
}
import { memorySummary } from "./memory";

export interface MatchFact {
  fixtureId: string;
  opp: string;
  oppId: string;
  comp: string;
  home: boolean;
  daysTo: number;
  derby: boolean;
  final: boolean;
  oppPos?: number;
  oppWins?: number;
  importance: number;
}

export interface LastFact {
  opp: string;
  gf: number;
  ga: number;
  res: "V" | "E" | "D";
  comp: string;
  daysAgo: number;
  myGoals: number;
  myRating?: number;
  charGoals: number;
  charPlayed: boolean;
  charRating?: number;
  final: boolean;
}

export interface ChatCtx {
  meId: string;
  meName: string;
  coachMode: boolean;
  clubName: string;
  clubCity: string;
  next?: MatchFact;
  last?: LastFact;
  pos?: number;
  league?: string;
  leaderGap?: number;
  offers: { club: string; clubId: string; fee: string; wage: string; role: string }[];
  movedRecently?: { to: string; from: string; daysAgo: number };
  benchStreak: number;
  meInjured?: string;
  meGoalsSeason: number;
  char?: {
    id: string;
    p: Player;
    rel?: Relation;
    injured?: string;
    benched: boolean;
    goals: number;
    sameClub: boolean;
    birthdayToday: boolean;
    memories: string[];
    adviceDecision?: string;
  };
}

function lastUserMatch(g: GameState): Fixture | undefined {
  for (const r of g.lastResults) {
    const f = g.fixtures[r.fixtureId];
    if (f && (f.homeId === g.user.clubId || f.awayId === g.user.clubId)) return f;
  }
  return undefined;
}

export function buildCtx(g: GameState, charId?: string): ChatCtx {
  const coachMode = g.user.mode === "coach";
  const meId = coachMode ? USER_COACH_ID : g.user.playerId!;
  const me = coachMode ? undefined : g.players[meId];
  const club = g.user.clubId ? g.clubs[g.user.clubId] : undefined;
  const ctx: ChatCtx = {
    meId,
    meName: coachMode ? g.user.name : me ? me.first : g.user.name,
    coachMode,
    clubName: club?.name ?? "sem clube",
    clubCity: club?.city ?? "",
    offers: g.offers.filter((o) => o.direction === "user" && o.status === "pendente").map((o) => ({ club: teamName(g, o.fromClubId), clubId: o.fromClubId, fee: formatMoney(o.fee), wage: formatMoney(o.wage), role: o.role })),
    benchStreak: g.user.lastBenchStreak,
    meInjured: me?.injury?.name,
    meGoalsSeason: me?.stats.goals ?? 0,
  };
  const nx = nextUserFixture(g);
  if (nx && club && !nx.isNational) {
    const home = nx.homeId === club.id;
    const oppId = home ? nx.awayId : nx.homeId;
    const lg = g.comps[club.leagueId];
    let oppPos: number | undefined;
    let oppWins: number | undefined;
    if (lg && lg.teamIds.includes(oppId)) {
      const t = sortTable([...lg.table]);
      oppPos = t.findIndex((r) => r.clubId === oppId) + 1;
      oppWins = t.find((r) => r.clubId === oppId)?.form.filter((f) => f === "V").length;
    }
    ctx.next = { fixtureId: nx.id, opp: spokenTeam(g, oppId), oppId, comp: g.comps[nx.compId]?.name ?? "", home, daysTo: nx.day - g.day, derby: club.rivals.includes(oppId), final: nx.round === "Final", oppPos, oppWins, importance: nx.importance };
  }
  const lf = lastUserMatch(g);
  if (lf?.result && club) {
    const home = lf.homeId === club.id;
    const gf = home ? lf.result.hg : lf.result.ag;
    const ga = home ? lf.result.ag : lf.result.hg;
    const res = gf > ga ? "V" : gf < ga ? "D" : lf.result.pens ? (lf.result.pens[home ? 0 : 1] > lf.result.pens[home ? 1 : 0] ? "V" : "D") : "E";
    const myLine = lf.result.lines.find((l) => l.playerId === meId);
    const chLine = charId ? lf.result.lines.find((l) => l.playerId === charId) : undefined;
    ctx.last = {
      opp: spokenTeam(g, home ? lf.awayId : lf.homeId), gf, ga, res, comp: g.comps[lf.compId]?.name ?? "", daysAgo: g.day - lf.day,
      myGoals: myLine?.goals ?? 0, myRating: myLine?.rating, charGoals: chLine?.goals ?? 0, charPlayed: !!chLine && chLine.minutes > 0, charRating: chLine?.rating, final: lf.round === "Final",
    };
  }
  if (club) {
    const lg = g.comps[club.leagueId];
    if (lg) {
      const t = sortTable([...lg.table]);
      ctx.pos = t.findIndex((r) => r.clubId === club.id) + 1;
      ctx.league = lg.name;
      ctx.leaderGap = t[0].pts - (t.find((r) => r.clubId === club.id)?.pts ?? 0);
    }
  }
  const moved = g.history.transfers.find((t) => t.playerId === meId && g.day - t.day <= 21);
  if (moved) ctx.movedRecently = { to: moved.toName, from: moved.fromName, daysAgo: g.day - moved.day };
  if (charId) {
    const p = g.players[charId];
    if (p) {
      const adv = g.decisions.find((d) => d.kind === "conselho_amigo" && d.data?.playerId === charId);
      ctx.char = {
        id: charId, p, rel: getRel(g, meId, charId), injured: p.injury?.name, benched: p.stats.apps > 2 && p.stats.starts < p.stats.apps / 2,
        goals: p.stats.goals, sameClub: p.clubId === g.user.clubId,
        birthdayToday: p.persona.birthday === ((g.day % 364) + 364) % 364,
        memories: memorySummary(g, charId),
        adviceDecision: adv?.id,
      };
    }
  }
  return ctx;
}

/** Texto compacto com os fatos, usado no prompt do modo IA avançada. */
export function ctxToFacts(g: GameState, ctx: ChatCtx): string[] {
  const f: string[] = [];
  f.push(`${ctx.coachMode ? "O usuário é o treinador" : "O usuário é o jogador"} ${ctx.meName}, do ${ctx.clubName}.`);
  if (ctx.pos) f.push(`O time está em ${ctx.pos}º na ${ctx.league}, ${ctx.leaderGap} pontos atrás do líder.`);
  if (ctx.last) f.push(`Último jogo (há ${ctx.last.daysAgo} dias): ${ctx.last.res === "V" ? "vitória" : ctx.last.res === "D" ? "derrota" : "empate"} por ${ctx.last.gf}–${ctx.last.ga} contra o ${ctx.last.opp} (${ctx.last.comp}).${ctx.last.myGoals ? ` O usuário fez ${ctx.last.myGoals} gol(s).` : ""}${ctx.last.myRating ? ` Nota do usuário: ${ctx.last.myRating}.` : ""}`);
  if (ctx.next) f.push(`Próximo jogo: contra o ${ctx.next.opp} (${ctx.next.comp}), ${ctx.next.home ? "em casa" : "fora"}, em ${ctx.next.daysTo} dia(s).${ctx.next.derby ? " É clássico." : ""}${ctx.next.final ? " É uma final." : ""}${ctx.next.oppPos ? ` O adversário está em ${ctx.next.oppPos}º e venceu ${ctx.next.oppWins} dos últimos 5.` : ""}`);
  if (ctx.offers.length) f.push(`Propostas reais pelo usuário: ${ctx.offers.map((o) => `${o.club} (${o.fee}, ${o.wage}/sem, papel ${o.role})`).join("; ")}.`);
  else f.push("Não existe nenhuma proposta real pelo usuário neste momento.");
  if (ctx.movedRecently) f.push(`O usuário trocou o ${ctx.movedRecently.from} pelo ${ctx.movedRecently.to} há ${ctx.movedRecently.daysAgo} dias.`);
  if (ctx.benchStreak >= 2) f.push(`O usuário ficou no banco nos últimos ${ctx.benchStreak} jogos.`);
  if (ctx.meInjured) f.push(`O usuário está lesionado (${ctx.meInjured}).`);
  if (ctx.char) {
    const c = ctx.char;
    f.push(`Você (${shortName(c.p)}) ${c.sameClub ? "joga no mesmo clube" : `joga no ${teamName(g, c.p.clubId ?? "")}`}. Gols na temporada: ${c.goals}.${c.injured ? ` Está lesionado (${c.injured}).` : ""}${c.benched ? " Tem ficado muito no banco." : ""}`);
    if (c.birthdayToday) f.push("Hoje é o seu aniversário.");
    if (c.memories.length) f.push(`Memórias importantes: ${c.memories.join(" | ")}`);
  }
  return f;
}
