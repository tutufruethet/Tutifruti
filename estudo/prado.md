---
title: Prado (cadeira)
date: 2026-10-20
tags: [pratica, landing, scroll, copy]
---

# Prado (cadeira)

Site de uma marca fictícia de móveis em [prado/index.html](../prado/index.html), feito com a skill `site-alto-nivel`. Conceito: **"Uma cadeira, quatro estações"**. A cadeira fica e a cor da almofada muda; o prado do vídeo floresce na cor escolhida e o site inteiro troca de acento junto.

| Parte | Técnica | De onde veio |
|---|---|---|
| Atos da rolagem | 149 quadros de um vídeo do Dribbble, canvas sticky com crossfade, carregados do grosso ao fino | [Não Codei](referencias/nao-codei.md) (efeito 03) · vídeo de Lucca Frame |
| Cortes entre atos | Os quadros escuros da moita emendam trechos fora de ordem sem salto | Análise de brilho quadro a quadro |
| Celular | Quadro no alto; céu e morro estendidos com a cor média da borda | — |
| Pedido | Cores em blocos; trocar a cor toca o corte da moita na prévia; link `wa.me` com o pedido escrito | Inerres, Tidyfolk ([referências](../prado/referencias.md)) |
| Trama | Máscara circular que cresce com a rolagem sobre um vídeo em loop | [Não Codei](referencias/nao-codei.md) (efeito 05) · vídeo de Hunart |
| Texto | Palavras que acendem, palavra que gira na cor de cada estação, marquee | [Não Codei](referencias/nao-codei.md) · Magic UI |

## Lições do projeto
- **Vídeo com texto gravado:** recorte a faixa limpa (aqui, y 235 a 1030 de 1350) e complete o resto da tela com a cor média da borda.
- **Cortes escuros são emendas grátis:** um vídeo com transições por escurecimento deixa reordenar os trechos. É só ligar um quadro escuro a outro quadro escuro.
- **Degradê no canvas para "transparent" puxa para o preto:** desbote para a mesma cor com alfa 0, não para `rgba(0,0,0,0)`, ou aparece uma faixa cinza.
- **LCP depende de quando o hero fica visível:** se o texto do hero só aparece depois do JS, o LCP sobe para 6 s no celular. Deixar o hero pintado desde o início, embaixo da cortina da intro, derrubou para 2 s (Lighthouse 99).
- **Fonte não bloqueia:** Google Fonts com `preload` e `onload` em vez de `<link rel=stylesheet>`. E a intro não espera `document.fonts.ready`.
- **Palavras apagadas do efeito de preencher precisam de 3:1** (texto grande) já no estado inicial, porque o Lighthouse mede antes da rolagem.
- **Fontes que travaram:** o Motionsites não mostra os prompts sem login. Unsplash, Pexels, Pixabay e Wikimedia bloqueiam o navegador automático. O Openverse responde, mas com limite.

Related: [Processo](regras/processo.md) · [Movimento](regras/movimento.md) · [Checklist de entrega](checklist-de-entrega.md) · [Vilubre ton de](vilubre.md)
