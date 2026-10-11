---
title: Painel do PC
date: 2026-10-11
tags: [pratica, dashboard, dataviz]
---

# Painel do PC

App em [painel/index.html](../painel/index.html): finanças, assinaturas, cuidados, desempenho e "o que roda". Sem dependências; dados no `localStorage` com backup em JSON. O script [coletar-specs.ps1](../painel/coletar-specs.ps1) lê as specs do Windows.

| O que aprendi aplicando as regras num painel | Regra |
|---|---|
| Display gigante só na abertura de cada aba; o resto é número grande (um por tela) e rótulo de 12px | [Tipografia](regras/tipografia.md) |
| Acento só onde pede ação: mês atual no gráfico, saldo negativo, atrasado, disco cheio. Saídas em cinza, não em vermelho | [Cor e paleta](regras/cor-e-paleta.md) |
| Item nunca marcado não é "atrasado": em neutro, senão o painel abre gritando | [Erros que eu cometia](regras/erros-que-eu-cometia.md) |
| SVG de gráfico com `viewBox` na largura real do contêiner, senão o texto do eixo escala junto | [Performance](regras/performance.md) |
| Rádio escondido com `opacity:0`, não `display:none`, para teclado e testes alcançarem | [Checklist de entrega](checklist-de-entrega.md) |

Related: [Demo Tutifruti](demo-tutifruti.md) · [Grid e espaço](regras/grid-e-espaco.md) · [Checklist de entrega](checklist-de-entrega.md)
