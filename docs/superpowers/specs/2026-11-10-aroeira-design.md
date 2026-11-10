# Aroeira: landing de casa de temporada com hero 3D — spec de design

Data: 2026-11-10 · Estado: aguardando revisão

## 1. Objetivo

Uma landing page da **Aroeira**, casa de temporada fictícia em Ilhabela, em que o hero é a própria casa em 3D: o visitante começa dentro do living e o scroll leva a câmera para fora, sobre a piscina, até a vista de drone.

Pronto quando:

- o roteiro do hero (4 etapas, textos do briefing) anda junto com a câmera, sem travar;
- as oito seções do briefing existem e funcionam em 1440 px e 375 px, sem rolagem horizontal;
- a página faz sentido sem WebGL e com `prefers-reduced-motion`;
- `npm run build` passa e o console fica limpo;
- o checklist de `estudo/checklist-de-entrega.md` passa.

## 2. Decisões já tomadas

| Decisão | Escolha | Quem decidiu |
|---|---|---|
| Dois briefings em conflito | Um site só: a Aroeira, com hero 3D em tempo real no lugar do vídeo | usuário |
| Finalidade | Demo fictícia, com os textos e preços do briefing | usuário |
| Origem da casa 3D | Procedural em código, sem assets externos | usuário (aprovou o desenho) |
| Framework | Vite sem framework; sem React, R3F ou Tailwind | usuário (aprovou o desenho) |
| Renderer | WebGL2 com `WebGLRenderer`; WebGPU fica fora | suposição minha |
| Fotos das seções | Stills tirados da própria cena 3D | usuário (aprovou o desenho) |

Nota: "Fable 5.2" é o modelo que escreve o código, não um ambiente de execução. O site roda em qualquer navegador atual; não há requisito de compatibilidade além disso.

## 3. Referências

Vieram de busca na web; as descrições são dos próprios estúdios e não foram conferidas nos sites.

| Site | O que funciona | O que levo |
|---|---|---|
| Likova (Vide Infra, Site of the Day Awwwards) | Modelo WebGL do prédio que gira, planta do terreno explorável, layout que se remonta no scroll | Modelo como herói e exploração livre com saída óbvia |
| ERA (Vide Infra; FWA, CSSDA e Awwwards segundo o estúdio) | Rastros de luz em WebGL, seletor visual de apartamentos | Conteúdo escolhido dentro da cena (pontos clicáveis nos cômodos) |
| Silver Pinewood Residences (Awwwards SOTD, out/2025) | Uma única peça 3D carrega a identidade do site | Uma cena só, usada no hero e nas fotos |
| AIR (Vide Infra, Awwwards SOTD, mar/2026) | Uma linha de luz em WebGL como fio condutor | O sol e a luz âmbar como fio entre hero, "Um dia" e o fecho |
| Estudo de caso de Hon Tran (júri Awwwards) | Câmera guiada por scroll com GSAP conduzindo o comprador pelo imóvel | O padrão do hero: scroll → progresso → câmera na curva |

## 4. Stack

- Vite, HTML, CSS e JS puros, em `aroeira/`. `base: './'` para rodar em qualquer subpasta.
- Dependências com versão travada (`npm i -E`): `three`, `gsap`, `lenis`, `@fontsource-variable/archivo`, `@fontsource-variable/jetbrains-mono`.
- De `three/examples/jsm`: `EffectComposer`, `RenderPass`, `UnrealBloomPass`, `ShaderPass`, `OutputPass`, `OrbitControls`. Nada além disso.
- Testes de lógica com `node --test` (sem dependência).
- `dist/` não entra no repositório.

## 5. Estrutura

```
aroeira/
  index.html                 todas as seções
  vite.config.js
  scripts/stills.cjs         gera os stills a partir da cena (Playwright global)
  public/img/                stills .webp; favicon.svg
  src/
    main.js                  ordem de inicialização
    data/casa.js             fonte única de dados
    styles/tokens.css, base.css
    sections/                nav, hero, facts, rooms, day, material, rates, route, faq, close (.css)
    lib/                     funções puras testadas
      progress.js            remap do pin, etapa atual
      calendar.js            grade de um mês
      quality.js             escolha do nível de qualidade
    three/
      stage.js               renderer, resize, DPR, loop, pausa fora da tela
      house.js               geometria da casa e dos móveis
      materials.js           materiais PBR e texturas em canvas
      environment.js         céu, sol, mata, pedras, mar, aroeira
      particles.js           poeira e névoa
      post.js                bloom + passe final
      camera-path.js         curva da câmera e presets
      explore.js             navegação livre e pontos clicáveis
      debug.js               painel #debug
    motion/
      hero.js                pin, roteiro, ligação com a câmera
      sections.js            animações das outras seções
      mask.js                texto por linha com máscara
      nav.js                 estados da nav
      smooth.js              Lenis
  tests/                     progress, calendar, quality
```

Cada módulo de `three/` exporta uma função `create…(ctx)` e devolve `{ object3D?, update(dt, state)?, dispose() }`. Só `stage.js` conhece o renderer; só `hero.js` conhece o scroll.

## 6. Dados (`src/data/casa.js`)

Um objeto exportado, lido pelo HTML (via JS) e pela cena:

- `stages[4]`: `{ id, num, label, from, to, title[], sub?, cta? }` com as faixas do pin (0–13, 17–38, 43–62, 70–100 %).
- `rooms[4]`: `{ id, num, title, text, meta, still, caption, camera: { pos, look } }` para Living, Suítes, Varanda de jantar e Píer. O mesmo `camera` serve ao still e ao ponto clicável da exploração.
- `facts[5]`, `day[5]` (`{ hora, titulo, frase, t }` com a posição no arco), `specs[4]`, `rates[4]`, `includes[5]`, `route` (4 paradas, 3 trechos), `faq[5]`.
- `calendar`: `{ months: ['2026-11', '2026-12'], busy: [datas ISO] }`.
- `cameraPath`: lista de `{ t, pos, look, fov, focus }` em metros.

Textos, números e preços: os do briefing, sem alterar.

## 7. Cena 3D

Unidade: metro. Eixos: `+z` aponta para o mar, `+y` para cima. O vão de vidro fica em `z = 0`.

### 7.1 Casa

- **Living:** 12 m de largura, 8 m de fundo, pé-direito de 6 m. Parede do fundo com ripas de freijó (instancing), escada de concreto solta (degraus em instancing), sofá de linho, tapete, luminária.
- **Vão:** 12 m de vidro aberto; os painéis recolhidos aparecem empilhados numa das laterais.
- **Deck** de madeira, 5 m de fundo. **Piscina** de 18 m × 4 m, borda infinita do lado do mar.
- **Varanda de jantar** ao lado do living, com a mesa grande e doze cadeiras.
- **Laje superior** deslocada, com a suíte (cama, vidro, guarda-corpo) e **telhado verde**.
- **Píer** de madeira nas pedras, com escada pela encosta.
- **Aroeira** no jardim, com frutos pimenta-rosa (o único acento dentro da cena).

Geometria estática mesclada por material. Ripas, degraus, cadeiras, tábuas, árvores e pedras em `InstancedMesh`.

### 7.2 Materiais e luz

- `MeshStandardMaterial` para concreto (marca de tábua em textura de canvas, normal derivada), freijó, linho, pedra, folhagem; `MeshPhysicalMaterial` só no vidro e na água da piscina.
- Mar: plano com shader próprio (normais animadas, fresnel, reflexo do céu).
- Céu: domo com gradiente de fim de tarde. Um `PMREMGenerator` roda uma vez sobre o céu e gera o mapa de ambiente.
- Sol: uma `DirectionalLight` âmbar, baixa, do lado do mar, entrando pelo vão. Sombra colorida pela `HemisphereLight` (azul-arroxeada, nunca preta).
- Mapa de sombra renderizado uma vez (`shadowMap.autoUpdate = false`).
- Emissivos acima de 1 só em luminárias, borda do sol e frutos da aroeira, para o bloom com threshold 1.

### 7.3 Partículas

Um `Points` com shader próprio, posições animadas no vertex shader (sem atualização na CPU):

- **Poeira:** dentro do volume do living; cada grão acende quando cruza os feixes de sol.
- **Névoa do mar:** faixa baixa entre a piscina e as pedras, mais densa no trecho do drone.
- A velocidade do scroll acelera o deslocamento; o cursor afasta a poeira próxima.
- A mistura entre os dois conjuntos segue o progresso do hero.

### 7.4 Pós-processamento

`RenderPass` → `UnrealBloomPass` (threshold 1, força baixa) → passe final → `OutputPass`. O passe final junta num shader só: profundidade de campo leve (a partir da textura de profundidade, foco por etapa), aberração cromática sutil nas bordas, vinheta e grão.

### 7.5 Câmera

- Curva `CatmullRomCurve3` pelos pontos de `cameraPath`; `look`, `fov` e `focus` interpolados.
- Trajeto: dentro do living olhando para o fundo → recua em linha reta → cruza o vão e o deck → passa sobre a piscina → sobe até a vista de drone, com a casa, a mata, as pedras e o mar.
- O cursor desloca o olhar em poucos graus, com lerp de 0,08. No toque, nada.

### 7.6 Navegação livre

- Botão "Explorar a casa" na etapa 4 (ao lado de "Ver datas livres") e na seção "A casa".
- Ao entrar: o scroll suave para, os textos do hero somem, `OrbitControls` assume (arrastar, pinça, roda), com limites de distância e de ângulo para não atravessar o chão.
- Quatro pontos clicáveis (botões HTML reais, projetados sobre a cena e também listados numa barra) levam a câmera ao `camera` de cada cômodo, com legenda.
- Saída: botão "Voltar ao roteiro" e tecla Esc; a câmera volta ao ponto do scroll.

### 7.7 Níveis de qualidade

| Nível | Quando | DPR máx. | Sombra | Pós | Partículas | Árvores |
|---|---|---|---|---|---|---|
| alto | desktop com GPU dedicada ou integrada recente | 2 | 2048 | bloom + passe final completo | 6.000 | 1.500 |
| médio | celular bom, notebook fraco | 1,5 | 1024 | bloom + vinheta e grão | 3.000 | 800 |
| baixo | celular fraco, FPS abaixo de 40 por 2 s | 1 | sem | sem | 1.200 | 400 |
| sem 3D | sem WebGL2, `reduced-motion`, `saveData` | — | — | — | — | — |

A escolha inicial usa largura, `deviceMemory`, `hardwareConcurrency` e toque. Em execução, o nível só desce (nunca sobe), para não oscilar.

## 8. Hero

Seção de tela cheia presa por 450 % com `ScrollTrigger` (`scrub: 0.6`). `remap` segura o início nos primeiros 4 % e o fim nos últimos 8 %. A cada atualização: `tl.progress(p)` numa timeline pausada com o roteiro, câmera em `remap(p)`, rótulo da nav e contador.

| Pin | Câmera | Texto |
|---|---|---|
| 0–13 % | living | **AROEIRA** (~13,6vw, uma linha) + "Casa de temporada em Ilhabela. / Seis suítes, doze hóspedes, uma equipe de quatro." |
| 17–38 % | vão, deck | "● 02 · Varanda" · "DOZE METROS / DE VIDRO QUE CORREM / PARA DENTRO DA PAREDE." |
| 43–62 % | piscina | "● 03 · Piscina" · "A SALA TERMINA / NA ÁGUA." · "Piscina de 18 m com borda para a baía da Feiticeira." |
| 70–100 % | drone | "● 04 · A casa" · "1.140 M² ENTRE / A MATA E O MAR." · botões "Ver datas livres" e "Explorar a casa" |

- Títulos no canto inferior esquerdo, por máscara linha a linha; saem subindo antes do próximo.
- Bordas: nav em cima; no pé, coordenadas, "[ role para sair da casa ]" (some ao rolar), contador "01/04" e o fio de progresso em pimenta-rosa.
- Legibilidade: gradiente escuro no topo, gradiente forte no pé e um da esquerda que cresce nas etapas 2–4.
- Primeiro quadro: um `<img>` com o still do living (com `preload`) fica atrás do canvas e some quando a cena desenha o primeiro frame. O módulo 3D entra por `import()` depois disso.
- **Sem 3D:** quatro stills, um por etapa, trocando por corte; o roteiro de texto continua igual. Sem botão "Explorar a casa".

## 9. Outras seções

Como no briefing, sem cards:

1. **Faixa de dados:** cinco células entre fios.
2. **01 — A casa:** lista numerada à esquerda (~46vh por item), still preso à direita com crossfade e zoom leve, legenda em plaquinha areia; item ativo escuro com número pimenta-rosa.
3. **02 — Um dia na casa** (escuro): arco tracejado, trecho pimenta-rosa que se desenha, sol que anda com o scroll, cinco horários que acendem.
4. **03 — A construção:** still vertical que abre por cortina e anda devagar no quadro; citação, assinatura e specs.
5. **04 — Temporadas e diárias:** tabela com fios, "Inclui", calendário de nov e dez de 2026 gerado em JS.
6. **05 — Como chegar:** linha de quatro paradas que se desenha por trecho; vertical no celular.
7. **06 — Perguntas:** `<details>` com "+" que gira.
8. **07 — Reservar** (escuro): still da casa ao fundo aproximando com o scroll, formulário e rodapé com "AROEIRA" na largura inteira.

O formulário não envia nada: valida os campos e mostra a mensagem de recebido. É uma demo.

## 10. Sistema visual

- Cores do briefing: escuro `#14110e`; areia `#efe9df`, `#e6ded1`, fios `#cfc5b5`; texto `#1c1814`, secundário `#6d6458`, sobre a cena `#f6f1e8`; acento único pimenta-rosa `#c2412d`.
- Duas famílias: Archivo variável (`wdth 125`, pesos 700 e 800) e JetBrains Mono.
- Um easing só (expo-out `cubic-bezier(.16,1,.3,1)`), entradas de 0,9–1,2 s, stagger de 60–90 ms.
- Grid de 12 colunas, margem `clamp(1rem, 3vw, 2.5rem)`, filhos com `min-width: 0`.

## 11. Nav, celular e acessibilidade

- **Nav:** fixa; clara e transparente durante o pin, com a etapa atual no centro; depois, areia translúcida com blur e fio. Some ao descer, volta ao subir.
- **Celular:** nav só com logo e "Reservar"; títulos do hero quebram na largura; faixa de dados em duas colunas; "A casa" sem foto presa, cada cômodo com o próprio still; "Um dia" em lista; rota vertical; formulário em uma coluna. Nível de qualidade médio ou baixo.
- **Movimento reduzido:** sem rolagem suave, hero em stills por corte, textos sem deslocamento.
- **Acessibilidade:** canvas com `aria-hidden`; todo o conteúdo está no HTML; foco visível; pontos da exploração são botões alcançáveis por teclado; contraste AA do texto sobre os gradientes.

## 12. Stills

`scripts/stills.cjs` abre a página em `?still=<nome>` com o Playwright já instalado no ambiente. Nesse modo a cena desenha um quadro no nível alto, num tamanho fixo, e a página devolve um WebP (`canvas.toBlob`). O script grava em `public/img/`.

Lista: `hero-1` a `hero-4` (1600 × 900), `living`, `suite`, `mesa`, `pier` (1200 × 1500), `material` (1000 × 1400), `casa` (1920 × 1080). Os arquivos gerados entram no repositório.

## 13. Performance e depuração

- Metas: 60 fps no nível alto num notebook com GPU integrada recente; menos de 150 draw calls na vista de drone; JS inicial (sem three) abaixo de 60 kB gzip; chunk 3D abaixo de 220 kB gzip; stills abaixo de 1,5 MB no total.
- Render pausado com `IntersectionObserver` quando o hero sai da tela e quando a aba fica oculta.
- `#debug` na URL mostra FPS médio e pior 1 %, ms por frame, draw calls, triângulos, geometrias, texturas, heap JS (só Chrome) e o nível atual; teclas 1–3 trocam o nível.
- No README: como usar o painel, `renderer.info`, o painel Performance do Chrome, Spector.js para inspecionar draw calls e stats-gl para tempo de GPU. Nenhuma dessas ferramentas entra como dependência.

## 14. Verificação

- `node --test` para `progress.js`, `calendar.js` e `quality.js`.
- `npm run build` sem erro; console sem erro nem aviso.
- Screenshots em 1440 px e 375 px de cada seção e de cada etapa do hero, salvos no scratchpad.
- Testes manuais por script: sem WebGL, `reduced-motion`, exploração (entrar, pontos, Esc), teclado.
- Checklist de entrega do repositório.

Aviso: o ambiente de teste renderiza por software, então o FPS real não dá para medir aqui. As metas de FPS ficam para conferir numa máquina com GPU.

## 15. Documentação no repositório

- `aroeira/README.md`: como rodar, gerar stills, depurar e personalizar.
- `estudo/aroeira.md` (prática) e `estudo/referencias/imobiliario-3d.md`, ligadas por `Related:`; índice em `estudo/README.md` e link no `README.md` da raiz.

## 16. Fora do escopo

- WebGPU e TSL.
- Modelo GLB, texturas fotográficas, KTX2 e Draco (não há assets para comprimir).
- Backend do formulário, CMS, vários imóveis.
- Vídeo do hero e o módulo `frame-scroll.js` do briefing.

## 17. Desvios do briefing original

| Briefing | Aqui | Motivo |
|---|---|---|
| Hero em 160 frames de vídeo | Cena 3D em tempo real | Os frames não existem; decisão do usuário |
| React/Vue + R3F + Tailwind (JSON) | Vite sem framework | Menos bundle; o próprio JSON pede para evitar dependências desnecessárias |
| Fotos dos cômodos | Stills da cena 3D | As fotos não existem |
| Movimento reduzido com 4 quadros do vídeo | 4 stills da cena | Mesmo comportamento, outra origem |
