---
title: Ilha do Cauê
date: 2026-10-10
tags: [pratica, 3d, webgl]
---

# Ilha do Cauê

Site de presente para um amigo do 6º ano em [caue/index.html](../caue/index.html). Reaproveita o motor da [Ilha 3D](mundo-3d.md) (carro, física de círculos, grama, ciclo de dia) com outro conteúdo.

| Parte | Decisão | Regra |
|---|---|---|
| Estações | Cada coisa que ele gosta virou um lugar: campo com gol, pista de bike com rampa, piscina, parquinho | [Mundos e navegação](regras/mundos-e-navegacao.md) (cenas vindas do cliente) |
| Jogo | Gol, salto e tchibum contam num placar; o placar aparece no HUD, numa placa 3D e no site | Conteúdo dentro do mundo |
| Rampas | O chão tem altura (`groundAt`); subir a rampa vira velocidade vertical e o carro decola na crista | [Bruno Simon](referencias/bruno-simon.md) |
| Piscina | O chão afunda dentro da água: o carro cai, espirra e volta para a borda | Física simples, efeito grande |
| Acento | Verde-grama `#1fbf5b` tem contraste baixo no papel: vira **marca-texto atrás da palavra** e fundo de botão com texto escuro, nunca cor de texto no claro | [Cor e paleta](regras/cor-e-paleta.md) |
| Frases | Num arquivo só (`caue/js/dados.js`), usadas no site, na placa 3D e no modal | |

## Lições
- **Público criança não pede design infantil:** o site segue as mesmas regras (2 fontes, 1 acento, grid). A diversão fica no mundo 3D, nas cores dos objetos e no retorno imediato (toast "Gol!", confete).
- **Marca-texto com pseudo-elemento:** `text-decoration` e `background` no inline usam a caixa da fonte inteira e ficam abaixo da linha de base. Um `::after` com `bottom` em `em` acerta a altura.
- **Teste com passo fixo:** no renderizador por software o site roda a ~2 fps. `ilha.sim(segundos, controles)` (em `#debug`) avança a física em passos de 1/60 s, então dá para testar gol, salto e piscina sem depender do FPS.
- **Estado de jogo zera na troca de nível:** um timer de "afundando" sobrevivia à troca e teleportava o carro de volta à piscina.

Related: [Ilha 3D](mundo-3d.md) · [Mundos e navegação](regras/mundos-e-navegacao.md) · [Cor e paleta](regras/cor-e-paleta.md) · [Checklist de entrega](checklist-de-entrega.md)
