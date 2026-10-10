---
title: Star Restauret (restaurante gastronômico)
date: 2026-10-10
tags: [pratica, 3d, webgl, cliente]
---

# Star Restauret (restaurante gastronômico)

Site de restaurante de alta gastronomia em [restaurante/index.html](../restaurante/index.html). Precisa ser servido por HTTP (módulos ES e Three.js vendorizado).

**Conceito:** "o menu é uma constelação". A estrela dourada do hero se desfaz em partículas no scroll, e cada prato do menu degustação vira uma forma feita de estrelas. A outra direção, um prato 3D realista sobre a mesa, foi descartada: modelar comida procedural fica falso, e partícula combina com o nome "Star".

| Parte | Técnica | Regra |
|---|---|---|
| Hero: estrela de 8 pontas em ouro | Geometria facetada feita à mão, `flatShading`, metal com environment gerado por PMREM (quarto com softboxes) | [Fundo vivo e 3D](regras/fundo-vivo-e-3d.md) |
| Estrela → partículas | A malha some enquanto a nuvem aparece **na mesma forma** (pontos sorteados na superfície da malha, por área) | [Mundos e navegação](regras/mundos-e-navegacao.md) |
| Menu em 6 tempos | Palco *sticky* de 600vh; 16 mil pontos fazem morph entre pérola, concha, maré, cogumelo, chama e estrela | [Movimento](regras/movimento.md) |
| Depois do menu | A estrela cresce além da tela e vira o céu atrás do texto | [Fundo vivo e 3D](regras/fundo-vivo-e-3d.md) |
| Paleta | Tinta `#0d0b0a`, papel `#ece5d8`, cinza `#8a8276`, ouro `#c9a266` | [Cor e paleta](regras/cor-e-paleta.md) |
| Tipografia | Cormorant Garamond 300 (e itálico) × Instrument Sans 400/500 | [Tipografia](regras/tipografia.md) |
| Acabamento | Loader 0→100, cursor com lerp, botões magnéticos, marquee, relógio de São Paulo, wordmark na largura toda | [Detalhes de acabamento](regras/detalhes-de-acabamento.md) |
| Celular | 7 mil pontos, sem bloom, forma em cima e texto embaixo | [Performance](regras/performance.md) |

## Lições do projeto
- **Ouro precisa de ambiente para refletir.** Metal com `metalness: 1` num quarto escuro fica marrom. Um environment com gradiente quente e softboxes fortes (planos com cor > 1), gerado por `PMREMGenerator.fromScene`, faz cada faceta acender de um jeito enquanto a estrela gira.
- **Fundo da cor da marca não passa pelo pós-processamento.** O `RenderPass` limpa com `autoClear` desligado e usa a cor calculada para a tela, então o fundo sai claro demais; e o tone mapping (ACES ou Neutral) esmaga os escuros e o deixa preto. Solução: limpar o canvas em preto e usar `mix-blend-mode: screen`, para a cor de fundo vir do CSS.
- **Morph com pausa para leitura:** a fração do scroll passa por `smoothstep(.2, .8)`, então cada forma fica parada enquanto o texto é lido. Um atraso aleatório por ponto (`aRand`) e uma explosão `sin(πt)` no meio da troca dão o efeito de dissolver.
- **Forma em partícula precisa de densidade uniforme.** Fios em hélice cruzados viram uma rede; a chama só ficou boa sorteando pontos na superfície, com mais pontos onde ela é mais larga.
- **Texto atrás de 3D:** depois do herói, a nuvem cai para cerca de 12% de opacidade e cresce além da tela. Assim ela vira textura, não compete com o texto.
- **Print em renderizador por software:** o `dt` limitado deixa as transições amortecidas lentas (3–4 FPS); espere bem mais antes do screenshot ou o print mostra o meio do caminho.

Related: [Checklist de entrega](checklist-de-entrega.md) · [Ilha 3D](mundo-3d.md) · [Fundo vivo e 3D](regras/fundo-vivo-e-3d.md) · [Lusion](referencias/lusion.md)
