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

## Visto no código (folio-2025, lido em 2026-10-10)

| Técnica | Como ele faz |
|---|---|
| Grama | **280 × 280 = 78.400 lâminas**, cada uma **um triângulo**. A forma é montada no *vertex shader* (ponta + dois cantos) e gira para **sempre encarar a câmera**. O campo é um **grid infinito**: a posição usa `mod` em torno do jogador, então as mesmas lâminas se repetem em volta dele. |
| Altura da grama | Ruído Perlin + aleatório por lâmina + um canal da **textura do terreno** (onde o canal é baixo, a lâmina some). O terreno é "pintado" numa imagem. |
| Vento | Duas amostras da **mesma textura de ruído** em escalas diferentes, deslizando numa direção. Só a ponta da lâmina se mexe. A força vem do clima. |
| Ciclo dia/noite | 4 minutos por ciclo. **Presets** (dia, entardecer, noite, amanhecer) com cor da luz, **cor da sombra**, duas cores de névoa e intensidade, interpolados por keyframes. |
| Cor | Sombras **coloridas** (roxo `#6d3fff` de dia, `#2f00db` à noite), névoa em **gradiente de duas cores** (ciano → lilás) e um atlas de paleta de 128px para todos os modelos. Chão coral, objetos roxos e luzes amarelas. |
| Brilho | Bloom com **threshold 1**: só o que é emissivo (lanternas, faróis) brilha. Força baixa (0,25). |
| Qualidade | Dois níveis: no celular (detectado pelo user agent) fica sem profundidade de campo e com menos passes de bloom. |
| Ordem | Um *game loop* com ordem fixa: tempo, entrada, física, objetos, câmera, render. Cada sistema se inscreve com uma prioridade. |

**Lição:** 3D bonito na web é otimização de assets + low-poly com paleta controlada + muitas instâncias simples, e não modelos pesados.

Fontes: [Case study](https://www.awwwards.com/brunos-portfolio-case-study.html) · [Devlog 4: Water & Trees](https://www.youtube.com/watch?v=MXpML0B2MJc)

Related: [Fundo vivo e 3D](../regras/fundo-vivo-e-3d.md) · [Performance](../regras/performance.md) · [Lusion](lusion.md)
