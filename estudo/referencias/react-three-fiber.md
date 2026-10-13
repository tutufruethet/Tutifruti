---
title: React Three Fiber
date: 2026-10-13
tags: [referencia, 3d, react, performance]
---

# React Three Fiber

Renderer React para three.js: [pmndrs/react-three-fiber](https://github.com/pmndrs/react-three-fiber) (MIT). Lido: `packages/fiber/src/core` (loop, eventos, store) e `docs/advanced` (armadilhas, performance).

## Visto no código

| Peça | Como funciona |
|---|---|
| Loop (`loop.ts`) | Um `requestAnimationFrame` global; em `frameloop="demand"`, cada raiz tem um contador `frames`; `invalidate()` põe 1 (2 se chamado dentro de `useFrame`); o loop **para sozinho** quando todos zeram e chama os efeitos `tail` |
| Eventos (`events.ts`) | Raycast só contra objetos com handler; ordena por prioridade e distância; `stopPropagation`; o clique só vale se o objeto já estava sob o ponteiro no `pointerdown` (`initialHits`) |
| Store | Estado do canvas (tamanho, dpr, `performance.current` para regressão de qualidade) |

## Regras de performance (docs)
- Mutar no `useFrame` com `delta`; **nunca `setState` no loop** nem em `onPointerMove`.
- Ler estado rápido com `getState()`, não com seletor reativo.
- Não montar/desmontar: alternar `visible` (shaders recompilam).
- Não criar objetos no loop (`vec.set` em vez de `new Vector3`).
- `useLoader` faz cache por URL; gltfjsx gera grafo reutilizável.
- Instancing acima de algumas centenas de malhas; LOD com `<Detailed>`; carregamento em camadas com `Suspense`.
- `PerformanceMonitor` (sobe/desce dpr com limite de "flip-flops") e `regress()` durante movimento.

**Lição:** o loop que dorme e a mutação fora do React são a arquitetura; o resto é detalhe.

Related: [pmndrs/examples](pmndrs-examples.md) · [react-three-examples](react-three-examples.md) · [Performance](../regras/performance.md) · [Movimento](../regras/movimento.md)
