---
title: SitePlan
date: 2026-10-13
tags: [pratica, ferramenta, 3d]
---

# SitePlan

Ferramenta de planejamento de sites em [siteplan/](../siteplan/README.md) (Next.js). É o primeiro projeto de **ferramenta**, não de landing page: o briefing pediu fundo claro, grafite e azul, então as regras de landing (display gigante, laranja, grid editorial) cederam ao pedido.

| Decisão | Regra |
|---|---|
| 3 neutros (`#f4f5f7`, `#e1e4e9`, `#1d2228`) + azul `#2557d6`; amarelo, verde e vermelho só para estado | [Cor e paleta](regras/cor-e-paleta.md) |
| Uma família (Instrument Sans) + mono só em slugs e no prompt | [Tipografia](regras/tipografia.md) |
| Linhas finas e superfícies planas; sombra só em diálogo, toast e item arrastado | [Erros que eu cometia](regras/erros-que-eu-cometia.md) |
| Um único easing expo-out, transições de 150–280ms (em ferramenta, movimento responde a ação) | [Movimento](regras/movimento.md) |
| 3D só num lugar: pilha isométrica de 4 planos em CSS no painel inicial | [Fundo vivo e 3D](regras/fundo-vivo-e-3d.md) |

## O que aprendi

- **Ferramenta não é landing page.** O título fica em 28–34px, rótulos em caixa normal, hierarquia por peso e cinza. Display de 12vw atrapalharia o trabalho.
- **3D simples e bonito:** planos finos empilhados com `transform-style: preserve-3d`, conteúdo de wireframe em cada camada, afastamento com lerp ao passar o mouse. Sem WebGL, sem biblioteca, parado com reduced-motion. Correção do usuário: não usar 3D para recriar fotos ou cenas difíceis.
- **Rótulo dentro do plano 3D fica ilegível**: legenda plana fora da cena.
- **Miniatura de wireframe** comunica estrutura sem fingir ser a prévia do site; avisar isso no texto.

Related: [Fundo vivo e 3D](regras/fundo-vivo-e-3d.md) · [Checklist de entrega](checklist-de-entrega.md) · [Erros que eu cometia](regras/erros-que-eu-cometia.md)
