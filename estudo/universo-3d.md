---
title: Atlas do universo (explorador 3D)
date: 2026-10-11
tags: [pratica, 3d, webgl]
---

# Atlas do universo (explorador 3D)

Explorador em [universo/index.html](../universo/index.html): três escalas (galáxia → sistema → planeta), 5 sistemas e 22 planetas inventados. Usa o Three.js vendorizado da [Ilha 3D](mundo-3d.md).

**Conceito.** Duas direções ([Resn](referencias/resn.md)): *nebulosa colorida* × *atlas litográfico* (tinta, papel, cinza e um laranja). A v1 foi o atlas monocromático; o usuário achou sem vida e pediu cor. A v2 mantém a UI editorial em 3+1 e dá cor só ao mundo: cada planeta tem 3 cores + a cor do céu, as estrelas seguem a temperatura e cada sistema tem a própria nebulosa. Ver [Cor e paleta](regras/cor-e-paleta.md), regra 6.

| Parte | Técnica | De onde veio |
|---|---|---|
| Galáxia | 200 mil pontos: núcleo quente, braços azulados, aglomerados rosados, faixas de poeira escura (mistura normal, do lado côncavo dos braços) | [Fundo vivo e 3D](regras/fundo-vivo-e-3d.md) |
| Céu | Nebulosa com domain warping + poeira + 3 camadas de estrelas, desenhada **uma vez** num cubemap (custo zero por quadro) | [Performance](regras/performance.md) |
| Planetas | 5 tipos no mesmo shader (simplex + fbm): rochoso, gasoso (com grande tempestade), gelado, oceânico (praias, gelo polar, cidades à noite), vulcânico; relevo por diferenças finitas; nuvens numa casca; halo de atmosfera numa casca de trás aditiva; crepúsculo tingido; luas | [Bruno Simon](referencias/bruno-simon.md) |
| Estrela | Granulação, manchas, escurecimento do limbo, coroa e raios de difração na cor da temperatura | — |
| Anéis | Faixas no shader + sombra do planeta calculada por raio até a estrela | — |
| Transição | Cada escala é uma cena; na troca, as duas viram texturas e um dissolve de ruído nasce do centro, com a borda no acento | [Active Theory](referencias/active-theory.md) |
| Composição | Um shader final para tudo: aberração nas bordas, brilhos de canto, vinheta, grão; bloom só no HDR (threshold 1) | [Mundos e navegação](regras/mundos-e-navegacao.md) |
| Conteúdo | Rótulos presos aos objetos; ficha do planeta numa coluna editorial | [Mundos e navegação](regras/mundos-e-navegacao.md) |
| Navegação | Dois caminhos: clicar no mundo ou o **Índice** (lista que leva a câmera direto); Esc volta, ← → troca de planeta | [Mundos e navegação](regras/mundos-e-navegacao.md) |
| Celular | 70 mil pontos, sem bloom, fbm com menos oitavas, pinça para zoom, ficha vira folha de baixo | [Performance](regras/performance.md) |

## Lições do projeto
- **Rótulo ao lado, não em cima:** somar ao ponto o vetor "direita" da câmera vezes o raio do objeto. O rótulo nunca cobre o planeta.
- **Retrato precisa de câmera mais longe:** um fator `1,15 / aspecto` (até 1,7) no raio das vistas gerais faz a galáxia caber em 375px.
- **Planeta em três quartos:** ao focar, girar a câmera para o lado da estrela menos ~50°. De frente para a noite, o planeta vira um disco escuro.
- **Borda da transição fina:** borda grossa no acento domina a tela e vira mancha. Linha de ~1% da tela basta.
- **`setViewOffset` para abrir espaço ao painel:** desloca o planeta para a esquerda (ou para cima no celular) sem mexer na câmera.
- **Relevo com `dFdx` vira blocos 2×2:** a derivada de tela é constante por quadrado de 4 pixels. Diferenças finitas da altura no espaço do objeto (2 amostras a mais de fbm) deixam o relevo liso.
- **Shader caro e estático vai para textura:** o céu com 3 fbm por pixel custaria o quadro inteiro; num cubemap custa só a carga.
- **MSAA no buffer da composição** (`samples: 4` no render target do EffectComposer): sem ele, órbitas e bordas de planeta serrilham, porque o antialias do canvas não vale para o pós-processamento.
- **Teste no renderizador por software:** `#debug-still` desliga o laço; `atlas.step(n)` avança a simulação e só desenha o último quadro.

Related: [Ilha 3D](mundo-3d.md) · [Mundos e navegação](regras/mundos-e-navegacao.md) · [Fundo vivo e 3D](regras/fundo-vivo-e-3d.md) · [Checklist de entrega](checklist-de-entrega.md)
