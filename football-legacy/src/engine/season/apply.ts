/** Aplica o resultado de uma partida a tabelas, estatísticas, lesões, moral e finanças. */
import { chemistryAfterMatch, getRel } from "../chemistry/relations";
import { addNews } from "../news/news";
import { clamp, hashSeed, Rng } from "../rng";
import type { Fixture, GameState, MatchResult, TableRow } from "../types";
import { formatMoney, fullName } from "../world/players";
import type { MatchState } from "../match/engine";
import { teamName } from "./schedule";

const INJURIES: [string, number, number, number][] = [
  // nome, min dias, max dias, peso
  ["Pancada no tornozelo", 3, 8, 30],
  ["Lesão muscular na coxa", 10, 24, 25],
  ["Estiramento na panturrilha", 7, 18, 18],
  ["Entorse no joelho", 18, 40, 10],
  ["Lesão no ombro", 14, 30, 7],
  ["Fratura no pé", 45, 80, 4],
  ["Ruptura de ligamento", 120, 220, 1.2],
];

export function rollInjury(rng: Rng): { name: string; days: number } {
  const it = rng.weighted(INJURIES, (x) => x[3]);
  return { name: it[0], days: rng.int(it[1], it[2]) };
}

function updateRow(row: TableRow, gf: number, ga: number) {
  row.p++;
  row.gf += gf;
  row.ga += ga;
  const r = gf > ga ? "V" : gf < ga ? "D" : "E";
  if (r === "V") { row.w++; row.pts += 3; } else if (r === "E") { row.d++; row.pts += 1; } else row.l++;
  row.form.push(r);
  if (row.form.length > 5) row.form.shift();
}

export function isUserFixture(g: GameState, f: Fixture): boolean {
  const cid = g.user.clubId;
  if (cid && (f.homeId === cid || f.awayId === cid)) return true;
  if (f.isNational && g.user.mode === "player" && g.user.playerId && g.callups.includes(g.user.playerId)) {
    const n = `N-${g.players[g.user.playerId].nation}`;
    return f.homeId === n || f.awayId === n;
  }
  return false;
}

export function applyMatchResult(g: GameState, fx: Fixture, ms: MatchState, result: MatchResult) {
  fx.played = true;
  fx.result = result;
  const comp = g.comps[fx.compId];
  const rng = new Rng(hashSeed(g.seed, fx.id, "apply"));
  const isClub = !fx.isNational;
  // tabela
  if (comp) {
    const table = comp.type === "league" ? comp.table : !fx.tieId ? comp.groups?.find((gr) => gr.teamIds.includes(fx.homeId))?.table : undefined;
    if (table) {
      const h = table.find((r) => r.clubId === fx.homeId);
      const a = table.find((r) => r.clubId === fx.awayId);
      if (h && a) { updateRow(h, result.hg, result.ag); updateRow(a, result.ag, result.hg); }
    }
  }
  // jogadores
  const played = new Set<string>();
  for (const l of result.lines) {
    const p = g.players[l.playerId];
    if (!p) continue;
    played.add(p.id);
    if (l.minutes > 0) {
      p.form.push(l.rating);
      if (p.form.length > 6) p.form.shift();
    }
    if (isClub) {
      const s = p.stats;
      s.apps++;
      if (l.started) s.starts++;
      s.minutes += l.minutes;
      s.goals += l.goals;
      s.assists += l.assists;
      s.ratingSum += l.rating;
      if (result.motm === p.id) s.motm++;
      const conceded = l.side === 0 ? result.ag : result.hg;
      if (conceded === 0 && l.minutes >= 60 && ["GOL", "ZAG", "LAT"].includes(p.pos)) s.cleanSheets++;
      const cs = (p.compStats[fx.compId] ??= { g: 0, a: 0, apps: 0 });
      cs.g += l.goals;
      cs.a += l.assists;
      cs.apps++;
    } else {
      p.intl.caps++;
      p.intl.goals += l.goals;
    }
    const lf = ms.lines[p.id];
    if (lf) {
      p.fitness = Math.round(clamp(ms.fit[p.id] ?? p.fitness, 20, 100));
      if (lf.yellow && isClub) {
        p.yellowAcc += lf.yellow >= 2 ? 0 : 1;
        p.stats.yellows += Math.min(1, lf.yellow);
        if (p.yellowAcc >= 4) { p.suspended += 1; p.yellowAcc = 0; }
      }
      if (lf.red && isClub) { p.stats.reds++; p.suspended += rng.chance(0.3) ? 2 : 1; }
      if (lf.injured) {
        const inj = rollInjury(rng);
        p.injury = inj;
        g.inbox.push({ t: "injury", playerId: p.id, days: inj.days });
        if (p.isUser || p.reputation >= 70 || p.clubId === g.user.clubId) {
          addNews(g, {
            title: p.isUser ? `Você sofre lesão: ${inj.name.toLowerCase()}` : `${fullName(p)} se lesiona e desfalca o ${teamName(g, p.clubId ?? "")}`,
            body: `${inj.name}. Previsão de ${Math.ceil(inj.days / 7)} semana(s) de recuperação.`,
            tag: "lesao", importance: p.isUser ? 3 : 2, playerIds: [p.id], clubIds: p.clubId ? [p.clubId] : [],
          });
        }
      }
    }
    const won = (l.side === 0 && result.hg > result.ag) || (l.side === 1 && result.ag > result.hg);
    const lost = (l.side === 0 && result.hg < result.ag) || (l.side === 1 && result.ag < result.hg);
    p.morale = clamp(p.morale + (won ? 4 : lost ? -4 : 0) + (l.rating - 6.5) * 2, 0, 100);
  }
  // suspensões cumpridas e moral de quem ficou de fora
  if (isClub) {
    for (const cid of [fx.homeId, fx.awayId]) {
      const c = g.clubs[cid];
      if (!c) continue;
      for (const id of c.squad) {
        const p = g.players[id];
        if (!p || played.has(id)) continue;
        if (p.suspended > 0) p.suspended--;
        else if (!p.injury && p.ovr >= 70) p.morale = clamp(p.morale - 1, 0, 100);
      }
      c.cohesion = clamp(c.cohesion + 0.35, 0, 92);
    }
    // finanças: bilheteria
    const home = g.clubs[fx.homeId];
    if (home) {
      const att = Math.round(home.stadium * clamp(0.55 + home.reputation / 250 + (fx.importance ?? 1) * 0.08, 0.3, 1));
      home.balance += att * (18 + home.reputation * 0.5);
    }
    // pressão sobre treinadores (IA)
    for (const [cid, gf, ga] of [[fx.homeId, result.hg, result.ag], [fx.awayId, result.ag, result.hg]] as [string, number, number][]) {
      const c = g.clubs[cid];
      if (!c) continue;
      const opp = g.clubs[cid === fx.homeId ? fx.awayId : fx.homeId];
      const expected = opp ? (c.reputation - opp.reputation) / 30 : 0;
      const delta = gf > ga ? -5 - Math.max(0, -expected) * 2 : gf === ga ? 1.5 + Math.max(0, expected) : 5 + Math.max(0, expected) * 3;
      c.coachPressure = clamp(c.coachPressure + delta * (comp?.type === "league" ? 1 : 0.6), 0, 100);
    }
  }
  // química no clube do usuário
  const ucid = g.user.clubId;
  if (ucid && isClub && (fx.homeId === ucid || fx.awayId === ucid)) {
    const side: 0 | 1 = fx.homeId === ucid ? 0 : 1;
    const won = side === 0 ? result.hg > result.ag : result.ag > result.hg;
    chemistryAfterMatch(g, result.lines, side, won, result.events);
    afterUserMatch(g, fx, result, side, rng);
  }
  if (isUserFixture(g, fx)) {
    g.inbox.push({ t: "match", fixtureId: fx.id });
    g.lastResults.unshift({ fixtureId: fx.id, day: fx.day });
    if (g.lastResults.length > 30) g.lastResults.length = 30;
  } else compactResult(result);
}

function afterUserMatch(g: GameState, fx: Fixture, r: MatchResult, side: 0 | 1, rng: Rng) {
  const gf = side === 0 ? r.hg : r.ag;
  const ga = side === 0 ? r.ag : r.hg;
  const res = gf > ga ? "w" : gf < ga ? "l" : "d";
  const oppId = side === 0 ? fx.awayId : fx.homeId;
  if (g.user.mode === "coach" && !g.user.unemployed) {
    g.user.coachRecord[res]++;
    const club = g.clubs[g.user.clubId!];
    const opp = g.clubs[oppId];
    const exp = opp ? (club.reputation - opp.reputation) / 25 : 0;
    const d = res === "w" ? 2.2 - Math.max(0, exp) * 0.5 : res === "d" ? -0.6 - Math.max(0, exp) : -2.6 - Math.max(0, exp) * 1.2;
    g.user.boardConfidence = clamp(g.user.boardConfidence + d, 0, 100);
    g.user.reputation = clamp(g.user.reputation + (res === "w" ? 0.25 : res === "l" ? -0.15 : 0) * (1 + (opp?.reputation ?? 50) / 100), 0, 100);
  }
  if (g.user.mode === "player" && g.user.playerId) {
    const me = g.players[g.user.playerId];
    const line = r.lines.find((l) => l.playerId === me.id);
    if (line && line.minutes > 0) {
      g.user.coachRelation = clamp(g.user.coachRelation + (line.rating - 6.6) * 1.6, 0, 100);
      me.reputation = clamp(me.reputation + (line.rating - 6.4) * 0.35 + line.goals * 0.35 + (fx.importance >= 2 ? 0.2 : 0), 0, 100);
      if (line.started) g.user.lastBenchStreak = 0;
      if (line.goals >= 3) {
        addNews(g, { title: `Hat-trick! ${fullName(me)} brilha contra o ${teamName(g, oppId)}`, body: `Três gols e nota ${line.rating.toFixed(1)}. A torcida já canta seu nome.`, tag: "carreira", importance: 3, playerIds: [me.id] });
        me.reputation = clamp(me.reputation + 2, 0, 100);
      }
    } else if (!me.injury && me.suspended <= 0) {
      g.user.lastBenchStreak++;
      if (g.user.lastBenchStreak >= 2) g.inbox.push({ t: "bench", streak: g.user.lastBenchStreak });
    }
  }
  // rivalidade: clássico perdido aumenta rivalidade e ganho reduz pressão
  const club = g.clubs[g.user.clubId!];
  if (club?.rivals.includes(oppId)) {
    addNews(g, {
      title: res === "w" ? `Clássico é nosso: ${club.name} vence o ${teamName(g, oppId)}` : res === "l" ? `Derrota no clássico deixa torcida do ${club.name} na bronca` : `Clássico termina empatado`,
      body: `${teamName(g, fx.homeId)} ${r.hg}–${r.ag} ${teamName(g, fx.awayId)}.`,
      tag: "clube", importance: 2, clubIds: [club.id, oppId],
    });
    for (const id of club.squad) { const p = g.players[id]; if (p) p.morale = clamp(p.morale + (res === "w" ? 4 : res === "l" ? -5 : 0), 0, 100); }
  }
  void rng; void getRel; void formatMoney;
}

/** Jogos sem o usuário guardam só o essencial (placar, gols, expulsões) para o save ficar leve. */
export function compactResult(r: MatchResult) {
  r.events = r.events.filter((e) => e.type === "goal" || e.type === "pen_goal" || e.type === "red").map((e) => ({ min: e.min, type: e.type, side: e.side, playerId: e.playerId, assistId: e.assistId, text: "" }));
  r.lines = [];
}
