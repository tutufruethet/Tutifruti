---
title: Ecctrl
date: 2026-10-13
tags: [referencia, 3d, fisica, controle]
---

# Ecctrl

Controladores com física para r3f + Rapier: [pmndrs/ecctrl](https://github.com/pmndrs/ecctrl) (MIT). Lido: `src/character/Ecctrl.tsx`, `src/curves/CurveLUT.ts`, `src/shared/Math.ts`, `src/input`.

| Técnica | Como faz |
|---|---|
| Personagem flutuante | Cápsula sustentada por uma **mola-amortecedor** sobre um raio/shape-cast até o chão: `F = k·(alvo − distância) − c·velocidade` (`springK` 80, `dampingC` 6), aplicada como impulso `F·dt` |
| Andar | Impulso num ponto acima do centro, proporcional à massa; ação e reação empurram a plataforma de baixo |
| Rampa | Ângulo máximo (`slopeMaxAngle`); acima dele vira "ar" (sem atrito de chão) |
| Equilíbrio | Torque de mola para manter a cápsula em pé (`autoBalance`) |
| Taxa de quadros | Correção `60 × timestep`; corpo **dormindo** pula o processamento |
| Curvas | Hermite com tangente e peso → **tabela (LUT)** assada uma vez, lida por índice no loop |
| Tempo | `TimeControl` pausa o mundo e avança à mão: câmera lenta, bullet time |
| Toque | Joystick e botões em DOM, ligados a stores; dá para trocar a UI inteira |

**Lição:** controle bom é física simples bem amortecida + refs em vez de estado reativo.

Related: [Bruno Simon](bruno-simon.md) · [Mundos e navegação](../regras/mundos-e-navegacao.md) · [Movimento](../regras/movimento.md)
