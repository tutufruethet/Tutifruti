---
title: Brasa 47
date: 2026-10-13
tags: [pratica, site, 3d, loja]
---

# Brasa 47

Site de hamburgueria (marca fictícia) em [brasa47/](../brasa47/index.html): cardápio, monte o seu em 3D, carrinho, pedido pelo WhatsApp, conta com cartão de carimbos, cupons, avaliações e área da loja. Precisa ser servido por HTTP (usa módulos e o Three.js de `mundo/vendor`).

## Plano

- **Briefing manda na cor:** preto `#0d0b0a`, vermelho queimado `#7a2314` (só em blocos grandes: a história) e laranja-brasa `#ff6b1f` (ações e o fogo). Osso `#f2ebe3` e cinza `#a0958c` para texto.
- **Tipo:** Big Shoulders Display (letreiro industrial de Chicago, em caixa alta só nos títulos) + Archivo para o resto.
- **A coisa grande:** o hambúrguer 3D montado camada por camada, com brasas subindo. O mesmo modelo aparece no "monte o seu" e vira as fotos do cardápio.

| Parte | Como | Regra |
|---|---|---|
| Hambúrguer 3D | Geometria procedural: torno (`LatheGeometry`) para o pão, cilindro deformado por ruído para o blend, plano que escorre para o queijo, instâncias para gergelim e cebola crispy | [Fundo vivo e 3D](regras/fundo-vivo-e-3d.md) |
| Montagem | Cada camada cai com expo-out e 70 ms de atraso; a câmera enquadra a altura da pilha | [Movimento](regras/movimento.md) |
| Fotos do cardápio | Um renderizador fora da tela fotografa cada hambúrguer uma vez (WebP), quando o cardápio chega perto | [Performance](regras/performance.md) |
| Luz | Sombra vermelho-queimado, nunca preta; luz de brasa por baixo que pisca | [Bruno Simon](referencias/bruno-simon.md) |
| Loja | `localStorage` com eventos entre abas: o admin muda o preço ou o status e o site atualiza na hora | `web-design-guidelines` |
| Sem WebGL | Página inteira funciona; só some o 3D e as fotos | [Performance](regras/performance.md) |

## Lições
- **`display:flex` num `<dialog>` deixa ele aberto.** O estilo sobrescreve o `display:none` do fechado. Use `dialog[open]{display:flex}`.
- **Máscara de reveal corta acento em caixa alta.** "MEMÓRIA" perdeu o acento no `overflow:hidden`. Dê `padding-top:.12em` e margem negativa igual na máscara.
- **Em loja, o topo não some ao rolar.** O botão do pedido precisa estar sempre à mão. A regra de esconder o menu ao descer vale para sites editoriais.
- **Sem foto real, o 3D vira a foto.** Melhor que foto de banco ou imagem inventada, e mantém tudo coerente.
- **Teste com Playwright:** em botões de rádio estilizados (input transparente por cima), use `check()` em vez de `click()` no texto. E cuidado com dois campos de mesmo `name` na página.

Related: [Checklist de entrega](checklist-de-entrega.md) · [Feira](feira.md) · [Ilha 3D](mundo-3d.md) · [Skills de design no GitHub](referencias/skills-do-github.md)
