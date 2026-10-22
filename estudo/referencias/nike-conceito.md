---
title: Nike SP (conceito)
date: 2026-10-22
tags: [referencia, scroll, motion]
---

# Nike SP (conceito)

Landing page conceito não oficial ("Todo chão é pista"), indicada pelo usuário como o padrão de scroll que ele quer: o site acompanha o movimento. Vista em [nike-two-liard.vercel.app](https://nike-two-liard.vercel.app/) em 2026-10-22.

| Aspecto | O que faz |
|---|---|
| Stack | **GSAP + ScrollTrigger** (`scrub`, `pin`) com **Lenis** para o scroll suave. |
| Palcos | Seções com um palco de `100svh` preso; o scroll troca foto, título gigante e cor de fundo dentro do mesmo palco. |
| Atos | Rótulos tipo HUD: "Ato 00 / Saída", coordenadas, "Conceito não oficial". |
| Drop | Cada produto troca a **cor do fundo inteiro** (vermelho, azul, verde, cinza) e uma palavra gigante "fantasma" atrás do tênis. |
| Loader | Contador 000→100 com o título final e uma barra fina. |
| Tipografia | Display condensada em caixa alta + mono para rótulos. |

**Lição:** o scroll não é só rolagem, é a linha do tempo. Prender o palco e trocar o conteúdo nele dá a sensação de "o site acompanha o movimento" com pouco código.

Related: [Movimento](../regras/movimento.md) · [Locomotive](locomotive.md) · [Módulo](../modulo.md)
