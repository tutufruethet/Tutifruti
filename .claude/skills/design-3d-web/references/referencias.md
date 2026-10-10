# Referências estudadas

Lições de cada estúdio. Os itens "visto no código" vieram de código aberto lido de verdade; o resto vem de case studies e entrevistas.

## Índice
1. Bolt — backgrounds interativos
2. Lusion — 3D como herói
3. Bruno Simon — o portfólio é um jogo (com código)
4. Locomotive — editorial com movimento (com código)
5. Instrument — sistema e conteúdo
6. Resn — conceito antes do código
7. Active Theory — mundos 3D (com código)

## 1. Bolt (post "Make your landing page feel alive")
- Hero com **dois estados**: se mexe sozinho e reage de outro jeito ao cursor.
- Tipos de fundo: shader/gradiente, dither, "blinds" (Raycast), cena 3D guiada por scroll, vídeo com distorção em grade seguindo o mouse.
- Fonte de componentes: React Bits (MIT). O efeito deve ser contido para não competir com o texto.

## 2. Lusion
- O 3D carrega o peso visual; ~99% do texto numa só família; paleta de 4 valores.
- Truque antigo: a "cena 3D" do hero era **vídeo renderizado offline + luz pontual seguindo o cursor**. Parece tempo real.
- v3: Site of the Year 2023, com cursor reativo e animação de scroll.

## 3. Bruno Simon (folio-2025, código aberto MIT)
- Você dirige um carro por um mundo; a navegação é a experiência.
- Three.js WebGPU com fallback WebGL via TSL; física Rapier; arte no Blender; texturas KTX2; áudio Howler.
- **Visto no código:**
  - Grama: 280×280 = 78.400 lâminas de 1 triângulo, montadas no vertex shader, girando para a câmera. Grid infinito com `mod` em volta do jogador. A altura vem de ruído Perlin + aleatório + um canal da textura do terreno (onde é baixo, a lâmina some).
  - Vento: duas amostras da mesma textura de ruído em escalas diferentes, deslizando numa direção; só a ponta mexe.
  - Ciclo de 4 min com presets (dia, entardecer, noite, amanhecer): cor da luz, **cor da sombra** (roxo `#6d3fff` de dia), névoa em 2 cores.
  - Bloom com threshold 1 e força 0,25. Paleta: atlas de 128px que todos os modelos leem por UV.
  - Qualidade: no celular, sem profundidade de campo e com menos passes de bloom.
  - Game loop com ordem fixa: tempo, entrada, física, objetos, câmera, render.

## 4. Locomotive
- Editorial New (serifa) + Helvetica Now (grotesca); "só duas famílias e quatro estilos"; fonte própria PP Locomotive New.
- **Visto no código (locomotive-scroll v5):** roda sobre o **Lenis**. Parallax por `data-scroll-speed` (`progresso × janela × velocidade × −1`). Observer com `rootMargin` de 100%. Direção do scroll numa variável CSS (`--scroll-direction`).

## 5. Instrument
- Criaram Instrument Sans/Serif (abertas no Google Fonts). Escala Minor Third (×1,2) a partir de 14px; display serif de 64px com entrelinha 1,13.
- Trabalho como protagonista, navegação simples (marca, marketing, produto) e design system.

## 6. Resn
- 100 FWAs; site descrito como playground surrealista em WebGL com navegação inusitada.
- Zentry: design meses antes do site, **duas direções criativas**, tipografia customizada.

## 7. Active Theory
- Motor próprio (Hydra): Web Worker, WebGL2 com fallback, editor de cenas.
- Site v5: planejaram 3 ambientes e fizeram **8**; as transições viraram parte da diversão. Uma **tela gigante** com o reel em cada cena. Navegação por público: filtros para clientes, imersão para criativos.
- **Visto no código (build público do Hydra):**
  - Transição: cada cena é renderizada numa textura; um shader mistura as duas num **corte diagonal** cuja inclinação segue a **velocidade do scroll**, com borda distorcida por normal map. Borda suavizada com `fwidth`.
  - **Simulação de fluido real** (advecção, divergência, pressão, vorticidade) distorce a imagem final onde o mouse passa.
  - Composição global: separação RGB, contraste, bloom, raios de luz, **brilhos nos cantos** com ruído e vidro fosco.
  - Segurar o clique: zoom leve, escurece e aumenta o vidro fosco.
  - Texto em WebGL (MSDF), revelado **embaralhando letras**; UI em mono caixa alta; menu em pílula com brilho.
  - Todo shader tem `uMobile` para ajustar a intensidade.
