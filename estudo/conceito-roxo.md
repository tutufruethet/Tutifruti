---
title: Conceito roxo (site guiado pela rolagem)
date: 2026-10-16
tags: [pratica, motion, scroll]
---

# Conceito roxo

Site em [conceito-roxo/](../conceito-roxo/) que leva a linguagem do [showreel](showreel.md) para a rolagem.

- **Uma camada atravessa as cenas.** O cartão é um único elemento fixo com chaves de posição por ponto de rolagem; a cena muda em volta dele. Transição vira continuação, não corte.
- **Pilhas de z-index por cena:** `position: sticky` cria contexto de empilhamento, então cada palco tem o seu z-index (título abaixo do cartão, painel de vidro acima dele, cena clara opaca cobrindo tudo).
- **Dois easings com papéis diferentes:** expo-out para o que acontece no tempo (entrada); in-out cúbico para o que a rolagem controla (vai e volta sem tranco).
- **Cada palavra faz o que diz:** "Organize" alinha letras soltas, "Acompanhe" segue um ponto, "Planeje" se monta em colunas.
- **Máscara de linha some no fim do trajeto:** ao parar no meio da rolagem, acentos e descendentes sobravam fora da máscara; zerar a opacidade nos últimos 6% resolve.
- **Vidro precisa de algo atrás:** o desfoque só convence com o cartão passando por trás do painel.
- **Fontes locais não carregam em `file://`** (CORS): servir por HTTP.

Related: [Movimento](regras/movimento.md) · [Fundo vivo e 3D](regras/fundo-vivo-e-3d.md) · [Showreel em código](showreel.md)
