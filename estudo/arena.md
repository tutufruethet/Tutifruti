---
title: VR Arena Janga (o chute)
date: 2026-10-10
tags: [pratica, 3d, webgl]
---

# VR Arena Janga (o chute)

Site do campo de futebol society VR Arena Janga (Paulista, PE), em [arena/index.html](../arena/index.html): campo, bar e restaurante, deck, piscina e bangalôs, festas e espaço kids. A primeira versão (uma arena de realidade virtual) partiu do nome errado; o usuário corrigiu: VR Arena é um **society**.

**Conceito (duas direções, escolhida a B):** A) cenas separadas com cortes; B) **o chute**: os refletores acendem, o jogador coloca a bola no gramado, recua, corre e chuta; a câmera segue a bola até a rede e sobe para a vista aérea. Depois o scroll voa pelo complexo.

| Parte | Técnica | De onde veio |
|---|---|---|
| Jogador | Corpo de `LatheGeometry` (tronco, membros afinando), uniforme preto e dourado numa textura de canvas (número 10 nas costas), cabelo de icosaedro deformado; poses escritas à mão e misturadas por `smoothstep` | [Bruno Simon](referencias/bruno-simon.md) |
| Bola | Gomos desenhados no shader: 12 pentágonos pretos + 20 hexágonos brancos (células do icosaedro truncado), costura onde as duas células mais próximas empatam | — |
| Abertura | Planos fixos inspirados em duas fotos de referência do usuário (colocar a bola; o chute), depois câmera que persegue a bola, para antes do gol e sobe | [Mundos e navegação](regras/mundos-e-navegacao.md) |
| Rede do gol | Segmentos de linha empurrados no vertex shader no ponto do impacto, com mola amortecida | — |
| Grama | Lâminas montadas no vertex shader que leem a mesma textura das linhas do campo; borracha que espirra no chute | [Ilha 3D](mundo-3d.md) |
| Lugar | Montado a partir das fotos do lugar: muro com plantas e luzes de chão, rede verde, prédio de dois andares (bar embaixo, deck com pergolado em cima), piscina verde-escura refletindo as luzes, bangalôs, pergolado de festas | [Active Theory](referencias/active-theory.md) |
| Conteúdo | Fotos reais e imagens de projeto entram por cima da cena; as de projeto levam a etiqueta "Projeto" | [Mundos e navegação](regras/mundos-e-navegacao.md) |

## Lições do projeto
- **Pergunte o que é o negócio antes de desenhar.** O nome "VR Arena" levou a um site de realidade virtual; era um campo de society.
- **Foto de atleta famoso não entra.** Fotos de agência têm direito autoral, e a imagem do jogador no site de um negócio sugere patrocínio. A referência vira pose, nunca pixel.
- **Imagem de projeto é etiquetada.** Render do que ainda vai existir não pode passar por foto do lugar.
- **Opacidade em dois lugares, de novo:** um `opacity:.7` no rótulo anulou o fade de entrada. Para texto mais fraco, use cor com alfa.
- **Array de uniform no shader tem tamanho fixo:** passar menos itens que o declarado quebra o render (`toArray` de `undefined`).
- **Brilho especular amplo vira lençol branco:** reflexo de lua baixa ou de muitas luzes numa superfície ondulada precisa de expoente alto (milhares), ou a água fica clara.
- O gancho `#debug` com `at(t)` (posicionar a abertura num instante) e `step(n)` deixou testar a coreografia quadro a quadro no renderizador por software.

Related: [Ilha 3D](mundo-3d.md) · [Mundos e navegação](regras/mundos-e-navegacao.md) · [Fundo vivo e 3D](regras/fundo-vivo-e-3d.md) · [Erros que eu cometia](regras/erros-que-eu-cometia.md) · [Checklist de entrega](checklist-de-entrega.md)
