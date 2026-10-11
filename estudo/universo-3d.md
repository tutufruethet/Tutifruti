---
title: Atlas do universo (explorador 3D)
date: 2026-10-11
tags: [pratica, 3d, webgl]
---

# Atlas do universo (explorador 3D)

Explorador em [universo/index.html](../universo/index.html): três escalas (galáxia → sistema → planeta), 5 sistemas e 17 planetas inventados. Usa o Three.js vendorizado da [Ilha 3D](mundo-3d.md).

**Conceito.** Duas direções ([Resn](referencias/resn.md)): *nebulosa colorida realista* × *atlas litográfico* (tinta, papel, cinza e um laranja). Escolhi o atlas: segue a [paleta](regras/cor-e-paleta.md) e não parece mais um espaço genérico roxo-azul. O acento só aparece no núcleo da galáxia, na estrela laranja, nos planetas vulcânicos e na borda da transição.

| Parte | Técnica | De onde veio |
|---|---|---|
| Galáxia | 170 mil pontos num draw call, braços em espiral com dispersão gaussiana, poeira em pontos grandes quase transparentes | [Fundo vivo e 3D](regras/fundo-vivo-e-3d.md) |
| Planetas | 5 tipos no mesmo shader (simplex + fbm): rochoso, gasoso, gelado, oceânico, vulcânico; atmosfera por fresnel; sombra roxa, nunca preta | [Bruno Simon](referencias/bruno-simon.md) |
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
- **Teste no renderizador por software:** `#debug-still` desliga o laço; `atlas.step(n)` avança a simulação e só desenha o último quadro.

Related: [Ilha 3D](mundo-3d.md) · [Mundos e navegação](regras/mundos-e-navegacao.md) · [Fundo vivo e 3D](regras/fundo-vivo-e-3d.md) · [Checklist de entrega](checklist-de-entrega.md)
