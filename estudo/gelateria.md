---
title: Gelateria (validação das skills)
date: 2026-10-13
tags: [pratica, 3d, design, testes]
---

# Gelateria (validação das skills)

Demo em [gelateria/index.html](../gelateria/index.html): monte uma casquinha de até 3 bolas em 3D e reserve a retirada. Feita para testar as [skills](README.md) na prática. Precisa ser servida por HTTP.

| Parte | Técnica | De onde veio |
|---|---|---|
| Plano | Assunto, tokens, layout em ASCII e teste do genérico antes do código | [Frontend Design](referencias/frontend-design.md) |
| Paleta | cacau, morango-leite, caramelo + pistache (acento); cores dos sabores são conteúdo | [Cor e paleta](regras/cor-e-paleta.md) |
| Tipo | Shrikhand (letreiro de sorveteria) + Atkinson Hyperlegible Next (legível no sol) | [Tipografia](regras/tipografia.md) |
| Quadro de preços | Pontilhado ligando item e preço: dispositivo do balcão que carrega informação | [Frontend Design](referencias/frontend-design.md) |
| 3D | Bola por deslocamento de icosaedro soldado, casquinha por torno, calda por clone deformado, granulado instanciado, estúdio `RoomEnvironment`, `NeutralToneMapping`, sombra blob | [pmndrs/examples](referencias/pmndrs-examples.md) |
| Movimento | Bola cai com mola (sub-passos fixos) e squash; câmera enquadra a pilha; arrastar com inércia; loop dorme | [Ecctrl](referencias/ecctrl.md) · [React Three Fiber](referencias/react-three-fiber.md) |
| Estado | Reducer puro, URL compartilhável, favoritos no `localStorage`, horários e `.ics` testados no Node | [Superpowers](referencias/superpowers.md) |
| Testes | Unidade (28), fumaça, animação, repouso, funcional, axe, teclado, 5 larguras, reduced motion, sem WebGL | [react-three-examples](referencias/react-three-examples.md) |

## O que os testes e os prints pegaram
- **Diálogo com duas telas ao mesmo tempo:** `.feito { display: grid }` vencia o atributo `hidden`. Todos os testes de texto e foco passaram; só o print mostrou. Correção: `[hidden] { display: none !important }`.
- **"Monte a sua copinho":** texto dinâmico sem concordância. Só o print do segundo estado mostrou.
- **Casquinha cobrindo o título** no desktop e o palco cobrindo a 2ª linha no celular: título na frente do canvas, câmera deslocada com `setViewOffset`.
- **Copiar link** sem a montagem quando o estado era o padrão: link canônico montado do estado.
- **Contraste do wordmark** (2,2:1) e alvo de 28 px na marca: caramelo mais escuro (3,8:1) e alvo de 44 px.
- **Tirar a 1ª bola recriava as outras:** casar por ordem de sabor, não por índice.
- **Título esperando o three.js:** revelado no primeiro quadro; 3D por `import()` dinâmico.

## Números (Chromium headless, WebGL por software)
247 KB com gzip no total (three.js: 171 KB); 6–9 chamadas de desenho; 14–48 mil triângulos; 0 quadros em repouso; LCP < 100 ms local.

Related: [Checklist de entrega](checklist-de-entrega.md) · [Erros que eu cometia](regras/erros-que-eu-cometia.md) · [Ilha 3D](mundo-3d.md)
