---
title: NEXUS OS (prática)
date: 2026-10-12
tags: [pratica, 3d, webgl, interface]
---

# NEXUS OS (prática)

Sistema operacional virtual em [nexus-os/](../nexus-os/README.md): um quarto 3D (React Three Fiber) com um OS de verdade no monitor, que também abre em tela cheia.

| Parte | Técnica | Regra |
|---|---|---|
| Paleta | Briefing de 5 cores reduzido a 3 neutros + ciano; azul e roxo viram luz e cor da sombra no 3D | [Cor e paleta](regras/cor-e-paleta.md), [Fundo vivo e 3D](regras/fundo-vivo-e-3d.md) |
| Tipo | Instrument Sans + JetBrains Mono (a mono substitui a serifa: terminal e metadados) | [Tipografia](regras/tipografia.md) |
| OS no monitor | DOM real via `<Html transform>`, resolução lógica 1280×800, portais presos à tela | [Mundos e navegação](regras/mundos-e-navegacao.md) |
| Dois caminhos | Quarto 3D ou desktop 2D direto (e fallback sem WebGL2) | [Mundos e navegação](regras/mundos-e-navegacao.md) |
| Movimento | Mesmo easing; 180 ms na interface, ~1 s na câmera | [Movimento](regras/movimento.md) |
| Performance | `frameloop="demand"`, pausa com aba escondida, presets com DPR ≤ 2 | [Performance](regras/performance.md) |

## Lições do projeto
- **O `<Html>` do Drei some se o alvo muda depois de montar:** ele recria a raiz React no mesmo elemento e o conteúdo é descartado. Passar um `portal` fixo resolve.
- **Com `frameloop="demand"`, o DOM do `<Html>` monta depois dos primeiros quadros:** é preciso pedir um quadro (`invalidate`) quando o conteúdo monta, senão a transformação 3D nunca é aplicada.
- **Câmera da visão geral depende da proporção da tela:** no celular em retrato, afastar a câmera até o monitor caber.
- **Gancho `?debug` de novo:** os testes leem fase da câmera e o retângulo projetado da tela, sem depender do FPS do renderizador por software (lição da [Ilha 3D](mundo-3d.md)).

Related: [Mundos e navegação](regras/mundos-e-navegacao.md) · [Ilha 3D](mundo-3d.md) · [Checklist de entrega](checklist-de-entrega.md)
