import { expect, it } from "vitest";
import { analyze } from "../chat/intents";
import { playerCareer } from "./helpers";
const MSGS = [
  "e aí", "suave?", "oq vc ta fazendo", "to entediado", "bora treinar amanha", "quem é o melhor do time?", "tu acha que a gente ganha domingo?",
  "joguei muito mal hoje", "to cansado demais", "que fome", "vou dormir", "tu viu o jogo do flamengo?", "qual teu time do coração", "tu gosta de mim?",
  "kkkkkk", "verdade", "sei la mano", "o professor ta pegando no meu pé", "o treino hoje foi pesado", "qual tua posição favorita",
  "tu é bom de bola?", "vamo ser campeão", "to com saudade de casa", "minha mãe ligou", "comprei um carro novo", "tô namorando", "e as mina?",
  "tu ta bem?", "faz o L", "bora jogar fifa", "quem vai ser titular?", "tu ta jogando muito", "eu sou o melhor do time", "a torcida ta pegando no pé",
  "que golaço do neymar", "ta chovendo aqui", "o juiz roubou a gente", "vamos fazer uma resenha", "me empresta uma grana", "qual teu sonho", "tu tem irmão?",
  "boa noite", "bom dia rapaziada", "me ajuda com uma coisa", "tô triste", "tô feliz demais", "partiu", "pq tu ta no banco?", "quem é teu ídolo?",
];
it("entende a maioria das mensagens comuns (poucas caem na resposta genérica)", () => {
  const g = playerCareer(3);
  const unk: string[] = [];
  for (const m of MSGS) { const a = analyze(g, m, []); if (["desconhecido", "pergunta", "zoeira", "sim", "nao"].includes(a.top)) unk.push(`${a.top}: ${m}`); }
  expect(unk.length, unk.join(" | ")).toBeLessThanOrEqual(5);
});
