---
title: Performance
date: 2026-10-10
tags: [regra, performance, webgl]
---

# Performance

Performance faz parte do design.

1. `devicePixelRatio` limitado a 1,5–2 no canvas.
2. **Pausar o render fora da tela** com `IntersectionObserver`.
3. `prefers-reduced-motion`: sem animação e shader parado num frame bonito.
4. **Fallback sem WebGL:** a página precisa fazer sentido sem o canvas.
5. Assets comprimidos (KTX2, Draco, vídeo curto em loop) e geometria mesclada.
6. Cursor custom e previews só com `hover: hover`; no toque, escondidos.
7. Trabalho pesado fora da thread principal (Web Worker) e WebGL2 com fallback para WebGL1 (Active Theory).
8. **Níveis de qualidade:** detectar o celular e desligar os efeitos caros (profundidade de campo, passes de bloom) (Bruno Simon).
9. Zero bibliotecas quando o efeito cabe em poucas linhas.
10. **Renderizar sob demanda:** zero quadros em repouso (medir com um contador exposto para teste).
11. **O texto principal não espera o 3D:** `import()` dinâmico da cena; LCP é o título.
12. Compartilhar geometria e material; instanciar repetições; alternar `visible` em vez de montar/desmontar; pré-compilar materiais (`renderer.compile`).

Related: [React Three Fiber](../referencias/react-three-fiber.md) · [pmndrs/examples](../referencias/pmndrs-examples.md) · [Bruno Simon](../referencias/bruno-simon.md) · [Active Theory](../referencias/active-theory.md) · [Fundo vivo e 3D](fundo-vivo-e-3d.md) · [Movimento](movimento.md)
