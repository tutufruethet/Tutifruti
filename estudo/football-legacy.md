---
title: Football Legacy (app de jogo)
date: 2026-11-02
tags: [pratica, app, jogo]
---

# Football Legacy (app de jogo)

Simulador de carreira de futebol em [football-legacy/](../football-legacy/README.md) (Next.js). Primeiro uso das regras numa **interface densa** (tabelas, chat, painel), não numa landing page.

| Parte do app | Regra aplicada |
|---|---|
| Grafite `#0e100f`, papel `#ecebe6`, cinza `#8b8f8a`, verde `#3ee27f` só em ação principal, item ativo e dado do usuário | [Cor e paleta](regras/cor-e-paleta.md) |
| Instrument Sans + JetBrains Mono; rótulos mono 11px caixa alta; título de cada tela em display com tracking −0,04em | [Tipografia](regras/tipografia.md) |
| Seções com índice `(A)`, `(01)` nos cantos; listas em linhas de 1px em vez de cards com sombra | [Grid e espaço](regras/grid-e-espaco.md) |
| Hierarquia por opacidade (`dim`, `faint`) em vez de cores de status | [Cor e paleta](regras/cor-e-paleta.md) |
| Um easing (expo-out) em entradas, barras e hover; `prefers-reduced-motion` desliga tudo | [Movimento](regras/movimento.md) |

## O que aprendi
- **Em app denso, o display grande vai só no título da tela.** No resto, a convicção vem do contraste entre número mono grande (placar, overall) e rótulo pequeno.
- **Placar grande em fonte mono fica feio** (zero com ponto). Números gigantes usam a fonte sans com `tabular-nums`; a mono fica para tabelas e rótulos.
- **Tailwind v4: classes próprias fora de `@layer components` vencem os utilitários.** Um `.btn { display: inline-flex }` solto anulava `hidden sm:inline-flex`. Toda classe de componente vai em `@layer components`.
- **Rolagem horizontal no celular vinha de filhos de grid** com `min-width: auto`. Regra base `.grid > * { min-width: 0 }` resolveu painel, tabela e chat de uma vez.
- **Cor de status é tentação constante** (vitória verde, derrota vermelha, lesão vermelha). Resolvi com forma: vitória = bloco cheio no acento, empate = bloco cinza, derrota = só contorno.

Related: [Erros que eu cometia](regras/erros-que-eu-cometia.md) · [Checklist de entrega](checklist-de-entrega.md) · [Grid e espaço](regras/grid-e-espaco.md) · [Tipografia](regras/tipografia.md)
