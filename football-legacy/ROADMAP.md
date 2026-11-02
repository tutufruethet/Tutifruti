# ROADMAP — Football Legacy

Progresso por fase. Marcado = funciona no jogo e tem teste ou foi verificado no navegador.

## Fase 1 — Pesquisa
- [x] Tentativa de acessar o Copero com Playwright, curl e leitura de matérias. **Bloqueado** pela rede do ambiente (proxy recusou `copero.net` e os sites de notícia). Registro em [docs/PESQUISA.md](docs/PESQUISA.md).
- [x] Mecânicas inferidas a partir dos resultados de busca (carreira por decisões, sem controlar o jogo, sessões curtas, grátis no navegador).

## Fase 2 — Fundação
- [x] Next.js 16 + React 19 + TypeScript + Tailwind 4 + Zustand + Recharts.
- [x] Motor separado da interface (`src/engine`), determinístico com semente.
- [x] Persistência em IndexedDB (gzip), salvamento automático, exportar/importar.
- [x] Universo fictício: 6 países com liga, 8 divisões, 128 clubes, ~3.400 jogadores, escudos procedurais.
- [x] Calendário de 52 semanas com datas reais (ago → jul).

## Fase 3 — Jogo funcional
- [x] Criação de carreira: jogador (nome, nacionalidade, idade, posição, pé, altura, estilo, clube) e treinador (qualquer clube).
- [x] Motor de partidas minuto a minuto: posse, finalizações, contra-ataques, pênaltis, cartões, lesões, cansaço, substituições da IA, decisão por pênaltis.
- [x] Três modos: instantânea, ao vivo (cronômetro 1×/2×/4×, narração) e interativa (tática e substituições no modo treinador; decisões de lance no modo jogador).
- [x] Ligas com tabela, copas nacionais, supercopas, continentais (grupos + mata-mata), Mundial de Clubes, amistosos de seleções e Copa das Nações (a cada 2 temporadas).
- [x] Acesso e rebaixamento (3 sobem / 3 caem no Brasil e na Inglaterra).
- [x] Avanço: +1 dia, +1 semana, próximo compromisso (para em partida, decisão e proposta).
- [x] Temporadas infinitas com virada automática.

## Fase 4 — Profundidade
- [x] Evolução semanal por idade, potencial, minutos, estrutura de treino, forma e lesões; declínio físico de veteranos com ganho de experiência.
- [x] Treino do jogador (foco + intensidade com risco de lesão) e do elenco (modo treinador).
- [x] Mercado: valor dinâmico, preço pedido, salário pedido, IA que compra por necessidade e orçamento, renovações, agentes livres, base anual de jovens.
- [x] Propostas ao jogador do usuário (aceitar, negociar, recusar), pedido de transferência, renovação de contrato, saída livre.
- [x] Modo treinador: escalação manual, tática, compras, vendas, renovação, dispensa, metas da diretoria, confiança, demissão, propostas de emprego.
- [x] Notícias geradas pelo estado com consequências (treinador pressionado → demissão real; promessa → reputação; lesões; títulos).
- [x] Decisões narrativas com efeito em moral, reputação, finanças, relações e memória.
- [x] Prêmios (artilheiro, craque e revelação por liga, Bola de Ouro, Chuteira de Ouro, Revelação Mundial, Treinador do Ano).
- [x] Convocações para a seleção.
- [x] Conquistas (26), recordes, linha do tempo, Hall da Fama entre carreiras, aposentadoria e virada para treinador.

## Football Chemistry (Vestiário)
- [x] Relações com amizade, confiança, entrosamento e rivalidade (0–100), com teto de variação diária.
- [x] Duplas e trios nascem sozinhos (minutos juntos, gols combinados, amizade, compatibilidade de personalidade). Níveis: Dupla, Trio Promissor, Entrosado, Lendário. Fim de uma era e Reencontro histórico.
- [x] Pequeno bônus tático em campo (máx. 3,5% no ataque) e passes mais frequentes entre parceiros entrosados.
- [x] Nomes personalizados para duplas/trios (pela interface ou pela conversa: “vai se chamar …”).
- [x] 8 personalidades persistentes com estilo de escrita (gírias, risada, emojis, caixa alta, bordão, erros de digitação).
- [x] Compreensão local de mensagens: gírias, abreviações, letras repetidas, erros de digitação (distância de edição), ~40 intenções, entidades do universo (clubes, companheiros, valores).
- [x] Memória por personagem (promessas, saídas sem aviso, apoio, ofensas, títulos juntos…), com resumo persistente.
- [x] Conversas em grupo: mais de um responde, o cauteloso contradiz o confiante com dado real, ninguém repete o colega.
- [x] Mensagens espontâneas: véspera de jogo grande, gols, derrota, banco, proposta, amigo pedindo conselho (e o conselho decide a transferência), saída do usuário, título, final perdida, aniversário, vendas, lesão, convocação.
- [x] Indicador de digitação e não lidas, com opção de desligar a animação.
- [x] Modo IA avançada opcional via rota de servidor (chave nunca no navegador), com limite diário e por minuto.

## Fase 5 — Experiência
- [x] Interface escura (grafite + verde), 2 famílias tipográficas, linhas finas, um easing.
- [x] 12 telas + criação de carreira + início com Hall da Fama.
- [x] Gráficos (overall por temporada, posição por rodada, gols/assistências).
- [x] Responsivo (1440px e 375px sem rolagem horizontal), navegação inferior no celular.
- [x] Service worker para jogar offline depois do primeiro acesso.

## Fase 6 — Validação
- [x] 32 testes (Vitest): partidas, tabelas, campeões, artilharia, virada de temporada, acesso/rebaixamento, save/load, mercado, contratos, evolução, conversas.
- [x] Carreira de jogador de 3 temporadas e de treinador de 3 temporadas simuladas nos testes.
- [x] Fluxos testados no navegador com Playwright (criação, partida interativa, Vestiário, todas as telas, modo treinador, celular).

## Próximos passos
- [ ] Mais países e segunda divisão para todos.
- [ ] Empréstimos e cláusulas de contrato.
- [ ] Editor de escudos e nomes.
- [ ] Contas, sincronização na nuvem e multiplayer (a interface `SaveBackend` já separa o armazenamento).
- [ ] Web Worker para simular semanas longas sem travar celulares mais fracos.
