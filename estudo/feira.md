---
title: Feira
date: 2026-10-13
tags: [pratica, site]
---

# Feira

Calendário das frutas da época em [feira/index.html](../feira/index.html). Sem dependências; fontes na pasta do site. Feito seguindo as [skills de design do GitHub](referencias/skills-do-github.md).

## Plano (antes do código)

- **Assunto:** feira livre. Placa de papelão escrita à mão, etiqueta de preço fluorescente, o feirante anunciando o que chegou.
- **Cor:** kraft `#d6c19b`, papel `#e7d9bd`, carvão `#26221c`, acento rosa de etiqueta `#ff2d87`. Fugi do preto + vermelhão das outras páginas.
- **Tipo:** Bricolage Grotesque (largura 75%, 800) para tudo + Caveat Brush só onde seria escrito à mão (dicas, nota, etiqueta).
- **A coisa grande:** o nome do mês ocupando a largura, com uma etiqueta rosa colada ("13 frutas na época").

| Parte | Regra ou skill |
|---|---|
| Herói em três frases: "Chegaram agora…", "Seguem firmes…", "Últimas semanas de…"; o verbo apagado, a fruta acesa | Hierarquia por opacidade ([Cor e paleta](regras/cor-e-paleta.md)) |
| Mês e marca do rodapé ajustados à largura com uma leitura e uma escrita | `fixing-motion-performance` |
| Régua de meses fixa; setas trocam o mês; mês na URL (`?mes=fev`) | `web-design-guidelines` |
| Tabela com barra de 12 meses; fora da época fica apagada; "Volta em mar" calculado | [Grid e espaço](regras/grid-e-espaco.md) |
| Uma entrada orquestrada (mês, palavras, etiqueta) com expo-out; troca de mês responde ao clique | [Movimento](regras/movimento.md) · `frontend-design` |
| Ruído do papelão em SVG estático | [Performance](regras/performance.md) |

## Lições
- **Acento em toda fruta que chegou virou confete.** Seis etiquetas rosas no herói apagaram o acento. Uma etiqueta só, com um número, segura a página.
- **Tracking negativo forte quebra a Bricolage em tamanho grande:** as letras se encostam. Em display, −0,01em basta.
- **Ajustar à largura precisa de teto:** "maio" ocuparia a tela inteira. Limite pela altura (metade da janela).

Related: [Skills de design no GitHub](referencias/skills-do-github.md) · [Checklist de entrega](checklist-de-entrega.md) · [Demo Tutifruti](demo-tutifruti.md)
