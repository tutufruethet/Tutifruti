---
title: Maison Odile (vídeo "websites in 2026")
date: 2026-10-22
tags: [referencia, motion, scroll]
---

# Maison Odile

Site conceito de chocolateria, visto num vídeo do TikTok (@elyptwebdesign) que o usuário mandou como "exatamente isso" para o site da Módulo. O efeito que ele quer é o da rolagem.

| Momento | O que acontece |
|---|---|
| Hero | Vídeo em tela cheia que **anda conforme a rolagem** (o cacau abre). Uma frase curta por capítulo, embaixo à esquerda: "Picked ripe.", "Six days in leaves.", "Roasted by ear." |
| Coleção | Carrossel em que o produto fica na frente de um **nome gigante** (MADAGASCAR). A **cor de fundo troca** a cada item e há um número grande no canto (72%). |
| Loja | A mesma fachada em **vários horários** (07:00 → 22:00), com um relógio grande e a luz mudando. |
| Caixa | A caixa abre vista de cima (bombons). |
| Fim | Frase forte e campo de e-mail sobre a foto do produto. |

## Como reproduzir sem 3D

- Vídeo → `ffmpeg` → quadros WebP → canvas controlado pela rolagem (90 quadros em 18 s bastam com `lerp` de 0,2).
- Carregar o 1º quadro, depois de 8 em 8, de 4 em 4 e o resto; desenhar o quadro carregado mais próximo.
- Seção `position: sticky` com altura de 400–520vh; o progresso de 0 a 1 vem do `scroll()` do Motion.
- Capítulos: frases sobrepostas no mesmo lugar, reveladas por linha; a que sai sobe e some.

Related: [Movimento](../regras/movimento.md) · [Site Módulo](../modulo-condominios.md) · [Erros que eu cometia](../regras/erros-que-eu-cometia.md)
