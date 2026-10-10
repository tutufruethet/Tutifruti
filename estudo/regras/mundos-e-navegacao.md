---
title: Mundos e navegação
date: 2026-10-10
tags: [regra, 3d, ux]
---

# Mundos e navegação

Para sites onde a experiência é imersiva (cenas 3D, mundos, jogos).

1. **Dois caminhos:** uma entrada imersiva para quem quer explorar e um atalho claro (lista, filtros) para quem quer o conteúdo agora (Active Theory).
2. **Conteúdo dentro do mundo:** projetos aparecem em objetos da cena (uma tela, um lugar, uma placa), não em cima dela (Active Theory, Bruno Simon).
3. **Várias cenas curtas** em vez de uma cena gigante; a **transição** entre elas é parte do design.
4. **Cenas vindas da marca:** lugares, objetos e cores reais do cliente (Active Theory).
5. **Conceito primeiro:** duas direções criativas, uma escolhida, decidida antes do código (Resn).
6. **Navegação inusitada, saída óbvia:** se o menu for experimental, mantenha um jeito simples de chegar ao conteúdo e ao contato.
7. **Transição como efeito:** renderize cada cena numa textura e misture as duas num shader (corte diagonal, dissolve com ruído, distorção de vidro). A transição reage à **velocidade do scroll** (Active Theory).
8. **Um shader final para tudo:** a imagem passa por uma composição global (RGB, contraste, bloom, brilhos de canto, grão). É o que dá unidade às cenas.
9. **Gestos além do clique:** segurar, arrastar e a velocidade do mouse mudam a imagem (zoom, fluido, vidro fosco).
10. **Performance é arquitetura:** trabalho pesado fora da thread principal (Web Worker), WebGL2 com fallback e alvo de LCP abaixo de 2s.

Related: [Active Theory](../referencias/active-theory.md) · [Resn](../referencias/resn.md) · [Bruno Simon](../referencias/bruno-simon.md) · [Fundo vivo e 3D](fundo-vivo-e-3d.md) · [Performance](performance.md)
