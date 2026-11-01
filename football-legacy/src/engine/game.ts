/** Fachada do motor: criação de carreira e utilidades usadas pela interface. */
import { ensureClubRelations } from "./chemistry/relations";
import { ensureDm, ensureTeamThread, pushMsg, sayLine } from "./chat/chat";
import { buildObjectives } from "./career/coach";
import { addNews, milestone } from "./news/news";
import { clamp, Rng } from "./rng";
import { buildSeason } from "./season/schedule";
import type { Foot, GameState, NationId, Pos } from "./types";
import { createWorld } from "./world/generate";
import { createPlayer, fairWage, roundMoney } from "./world/players";

export interface PlayerSetup {
  mode: "player";
  name: string;
  last: string;
  nation: NationId;
  age: number;
  pos: Pos;
  foot: Foot;
  height: number;
  style: string;
  clubId: string;
  seed: number;
}

export interface CoachSetup {
  mode: "coach";
  name: string;
  nation: NationId;
  clubId: string;
  seed: number;
}

/** Mundo pronto para a tela de criação (para escolher o clube). */
export function previewWorld(seed: number): GameState {
  return createWorld(seed);
}

export function startingOvr(age: number): number {
  if (age <= 17) return 56;
  if (age <= 19) return 60;
  if (age <= 21) return 63;
  return 66;
}

export function createCareer(setup: PlayerSetup | CoachSetup, world?: GameState): GameState {
  const g = world ?? createWorld(setup.seed);
  const rng = new Rng(g.rng ^ 0x5bd1e995);
  g.user.mode = setup.mode;
  g.user.nation = setup.nation;
  g.user.clubId = setup.clubId;
  g.user.startSeason = 0;
  const club = g.clubs[setup.clubId];
  if (setup.mode === "player") {
    const ovr = startingOvr(setup.age) + rng.int(-1, 2);
    const pot = clamp(Math.round(ovr + (24 - setup.age) * 3.2 + 8 + rng.int(0, 3)), ovr + 6, 94);
    const p = createPlayer(g, rng, { nation: setup.nation, pos: setup.pos, age: setup.age, ovr, potential: pot, clubId: club.id, style: setup.style, first: setup.name, last: setup.last, foot: setup.foot, height: setup.height });
    p.isUser = true;
    p.alt = [];
    p.reputation = 12 + rng.int(0, 8);
    p.morale = 75;
    p.persona.type = "leal";
    p.persona.hometown = g.nations[setup.nation].name;
    p.contract = { wage: roundMoney(fairWage(p, g.day) * 0.9, 100), until: 2 };
    p.clubs.push({ clubId: club.id, clubName: club.name, season: 0, fee: 0 });
    club.squad.push(p.id);
    g.user.playerId = p.id;
    g.user.name = `${setup.name} ${setup.last}`;
    g.user.coachRelation = 50;
    g.name = `${setup.name} ${setup.last} · ${club.short}`;
  } else {
    g.user.name = setup.name;
    g.user.reputation = clamp(Math.round(club.reputation * 0.6), 10, 60);
    club.coachName = setup.name;
    g.name = `${setup.name} · ${club.short}`;
  }
  g.rng = rng.state;
  buildSeason(g, new Rng(g.rng));
  if (setup.mode === "coach") g.user.objectives = buildObjectives(g, club.id);
  ensureClubRelations(g);
  milestone(g, setup.mode === "player" ? `Início da carreira no ${club.name}` : `Assumiu o ${club.name}`);
  addNews(g, {
    title: setup.mode === "player" ? `${g.user.name} é apresentado no ${club.name}` : `${g.user.name} é o novo treinador do ${club.name}`,
    body: setup.mode === "player" ? `Promessa ${g.nations[setup.nation].adj} de ${setup.age} anos chega para disputar posição.` : g.user.objectives.map((o) => o.text).join(" · "),
    tag: "carreira", importance: 3, clubIds: [club.id],
  });
  // boas-vindas no Vestiário
  const tt = ensureTeamThread(g);
  const welcome = club.squad.map((id) => g.players[id]).filter((p) => p && !p.isUser).sort((a, b) => b.persona.extro - a.persona.extro).slice(0, 2);
  const r2 = new Rng(g.rng ^ 77);
  if (tt) {
    pushMsg(g, tt, "sys", setup.mode === "player" ? `Você foi adicionado ao grupo.` : `O treinador entrou no grupo.`);
    for (const p of welcome) sayLine(g, r2, tt.id, p.id, setup.mode === "player" ? "Chegou o reforço! Bem-vindo, {a}" : "Bem-vindo, professor! Tamo junto", "feliz");
  }
  if (welcome[0]) {
    ensureDm(g, welcome[0].id);
    sayLine(g, r2, `dm:${welcome[0].id}`, welcome[0].id, setup.mode === "player" ? "E aí, {me}! Qualquer coisa que precisar aqui no clube, me chama" : "Professor, qualquer coisa do grupo pode falar comigo", "feliz");
  }
  return g;
}

export const SEEDS = () => (Date.now() ^ Math.floor(performance.now() * 1000)) >>> 0;
