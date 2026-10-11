---
title: Ilha 3D (prova real)
date: 2026-10-10
tags: [pratica, 3d, webgl]
---

# Ilha 3D (prova real)

Portfólio em dois níveis em [mundo/index.html](../mundo/index.html): o **nível 1** é a página editorial; o **nível 2** é uma ilha em Three.js com um carro para dirigir até os outdoors das fotos.

| Parte | Técnica | De onde veio |
|---|---|---|
| Grama | 72.900 triângulos montados no vertex shader, campo infinito com `mod`, vento por ruído, carro empurra as lâminas | [Bruno Simon](referencias/bruno-simon.md) |
| Atmosfera | 4 presets (dia, entardecer, noite, amanhecer), sombra colorida pela luz hemisférica, céu e névoa em gradiente | [Bruno Simon](referencias/bruno-simon.md) |
| Luz | Bloom com threshold 1; postes com halo falso no chão (textura aditiva, sem luz real) | [Fundo vivo e 3D](regras/fundo-vivo-e-3d.md) |
| Física | Círculos com impulso feitos à mão; letras e pinos caem na direção da batida e levantam depois | [Bruno Simon](referencias/bruno-simon.md) |
| Conteúdo | Fotos em outdoors dentro do mundo; à noite acendem como telas | [Active Theory](referencias/active-theory.md) |
| Navegação | Dois caminhos: lista de séries no nível 1 leva o carro direto à estação | [Mundos e navegação](regras/mundos-e-navegacao.md) |
| Transição | Corte diagonal na troca de nível | [Active Theory](referencias/active-theory.md) |
| Celular | Menos grama, sombra menor, sem bloom, joystick e botões na tela | [Performance](regras/performance.md) |

## Lições do projeto
- **Testar 3D no renderizador por software é lento:** o carro anda a poucos quadros por segundo. Um gancho de teste (`#debug`) que expõe carro, física e ciclo permite rodar a física passo a passo e posicionar a câmera, sem depender do FPS.
- **Grama precisa cobrir a vista, não o carro:** a câmera inclinada mostra mais chão à frente. Centralizar o campo um pouco à frente do carro e esmaecer a borda evita o "disco de grama".
- **Névoa forte apaga o nível 1:** a câmera do nível 1 fica longe; a névoa precisa de near/far diferentes por nível.
- **Three.js vendorizado** (sem CDN) deixa o site funcionar no GitHub Pages e offline.

Related: [Atlas do universo](universo-3d.md) · [Checklist de entrega](checklist-de-entrega.md) · [Demo Tutifruti](demo-tutifruti.md) · [Mundos e navegação](regras/mundos-e-navegacao.md)
