---
title: Tipografia
date: 2026-10-10
tags: [regra, design, tipografia]
---

# Tipografia

1. **No máximo 2 famílias e 4 estilos.** Lusion usa ~1 família; Locomotive, 2 famílias e 4 estilos.
2. **Contraste de escala extremo.** Display em `clamp(2.6rem, 12vw, 11rem)`, entrelinha 0,9, tracking −0,04em, contra rótulos de 12px em caixa alta com tracking +0,08em. O meio-termo é o que deixa o design sem graça.
3. **Serifa × grotesca.** Uma palavra em serifa itálica dentro de um título sans dá voz sem cor (estilo Locomotive). *Use com parcimônia:* destacar uma única palavra virou o tique mais comum de página gerada; prefira tratar o título inteiro como objeto tipográfico.
4. **Escala com razão fixa para corpo e UI.** Ex.: ×1,2 a partir de 14px (Instrument). O display fica fora da escala, como exceção intencional.
5. **Títulos grandes têm tracking negativo**; texto pequeno em caixa alta tem tracking positivo.
6. **Par pronto e gratuito:** Instrument Sans + Instrument Serif (Google Fonts). Mas escolha pelo assunto: um par "seguro" usado em todo projeto vira assinatura de template.
7. **Caixa alta só quando o rótulo carrega informação**; legenda de seção em caixa alta acima de todo título é cromo de template.
8. Preço e tabela com `tabular-nums`; fontes auto-hospedadas com `font-display: swap` e licença junto (OFL).

Related: [Frontend Design](../referencias/frontend-design.md) · [Locomotive](../referencias/locomotive.md) · [Instrument](../referencias/instrument.md) · [Lusion](../referencias/lusion.md) · [Grid e espaço](grid-e-espaco.md)
