---
title: "Bolt: backgrounds interativos"
date: 2026-10-10
tags: [referencia, 3d, fundo]
aliases: [Bolt]
---

# Bolt: backgrounds interativos

Post *"Make your landing page feel alive (without becoming a motion designer)"*, de Jakub Skrzypczak (mar/2026).

| Ideia | Detalhe |
|---|---|
| **Dois estados de movimento** | O hero se mexe sozinho (ambient) e reage *de outro jeito* quando o cursor entra. Parado ≠ morto. |
| Tipos de fundo | shader/gradiente vivo, dither, "blinds" no estilo Raycast (SaaS), cena 3D guiada por scroll (produto), vídeo com camada de distorção em grade que segue o mouse. |
| Sutileza | Exemplo citado: o site da Microsoft AI, com efeito contido. O fundo não compete com o texto. |
| Componentes | **React Bits** (MIT): backgrounds animados sem vídeo, em JS/TS × CSS/Tailwind. |
| Fluxo | Copiar o componente, pedir "use como background" e ajustar velocidade, cor e intensidade até ficar discreto. |

**Lição:** um fundo vivo é barato (um shader de tela cheia) e muda a percepção da página inteira.

Fonte: [bolt.new/blog/interactive-backgrounds-landing-pages](https://bolt.new/blog/interactive-backgrounds-landing-pages)

Related: [Fundo vivo e 3D](../regras/fundo-vivo-e-3d.md) · [Movimento](../regras/movimento.md) · [Lusion](lusion.md)
