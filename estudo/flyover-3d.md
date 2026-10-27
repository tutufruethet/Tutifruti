---
title: Fly-over 3D de landing page
date: 2026-10-27
tags: [pratica, 3d, video]
---

# Fly-over 3D de landing page

Filme de 14,5 s que sobrevoa uma landing page deitada num chão de estúdio e termina num cartão com título. Projeto em [video/nonna-flyover](../video/nonna-flyover/README.md), feito com a [Nonna Pizzaria](https://nonnapizzaria.vercel.app/).

O que aprendi:

1. **A câmera vem de uma curva de velocidade integrada**, nunca de posições-chave a cada meio segundo. Assim não há trancos nem paradas.
2. **O cruzeiro depende da altura da página.** O briefing previa ~770 px/s; numa página de 10.311 px precisou de ~1.400 px/s para o rodapé chegar no tempo certo. Os marcos de tempo de cada seção mudam junto.
3. **O que levanta perto da lente cobre o que está atrás.** Uma foto alta e inclinada logo abaixo de um título tapa o título; o melhor é atrasar a subida (smoothstep em vez de expo-out).
4. **Peças que "voam para a lente" precisam se mover no espaço da câmera** (desprojetar do ponto na tela + profundidade). Se só subirem no lugar, ficam para trás e nunca cruzam a borda.
5. **Sem GPU (SwiftShader) cada subframe leva ~1,5–2 s.** Stills e prévia saem na nuvem; o render final com 16 subframes vai para a máquina com GPU.
6. **Desfoque de lente em peça laranja vira mancha que parece glow.** Peças muito desfocadas funcionam melhor com cores neutras.

Related: [Fundo vivo e 3D](regras/fundo-vivo-e-3d.md) · [Movimento](regras/movimento.md) · [Performance](regras/performance.md)
