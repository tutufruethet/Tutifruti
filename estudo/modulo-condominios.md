---
title: Site Módulo (administradora de condomínios)
date: 2026-10-22
tags: [pratica, cliente]
---

# Site Módulo

Site em [modulo/index.html](../modulo/index.html), feito para um cliente real. Conceito: *seu prédio, andar por andar.*

| Parte da página | Regra ou referência aplicada |
|---|---|
| Hero: drone subindo pela fachada, quadro a quadro pela rolagem | [Maison Odile](referencias/maison-odile.md) · [Movimento](regras/movimento.md) |
| Indicador de andar e relógio em odômetro, grandes no canto | [Grid e espaço](regras/grid-e-espaco.md) (metadados nos cantos) |
| Título sans com uma palavra em serifa itálica | [Tipografia](regras/tipografia.md) |
| Pastas com cor de fundo por departamento e nome gigante | [Maison Odile](referencias/maison-odile.md) · [Cor e paleta](regras/cor-e-paleta.md) (exceção documentada) |
| Diferenciais em linhas finas com prévia seguindo o cursor | [Detalhes de acabamento](regras/detalhes-de-acabamento.md) |
| Wordmark gigante no rodapé, 404 "Andar 404" | [Detalhes de acabamento](regras/detalhes-de-acabamento.md) |
| Loader só no desktop, fonte assíncrona, WebM antes de MP4 | [Performance](regras/performance.md) |

## O que aprendi neste projeto

- Correção do usuário: **nada de 3D feito por mim.** Prédio real em foto/vídeo + efeito de rolagem é o que ele quer.
- **Só prompts grátis** do Motionsites, e adaptar (VEX Ventures no hero, Build With Us no contato).
- **Se não combina, sai da lista.** Cortei o clipe de prédio de vidro azul (parecia escritório) e o vídeo de montanhas do prompt.
- O Chromium do Playwright **não toca H.264**: sempre pôr `<source>` WebM (VP9) antes do MP4.
- `display: grid` numa classe vence o atributo `hidden`: escrever `[hidden] { display: none }` para esse elemento.
- Texto revelado por máscara: esconder com `visibility: hidden` o que não está ativo, senão acentos e descendentes aparecem fora da máscara.
- Lighthouse no mobile: um loader antes do título empurra o LCP. No celular, sem loader.

Related: [Checklist de entrega](checklist-de-entrega.md) · [Erros que eu cometia](regras/erros-que-eu-cometia.md) · [Demo Tutifruti](demo-tutifruti.md)
