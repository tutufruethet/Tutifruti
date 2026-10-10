---
title: Locomotive
date: 2026-10-10
tags: [referencia, design, tipografia]
---

# Locomotive

Agência de Montreal; o site do estúdio foi Site of the Month no Awwwards.

| Aspecto | O que fazem |
|---|---|
| Tipografia | **Editorial New** (serifa editorial) + **Helvetica Now** (grotesca). Fonte própria **PP Locomotive New** (com Pangram Pangram), variante da Editorial New. |
| Sistema | Segundo o estúdio, "só **duas famílias** e **quatro estilos**". |
| Scroll | **Locomotive Scroll**, biblioteca deles: parallax, sticky, animações on-scroll, às vezes sincronizado com **GSAP**. |
| Micro-interação | No case Editorial New, o usuário mexe com a tipografia (eixos variáveis). |
| Postura | "Design e código são só ferramentas para nos expressarmos." |

## Visto no código (locomotive-scroll v5, lido em 2026-10-10)

- A v5 roda **em cima do Lenis**: o scroll suave é do Lenis (com `lerp`, `duration` e `easing`), e a Locomotive cuida dos gatilhos e do parallax.
- **Parallax** com `data-scroll-speed`: o deslocamento é `progresso × altura da janela × velocidade × −1`. Um número por elemento, sem JS extra.
- O observer usa `rootMargin` de **100%** para já calcular o parallax um pouco antes de o elemento entrar na tela.
- A demo grava a **direção do scroll** numa variável CSS (`--scroll-direction`: 1 ou −1), e o CSS reage a ela.

**Lição:** serifa editorial × grotesca neutra dá personalidade sem precisar de cor. Um sistema mínimo aplicado com rigor parece mais premium que dez estilos.

Fontes: [Reinventing Locomotive](https://www.awwwards.com/case-study-reinventing-locomotive-r.html) · [Fonts In Use](https://fontsinuse.com/uses/61459/locomotive-portfolio-website-and-visual-ident) · [Editorial New](https://locomotive.ca/en/work/editorial-new)

Related: [Tipografia](../regras/tipografia.md) · [Movimento](../regras/movimento.md) · [Instrument](instrument.md)
