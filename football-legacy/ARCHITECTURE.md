# ARCHITECTURE — Football Legacy

## Visão geral
```
src/
  engine/            motor do jogo: TypeScript puro, sem React, testável em Node
    types.ts         GameState (um único objeto JSON serializável)
    rng.ts           gerador determinístico (mulberry32) com estado salvo no jogo
    constants.ts     posições, pesos de atributos, formações, calendário, países
    world/           geração do universo, jogadores, valor de mercado, evolução
    match/           escalação automática e motor de partidas
    season/          calendário, competições, aplicação de resultados, avanço, fim de temporada
    market/          transferências, contratos, IA de mercado
    career/          modo jogador, modo treinador, decisões narrativas, conquistas
    chemistry/       relações, duplas e trios (Football Chemistry)
    chat/            Vestiário: intenções, contexto, personalidade, memória, gatilhos
    news/            feed de notícias
    game.ts          criação de carreira (fachada)
  store/             Zustand (estado da interface) + persistência IndexedDB
  app/               rotas Next.js (App Router); /api/chat é a única rota de servidor
  components/        casca do jogo, partida, sobreposições, componentes base
  lib/view.ts        consultas derivadas para as telas
```

## Decisões
1. **Estado único e mutável dentro do motor.** O `GameState` é um objeto JSON; o motor muda o objeto e a store só incrementa um contador de versão para redesenhar. Isso evita copiar ~3.400 jogadores a cada dia e mantém a simulação rápida (~12 ms por dia simulado).
2. **Determinismo.** Toda aleatoriedade passa por `Rng`. O estado do gerador fica em `g.rng`; cada partida usa uma semente derivada do id do jogo (`hashSeed(seed, fixtureId)`), então a mesma partida dá o mesmo resultado se as decisões forem as mesmas.
3. **Partida passo a passo.** `createMatch` → `stepMinute` (repetido) → `finalizeMatch` → `applyMatchResult`. O modo instantâneo roda os 90 minutos de uma vez; o ao vivo chama `stepMinute` num intervalo; o interativo pausa em `ms.pending` (decisão de lance) ou deixa o usuário chamar `setTactic`/`makeSub`. A mesma função alimenta os três modos, então resultado, tabela e histórico são sempre consistentes.
4. **Balanceamento** (medido em 600 jogos da liga mais forte): 2,7 gols por jogo, 43% vitórias do mandante, 24% empates, 24 finalizações por jogo; o favorito extremo vence ~82% (nunca 100%). Contra-ataques garantem que o time mais fraco também finalize.
5. **Calendário.** Temporada de 364 dias começando em 1º de agosto. Ligas aos sábados, copas e continentais às quartas, datas FIFA com amistosos de seleções, Copa das Nações no verão de temporadas pares. Janelas de transferência nas semanas 0–3, 19–23 e 43–51.
6. **Saves leves.** Jogos sem o usuário guardam só placar, gols e expulsões. O JSON (~4–6 MB) é comprimido com `CompressionStream` antes de ir para o IndexedDB.
7. **Química sem clique.** Relações só são acompanhadas no clube do usuário (as antigas ficam para reencontros). Duplas e trios são detectados toda segunda-feira. O bônus em campo é pequeno e limitado (≤ 3,5% no ataque).
8. **Conversas em duas camadas.**
   - **Local (offline):** `intents.ts` normaliza o texto (gírias, abreviações, letras repetidas, erros com distância de edição) e pontua ~40 intenções; `context.ts` reúne **apenas fatos reais** do estado (próximo jogo, último resultado, propostas existentes, banco, lesão, memórias); `responder.ts` escolhe a reação pela personalidade e pela relação; `style.ts` aplica o jeito de escrever. Anti-repetição por personagem e por turno.
   - **IA avançada (opcional):** a interface manda à rota `/api/chat` os fatos, perfis, memórias e o rascunho local. O servidor chama o modelo com a chave do ambiente (`ANTHROPIC_API_KEY`), saída em JSON estruturado, e o modelo só reescreve as falas. Relações, memórias e ações continuam decididas pelo motor local, então a IA não muda regras nem inventa fatos. Limites: diário no jogo (configurável) e por minuto no servidor.
9. **Memória.** Cada personagem guarda até 24 fatos com peso e data; a relevância decai com o tempo. O resumo (6 fatos mais relevantes) vai para o contexto da IA e para respostas locais (ex.: lembrar uma promessa de ficar).
10. **Preparado para nuvem.** `SaveBackend` (persist.ts) isola o armazenamento; uma implementação remota pode entrar sem mudar o motor. Nada de conta/login agora.

## Rodando
```bash
npm install
npm run dev          # desenvolvimento
npm test             # testes do motor (Vitest)
npm run build && npm start
```
IA avançada (opcional): defina `ANTHROPIC_API_KEY` no ambiente do servidor. Variáveis extras: `FL_AI_MODEL` (padrão `claude-opus-5-5`), `FL_AI_RATE_PER_MIN` (padrão 20), `FL_AI_DISABLED=1`. A rota usa fallback do servidor em caso de recusa do modelo.

## Desempenho
- Avançar uma semana: ~80 ms num notebook comum (8 ligas, ~70 jogos, evolução de ~3.400 jogadores).
- Telas só leem o estado; listas grandes são cortadas (80 linhas) e tabelas rolam na horizontal no celular.
