---
title: Skills de design no GitHub
date: 2026-10-13
tags: [referencia, skills, design]
---

# Skills de design no GitHub

Skills abertas para agentes que escrevem sites. Lidas para o site [Feira](../feira.md).

| Skill | Repositório | O que eu tirei |
|---|---|---|
| `frontend-design` | anthropics/skills | Partir do assunto, não do estilo. Plano curto (4–6 cores, fontes, wireframe em ASCII) revisado contra os padrões genéricos antes do código. Ousadia num lugar só. |
| `web-design-guidelines` | vercel-labs/agent-skills | Lista de checagem: foco visível, `…` em vez de `...`, `tabular-nums`, `Intl` para datas, estado na URL, `touch-action`, nada de `transition: all`. |
| `baseline-ui` | ibelick/ui-skills | Gradiente e brilho só com motivo, um acento por tela, `text-wrap: balance` nos títulos. |
| `fixing-motion-performance` | ibelick/ui-skills | Animar só `transform` e `opacity`; ler o layout uma vez e depois escrever. |
| `ui-ux-pro-max` | nextlevelbuilder/ui-ux-pro-max-skill | Banco de paletas e pares de fontes por tipo de produto (útil para fugir do par de sempre). |

Listas com dezenas de outras: VoltAgent/awesome-agent-skills, travisvn/awesome-claude-skills, ComposioHQ/awesome-claude-skills.

## Os "sinais de página gerada" (frontend-design)

A skill lista o que quase toda página feita por IA repete. Vários estavam nas minhas próprias regras:

1. Fundo creme com serifa alta e acento terracota.
2. **Quase preto com um único acento vermelhão ou verde-ácido** (era a paleta da [Demo Tutifruti](../demo-tutifruti.md): `#0b0b0c` + `#ff4d1f`).
3. Layout de jornal: filetes finos, zero arredondamento, colunas densas.
4. Kit de SaaS: cards iguais, mesma sombra, gradiente de enfeite.
5. **Enfeites de template:** rótulo em caixa alta acima de todo título, metadados com ponto do meio ("A · B"), "PALAVRA — fragmento", fonte mono em rótulos, "→" no fim dos links, numeração (01) (02) quando o conteúdo não é sequência.

Não são proibidos; são escolhas automáticas. Quando o pedido deixa um eixo livre, não gaste essa liberdade com eles.

## Conflitos com as minhas regras

- [Tipografia](../regras/tipografia.md) pedia rótulos de 12px em caixa alta e [Grid e espaço](../regras/grid-e-espaco.md) pedia `(01) — Seção` nos cantos. A skill aponta os dois como sinal de template. Agora: rótulo em caixa normal, numeração só quando o conteúdo é uma sequência.
- [Cor e paleta](../regras/cor-e-paleta.md) continua valendo (3 neutros + 1 acento), mas a paleta da demo não é a padrão: cada projeto tira as cores do próprio assunto.

Related: [Feira](../feira.md) · [Erros que eu cometia](../regras/erros-que-eu-cometia.md) · [Cor e paleta](../regras/cor-e-paleta.md) · [Tipografia](../regras/tipografia.md)
