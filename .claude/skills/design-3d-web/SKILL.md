---
name: design-3d-web
description: 'Regras de design e 3D para web tiradas do estudo de Lusion, Bruno Simon, Active Theory, Locomotive, Instrument, Resn e Bolt, com receitas de código testadas (grama em shader, ciclo dia/noite, física de círculos, bloom, revelação de texto, transições). Use SEMPRE que for criar ou melhorar qualquer site, landing page, portfólio, página de artifact, interface, hero, animação, efeito de scroll, fundo interativo, cena WebGL/Three.js, mundo 3D ou jogo no navegador, mesmo que o pedido não diga "design" ou "3D" (por exemplo "faz um site pra mim", "deixa essa página mais bonita", "quero um portfólio", "cria uma landing", "faz igual o Bruno Simon").'
---

# Design e 3D para web

Este é o sistema que saiu de um estudo de estúdios premiados. Ele existe porque, sem ele, o resultado tende ao genérico: gradiente roxo, cards com sombra, tudo centralizado, títulos tímidos. Siga as regras abaixo antes dos seus próprios padrões; elas valem mais.

Detalhes por referência estão em `references/referencias.md`. Código pronto e armadilhas estão em `references/receitas.md`. Módulos 3D reutilizáveis estão em `assets/3d/`, e a base de CSS editorial está em `assets/editorial.css`.

## 1. Antes de desenhar

1. **Defina o assunto e o trabalho da página** em uma frase. As escolhas de cor, palavra e forma saem do mundo do assunto (Tutifruti → frutas → cores de bala; fotos → outdoors).
2. **Conceito antes do código** (Resn). Pense em duas direções, escolha uma e escreva os tokens (cores, fontes, escala) no topo do CSS antes de qualquer seção.
3. **Decida o papel do 3D.** Ou ele é o herói e carrega a página (Lusion, Bruno Simon), ou não entra. Decoração resolve com um shader 2D barato.

## 2. Regras

### Tipografia
- No máximo **2 famílias e 4 estilos**. Um bom par grátis: Instrument Sans + Instrument Serif (Google Fonts). Código usa a mono do sistema.
- **Contraste de escala extremo**: display com `clamp(3rem, 10vw, 11rem)`, entrelinha 0,88–0,9 e tracking −0,045em, contra rótulos de 12px em caixa alta com tracking +0,08em.
- **Serifa itálica dentro do título sans** em uma palavra-chave ("que você *dirige.*"). Dá voz sem precisar de cor.
- Corpo e UI numa escala com razão fixa (×1,2 a partir de 14px). O display fica fora dela de propósito.

### Cor
- **3 neutros + 1 acento.** O acento aparece pouco (botão principal, uma palavra, um anel). Neutros levemente coloridos, nunca cinza puro.
- Hierarquia por **opacidade e cinza**, não por cores novas (lista apagada com o item em hover aceso).
- Em 3D, a **sombra nunca é preta**: é roxa ou azul, vinda da luz hemisférica. A névoa é um gradiente de 2 cores.

### Grid e espaço
- **12 colunas**, gutter de ~1,25rem, margem `clamp(1rem, 3vw, 2.5rem)`. Assimétrico e alinhado à esquerda.
- Muito espaço vazio: seções com `padding-block: clamp(6rem, 12vw, 10rem)`.
- Metadados nos cantos: `(01) — Seção`, ano, local, "Role ↓". Use número só quando a ordem for informação real.
- Listas em linhas com borda fina em vez de cards com sombra.

### Movimento
- **Um easing só**: expo-out `cubic-bezier(.16,1,.3,1)`, entradas de 0,9–1,2s e stagger de 60–90ms.
- **Texto revelado por linha com máscara** (`overflow:hidden` + `translateY(110%)`). Use padding inferior de 0,16em para não cortar o g e o p.
- Cursor, prévias e câmera com **lerp/damp** (0,08–0,2). Nada colado ao mouse.
- O scroll conta a história: palavras que acendem, parallax por velocidade (`data-scroll-speed`), sticky e séries horizontais.
- Linear só no marquee. Sempre respeite `prefers-reduced-motion`.

### Fundo vivo e 3D
- **Dois estados**: ambiente sozinho e reação ao cursor/scroll (Bolt). O texto continua legível com overlay em gradiente.
- **Truques baratos que parecem caros**: shader de tela cheia com 1 triângulo; foto como textura com ondulação no cursor; vídeo pré-renderizado + luz no cursor (Lusion); atlas de paleta; milhares de instâncias simples (78 mil triângulos de grama).
- **Bloom só no emissivo** (threshold 1, força baixa). Halos de luz no chão como textura aditiva, sem luz real.
- **Atmosfera em presets** (dia, entardecer, noite, amanhecer) interpolados por keyframes.
- **Um filtro final** une tudo (grão, brilho nos cantos, separação RGB leve). A Active Theory faz tudo passar por um shader global.

### Mundos e navegação (sites imersivos)
- **Dois caminhos**: a experiência para quem quer explorar e um atalho (lista, filtros) para quem tem pressa. A lista pode levar direto ao ponto do mundo.
- **Conteúdo dentro do mundo**: fotos em outdoors ou telas, placas, estações com anel no chão + aviso "Enter para abrir".
- **A transição faz parte do design**: corte diagonal, dissolve ou vidro, reagindo à velocidade do scroll.
- **Gestos além do clique**: segurar, arrastar, velocidade do mouse. Coisas que caem e levantam sozinhas.

### Performance
- DPR até 1,5–1,75. **Pause o render fora da tela.** Níveis de qualidade: no celular, menos instâncias, sombra menor e sem bloom.
- Trabalho pesado fora da thread principal quando der. Precisa de **fallback sem WebGL** (a página faz sentido sem o canvas).
- Para não depender de CDN, **vendorize o Three.js** (baixe o `.tgz` do registry do npm e copie só `build/` + os addons usados).

### Detalhes de acabamento
Loader com contador 0→100 que sobe como cortina; menu fixo com `mix-blend-mode: difference`; botões em pílula; prévia de foto que segue o cursor; marquee gigante; relógio local no rodapé; wordmark gigante ocupando a largura; sublinhado que cresce no hover.

## 3. Erros a evitar
| Erro | Em vez disso |
|---|---|
| Gradiente roxo→azul genérico | 3 neutros + 1 acento do mundo do assunto |
| Cards com sombra e `border-radius` em tudo | Linhas finas e superfícies planas |
| Tudo centralizado, títulos de 2–3rem | Grid assimétrico, display de 8–12vw |
| Emojis como ícones, glassmorphism sem motivo | Setas tipográficas (↗ ↓ →) |
| `fade-in` de 0,3s com `ease` | Expo-out de 1s, revelação por linha |
| Sombra preta no 3D | Sombra colorida pela luz hemisférica |
| 3D como papel de parede | 3D como herói ou conteúdo dentro do mundo |

## 4. Como trabalhar
1. Escreva os tokens no `:root` (cores, fontes, escala, easing). Parta de `assets/editorial.css`.
2. Monte a página seção por seção. Para 3D, parta de `assets/3d/` (`grass.js`, `cycle.js`, `physics.js`) e das receitas.
3. **Teste com prints** em 1440px e 375px (Playwright + Chromium). Para WebGL sem GPU, use `--use-angle=swiftshader`. O FPS fica baixo, então exponha um gancho `#debug` e rode a física passo a passo para testar batidas e zonas. Salve prints e scripts no scratchpad, nunca no repositório.
4. Passe pelo checklist e só então entregue.

## 5. Checklist de entrega
- [ ] ≤ 2 fontes e ≤ 4 estilos? 3 neutros + 1 acento?
- [ ] O título ocupa a tela com convicção? Hierarquia clara em 3 segundos?
- [ ] Segue o grid? Tem espaço vazio de verdade?
- [ ] Toda animação usa o mesmo easing e ritmo?
- [ ] O fundo/3D deixa o texto legível?
- [ ] Funciona com `reduced-motion`, no toque, sem WebGL e em 375px sem scroll lateral?
- [ ] Nenhum item da tabela de erros?
- [ ] Testado com prints no computador e no celular?

## 6. Entrega
- O usuário vê os resultados pelo app do Claude no celular: **entregue o site aberto como artifact** (vários arquivos via `files`, com os caminhos relativos ajustados). GitHub Pages é opcional.
- Respostas em português, curtas e diretas. Diga o que foi testado e o que não deu para testar.
- Quando aprender algo novo de design (correção do usuário ou referência nova), registre nas notas do projeto, se houver uma pasta `estudo/`, e proponha atualizar esta skill.
