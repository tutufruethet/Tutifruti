---
title: Fundo vivo e 3D
date: 2026-10-10
tags: [regra, 3d, webgl]
---

# Fundo vivo e 3D

1. **Dois estados:** o fundo se mexe sozinho e reage ao cursor (e ao scroll) de outro jeito.
2. **Contido:** o texto continua legível; usar overlay em gradiente e vinheta.
3. **3D é herói ou não entra.** Se é decoração, um shader 2D resolve. Em site de cliente, só com pedido explícito: o usuário prefere foto/vídeo real com efeito de rolagem ([Site Módulo](../modulo-condominios.md)).
4. **Truques baratos que parecem caros:**
   - shader de tela cheia com um único triângulo (fbm + domain warping + grão);
   - vídeo pré-renderizado + luz que segue o cursor (Lusion);
   - atlas de paleta em vez de texturas (Bruno Simon);
   - instancing de geometria simples (78 mil triângulos de grama).
5. **Atmosfera em presets:** cor da luz, **cor da sombra** (nunca preta: roxo ou azul) e névoa em gradiente de 2 cores, interpoladas por keyframes (Bruno Simon).
6. **Bloom só no emissivo:** threshold 1 e força baixa, para brilhar só o que é luz.
7. **Campos infinitos:** muitas instâncias simples que se repetem com `mod` em volta da câmera.
8. **Stack:** Three.js (WebGPU + TSL com fallback WebGL), Rapier para física, Blender para modelar, KTX2/Draco para comprimir.
9. **Prontos para usar:** React Bits (MIT) para backgrounds animados.

Related: [Mundos e navegação](mundos-e-navegacao.md) · [Lusion](../referencias/lusion.md) · [Bruno Simon](../referencias/bruno-simon.md) · [Bolt: backgrounds interativos](../referencias/bolt-backgrounds-interativos.md) · [Performance](performance.md)
