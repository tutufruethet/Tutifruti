# Estudo: design e 3D na web

Cinco referências: três focadas em 3D (Bolt, Lusion, Bruno Simon) e duas em design (Locomotive, Instrument). O objetivo é tirar regras práticas que eu consiga repetir, não só admirar os sites.

> **Como foi feito:** a política de rede do ambiente bloqueou o acesso direto aos 5 domínios (`curl` e fetch retornaram 403/DNS). O estudo foi feito a partir de case studies oficiais, do repositório aberto do Bruno Simon, das listagens no Awwwards e no Fonts In Use, e do post do Bolt. Os pontos marcados com *(fonte antiga/terceiros)* podem não refletir a versão atual do site. Para inspecionar o CSS e o JS ao vivo, os domínios precisam ser liberados em *Network access* do ambiente.

---

## 1. Bolt: backgrounds interativos em landing pages

Post: *"Make your landing page feel alive (without becoming a motion designer)"*, de Jakub Skrzypczak (mar/2026).

| Ideia | Detalhe |
|---|---|
| **Dois estados de movimento** | O hero se mexe sozinho (ambient) e reage *de outro jeito* quando o cursor entra. Parado ≠ morto. |
| Tipos de fundo | shader/gradiente vivo, dither, "blinds" no estilo Raycast (SaaS), cena 3D guiada por scroll (produto), vídeo com camada de distorção em grade que segue o mouse. |
| Sutileza | Exemplo citado: o site da Microsoft AI, com efeito contido e controlado. O fundo não compete com o texto. |
| Fonte de componentes | **React Bits** (MIT): backgrounds animados sem vídeo, em JS/TS × CSS/Tailwind. |
| Fluxo | Copiar o componente, pedir "use como background" e ajustar parâmetros (velocidade, cor, intensidade) até ficar discreto. |

**Lição:** um fundo vivo é barato (um shader de tela cheia) e muda a percepção da página inteira. A regra é *ambient sempre + resposta ao cursor, sem competir com a tipografia*.

---

## 2. Lusion: estúdio de 3D em tempo real

| Aspecto | O que fazem |
|---|---|
| Papel do 3D | O 3D é o herói e carrega o peso visual. A tipografia e a UI são deliberadamente enxutas para não brigar com ele. |
| Tipografia | ~99% do texto numa **única família** (relato do BTS do projeto Oryzo). |
| Paleta | **4 valores** (Oryzo). O site do estúdio aparece no Awwwards com paleta preto/branco. |
| Interação | Cursor reativo e animação de scroll, destaques citados no Lusion v3 (Site of the Year 2023 + Developer Award). |
| Truque barato que parece caro | Numa versão antiga do site, a "cena 3D" do hero era um **vídeo renderizado offline**, com uma **luz pontual seguindo o cursor**. Parece tempo real, mas custa quase nada. Também comprimiam keyframes e decodificavam contadores de frame do vídeo dentro do shader. *(fonte antiga)* |
| Stack | three.js nas versões documentadas. Terceiros dizem que hoje é renderer próprio, sem confirmação. |

**Lição:** restrição radical (1 fonte, 4 cores) cria espaço para o 3D brilhar. E nem todo 3D precisa ser tempo real: dá para fingir com vídeo + luz interativa.

---

## 3. Bruno Simon: o portfólio é um jogo

Folio 2025, código aberto em `github.com/brunosimon/folio-2025` (MIT, exceto o servidor).

| Aspecto | O que faz |
|---|---|
| Conceito | Você dirige um carrinho por um mundo. O conteúdo (projetos, contato) são lugares do mundo. **A navegação é a experiência.** |
| Render | Three.js **WebGPU** com fallback WebGL via **TSL** (Three Shading Language), que gera WGSL ou GLSL a partir do mesmo código. |
| Física | **Rapier** (antes, Cannon.js na versão 2019). |
| Arte | Modelada no **Blender**. Faces escondidas removidas e geometria mesclada. **Cor via textura-paleta**: cada modelo lê a cor por UV num atlas pequeno, sem texturas pesadas. |
| Escala | ~**78.400 lâminas de grama**, cada uma **um único triângulo**. |
| Sistemas | Ciclos de dia, de ano e de clima; vento, grama, folhas, superfície da água; bloom em TSL. |
| Assets | Texturas KTX2 (**ETC1S/UASTC**), GLTF comprimido (Draco na versão antiga), áudio com **Howler.js**. |
| Processo | Devlogs públicos e prazo fixo para lançar e não ficar ajustando para sempre. |

**Lição:** 3D bonito na web é **otimização de assets** + **estilo low-poly com paleta controlada** + **muitas instâncias simples** (um triângulo × 78 mil), e não modelos pesados.

---

## 4. Locomotive: design editorial com movimento

| Aspecto | O que fazem |
|---|---|
| Tipografia | **Editorial New** (serifa editorial) + **Helvetica Now** (grotesca). Fonte própria **PP Locomotive New** (com Pangram Pangram), variante da Editorial New. |
| Sistema | Segundo o próprio estúdio, "só **duas famílias** e **quatro estilos**". |
| Scroll | **Locomotive Scroll**, biblioteca deles: parallax, elementos sticky, animações on-scroll, às vezes sincronizado com timeline do **GSAP**. |
| Micro-interação | No case Editorial New, o usuário mexe com a tipografia (eixos variáveis). |
| Reconhecimento | Site do estúdio foi Site of the Month no Awwwards. |
| Postura | "Design e código são só ferramentas para nos expressarmos." |

**Lição:** o contraste **serifa editorial × grotesca neutra** dá personalidade sem precisar de cor. Um sistema mínimo (2 famílias, 4 estilos) aplicado com rigor parece mais "premium" que dez estilos.

---

## 5. Instrument: agência de marca e produto

| Aspecto | O que fazem |
|---|---|
| Tipografia | Criaram a família **Instrument Sans / Instrument Serif** (com type designer chileno e o time do Google Fonts), **aberta no Google Fonts**. |
| Escala | **Minor Third (×1,2)** a partir de **14px**; display serif em **64px**, entrelinha **1,13**. *(extração de terceiros)* |
| Conteúdo | Cases de grandes marcas (EA, Oura, ServiceNow, design system da Nike, Uber for Business). O trabalho é o protagonista. |
| Serviços | Divididos em três: marca, marketing, produto. Navegação simples. |
| Posição | Design Studio Agency of the Year 2026 (Campaign US). Escrevem sobre por que constroem design systems. |

**Lição:** design de agência top é **sistema** (escala tipográfica com razão fixa, tokens, poucas regras) + **conteúdo forte**. Os efeitos ficam em segundo plano.

---

## 6. O que eu aprendi: regras que vou seguir

### Erros que eu cometia
- Gradiente genérico roxo→azul, cards com sombra e `border-radius` em tudo.
- Tudo centralizado e títulos tímidos (2–3rem).
- Muitas cores e muitos estilos de texto.
- Emojis como ícones, "glassmorphism" sem motivo.
- `fade-in` genérico de 0,3s com `ease`.

### Regras
1. **Restrição primeiro.** 1–2 famílias, no máximo 4 estilos de texto. Paleta de **3 neutros + 1 acento**.
2. **Contraste de escala extremo.** Display em `clamp(3.5rem, 11vw, 11rem)`, entrelinha 0,9, tracking −0,04em, contra rótulos de 12px em caixa alta. O meio-termo é o que deixa o design sem graça.
3. **Serifa × grotesca.** Uma palavra em serifa itálica dentro de um título sans (estilo Locomotive) dá voz sem cor.
4. **Escala com razão fixa.** Ex.: ×1,2 (Instrument) para corpo e UI. O display fica fora da escala, como exceção intencional.
5. **Grid de 12 colunas assimétrico.** Textos pequenos ancorados em colunas, alinhados à esquerda, com **muito espaço vazio**. Números de índice `(01)` e metadados nos cantos.
6. **Movimento com assinatura.** Entradas com easing **expo-out** `cubic-bezier(.16,1,.3,1)`, 0,9–1,2s, stagger de 60–90ms. Texto revelado **por linha, com máscara** (`overflow:hidden` + `translateY(110%)`). Cursor e hover com **lerp** de 0,08–0,15, nunca colados. Linear só no marquee.
7. **Fundo vivo, mas contido.** Ambient sempre + reação ao cursor. O texto precisa continuar legível (overlay/vignette).
8. **3D é herói ou não entra.** Truques baratos: shader de tela cheia (1 triângulo), vídeo pré-renderizado + luz no cursor, atlas de paleta, instancing.
9. **Performance faz parte do design.** DPR ≤ 1,5–2; pausar render fora da tela (`IntersectionObserver`); `prefers-reduced-motion`; fallback sem WebGL.
10. **Detalhes que dão acabamento:** loader com contador, relógio local no rodapé, cursor custom (só com mouse), botões magnéticos, marquee, wordmark gigante no footer, `mix-blend-mode: difference` no menu fixo.

### Checklist antes de entregar
- [ ] Quantas fontes/estilos? (≤ 2 / ≤ 4)
- [ ] Quantas cores? (≤ 4 + acento)
- [ ] O título principal ocupa a tela com convicção?
- [ ] Existe hierarquia clara em 3 segundos?
- [ ] O alinhamento segue o grid? Tem espaço vazio de verdade?
- [ ] Toda animação usa o mesmo easing e o mesmo ritmo?
- [ ] O fundo/3D deixa o texto legível?
- [ ] Funciona com `reduced-motion`, no toque e sem WebGL?
- [ ] Funciona bem em 375px de largura?

---

## 7. Demo

`demo/index.html` aplica as regras acima numa página só, sem dependências (WebGL puro):
shader de fundo com domain-warping que reage ao cursor e ao scroll, título com revelação por linha, manifesto que acende palavra por palavra no scroll, lista de projetos com preview que segue o cursor, botões magnéticos, marquee, loader com contador e rodapé com relógio e wordmark gigante.

## Fontes
- [Bolt: Make your landing page feel alive](https://bolt.new/blog/interactive-backgrounds-landing-pages)
- [Lusion v3 no Awwwards](https://www.awwwards.com/sites/lusion-v3) · [Case study Lusion (SOTM)](https://www.awwwards.com/case-study-for-lusion-by-lusion-winner-of-site-of-the-month-may.html) · [Oryzo BTS: UX/UI](https://blog.lusion.co/oryzo-bts-part-3-7-website-ux-ui-and-illustrations)
- [brunosimon/folio-2025](https://github.com/brunosimon/folio-2025) · [Bruno's Portfolio Case Study](https://www.awwwards.com/brunos-portfolio-case-study.html) · [Devlog 4: Water & Trees](https://www.youtube.com/watch?v=MXpML0B2MJc)
- [Reinventing Locomotive (Awwwards)](https://www.awwwards.com/case-study-reinventing-locomotive-r.html) · [Fonts In Use: Locomotive](https://fontsinuse.com/uses/61459/locomotive-portfolio-website-and-visual-ident) · [Editorial New](https://locomotive.ca/en/work/editorial-new)
- [Instrument: Work](https://www.instrument.com/work/) · [Refero: Instrument style](https://styles.refero.design/style/dcd215e5-3511-4e40-87ff-95c095f44ad6) · [Why we build design systems](https://www.designsystems.com/why-we-build-design-systems-an-agencys-perspective/)
