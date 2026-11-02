import { addNews } from "../news/news";
import type { GameState } from "../types";

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  mode?: "player" | "coach";
  test: (g: GameState) => boolean;
}

const me = (g: GameState) => (g.user.playerId ? g.players[g.user.playerId] : undefined);
const careerGoals = (g: GameState) => { const p = me(g); return p ? p.career.reduce((s, c) => s + c.goals, 0) + p.stats.goals : 0; };
const careerApps = (g: GameState) => { const p = me(g); return p ? p.career.reduce((s, c) => s + c.apps, 0) + p.stats.apps : 0; };
const userTitles = (g: GameState) => g.history.milestones.filter((m) => m.text.startsWith("Título")).length;
const userTitle = (g: GameState, prefix: string) => g.history.milestones.some((m) => m.text.startsWith("Título") && m.text.includes(prefix));

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "estreia", name: "Estreia", desc: "Entre em campo pela primeira vez.", mode: "player", test: (g) => careerApps(g) >= 1 },
  { id: "primeiro_gol", name: "Primeiro grito", desc: "Marque seu primeiro gol profissional.", mode: "player", test: (g) => careerGoals(g) >= 1 },
  { id: "gols_50", name: "Matador", desc: "Chegue a 50 gols na carreira.", mode: "player", test: (g) => careerGoals(g) >= 50 },
  { id: "gols_200", name: "Lenda da área", desc: "Chegue a 200 gols na carreira.", mode: "player", test: (g) => careerGoals(g) >= 200 },
  { id: "jogos_100", name: "Centenário", desc: "Dispute 100 partidas.", mode: "player", test: (g) => careerApps(g) >= 100 },
  { id: "ovr_80", name: "Classe mundial", desc: "Alcance overall 80.", mode: "player", test: (g) => (me(g)?.ovr ?? 0) >= 80 },
  { id: "ovr_88", name: "Fenômeno", desc: "Alcance overall 88.", mode: "player", test: (g) => (me(g)?.ovr ?? 0) >= 88 },
  { id: "selecao", name: "Convocado", desc: "Seja convocado para a seleção.", mode: "player", test: (g) => (me(g)?.intl.caps ?? 0) >= 1 },
  { id: "bola_ouro", name: "Bola de Ouro", desc: "Vença a Bola de Ouro Legacy.", mode: "player", test: (g) => g.history.awards.some((a) => a.award === "Bola de Ouro Legacy" && a.playerId === g.user.playerId) },
  { id: "artilheiro", name: "Artilheiro", desc: "Seja artilheiro de uma liga.", mode: "player", test: (g) => g.history.awards.some((a) => a.award.startsWith("Artilheiro") && a.playerId === g.user.playerId) },
  { id: "titulo", name: "Primeira taça", desc: "Conquiste um título.", test: (g) => userTitles(g) >= 1 },
  { id: "titulos_10", name: "Colecionador", desc: "Conquiste 10 títulos.", test: (g) => userTitles(g) >= 10 },
  { id: "liga", name: "Campeão nacional", desc: "Vença uma liga de primeira divisão.", test: (g) => g.history.milestones.some((m) => m.text.startsWith("Título") && /(Liga Nacional|Primera|Premier|Ibérica|Serie|Bundesliga)/.test(m.text)) },
  { id: "continental", name: "Rei do continente", desc: "Vença uma competição continental.", test: (g) => userTitle(g, "Campeões") || userTitle(g, "Libertad") },
  { id: "mundial", name: "Campeão do mundo", desc: "Vença o Mundial de Clubes.", test: (g) => userTitle(g, "Mundial") },
  { id: "nacoes", name: "Glória nacional", desc: "Vença a Copa das Nações.", mode: "player", test: (g) => userTitle(g, "Nações") },
  { id: "dupla", name: "Parceria", desc: "Forme uma dupla.", test: (g) => g.groups.some((gr) => gr.members.length === 2) },
  { id: "trio", name: "Trio", desc: "Forme um trio.", test: (g) => g.groups.some((gr) => gr.members.length === 3) },
  { id: "trio_lendario", name: "Trio Lendário", desc: "Leve um trio ao nível lendário.", test: (g) => g.groups.some((gr) => gr.level === "lendario" && gr.members.length === 3) },
  { id: "reencontro", name: "Reencontro histórico", desc: "Reúna um grupo desfeito.", test: (g) => g.groups.some((gr) => gr.reunions > 0) },
  { id: "amigo_100", name: "Irmão de vestiário", desc: "Chegue a amizade 90 com alguém.", test: (g) => Object.values(g.relations).some((r) => r.friendship >= 90) },
  { id: "acesso", name: "Subiu!", desc: "Conquiste um acesso como treinador.", mode: "coach", test: (g) => g.history.milestones.some((m) => m.text.startsWith("Acesso")) },
  { id: "treinador_ano", name: "Professor", desc: "Seja eleito Treinador do Ano.", mode: "coach", test: (g) => g.history.milestones.some((m) => m.text.includes("Treinador do Ano")) },
  { id: "vitorias_100", name: "Cem vitórias", desc: "Vença 100 jogos como treinador.", mode: "coach", test: (g) => g.user.coachRecord.w >= 100 },
  { id: "temporadas_5", name: "Longevidade", desc: "Complete 5 temporadas.", test: (g) => g.season - g.user.startSeason >= 5 },
  { id: "namoro", name: "Coração ocupado", desc: "Comece um namoro.", test: (g) => g.history.milestones.some((m) => m.text.startsWith("Começou a namorar")) },
  { id: "casamento", name: "Sim, aceito", desc: "Case-se.", test: (g) => g.history.milestones.some((m) => m.text.startsWith("Casou com")) },
  { id: "transferencia_grande", name: "Negócio milionário", desc: "Mude de clube por mais de €30M.", mode: "player", test: (g) => (me(g)?.clubs ?? []).some((c) => c.fee >= 30_000_000) },
];

export function checkAchievements(g: GameState) {
  for (const a of ACHIEVEMENTS) {
    if (g.achievements[a.id] !== undefined) continue;
    if (a.mode && a.mode !== g.user.mode) continue;
    try {
      if (a.test(g)) {
        g.achievements[a.id] = g.day;
        addNews(g, { title: `Conquista desbloqueada: ${a.name}`, body: a.desc, tag: "carreira", importance: 2 });
      }
    } catch {
      /* ignora */
    }
  }
}
