---
title: Bruno Simon
date: 2026-10-10
tags: [referencia, 3d, portfolio]
---

# Bruno Simon

Folio 2025, código aberto em [brunosimon/folio-2025](https://github.com/brunosimon/folio-2025) (MIT, exceto o servidor).

| Aspecto | O que faz |
|---|---|
| Conceito | Você dirige um carrinho por um mundo; projetos e contato são lugares. **A navegação é a experiência.** |
| Render | Three.js **WebGPU** com fallback WebGL via **TSL**, que gera WGSL ou GLSL do mesmo código. |
| Física | **Rapier** (antes, Cannon.js na versão 2019). |
| Arte | Modelada no **Blender**; faces escondidas removidas e geometria mesclada. **Cor via textura-paleta**: cada modelo lê a cor por UV num atlas pequeno. |
| Escala | ~**78.400 lâminas de grama**, cada uma **um único triângulo**. |
| Sistemas | Ciclos de dia, de ano e de clima; vento, grama, folhas, água; bloom em TSL. |
| Assets | Texturas KTX2 (**ETC1S/UASTC**), GLTF comprimido, áudio com **Howler.js**. |
| Processo | Devlogs públicos e prazo fixo para lançar e não ajustar para sempre. |

**Lição:** 3D bonito na web é otimização de assets + low-poly com paleta controlada + muitas instâncias simples, e não modelos pesados.

Fontes: [Case study](https://www.awwwards.com/brunos-portfolio-case-study.html) · [Devlog 4: Water & Trees](https://www.youtube.com/watch?v=MXpML0B2MJc)

Related: [Fundo vivo e 3D](../regras/fundo-vivo-e-3d.md) · [Performance](../regras/performance.md) · [Lusion](lusion.md)
