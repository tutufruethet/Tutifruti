---
title: Montalvão Motors
date: 2026-10-16
tags: [pratica, cliente, video]
---

# Montalvão Motors

Site de loja de veículos em [montalvao/](../montalvao/README.md): landing, catálogo com filtros na URL, página de cada veículo e página institucional. Next.js estático + Tailwind 4.

| Parte | Decisão | Regra |
|---|---|---|
| Abertura com o Reels da loja (vertical) | Desktop: texto à esquerda, vídeo num painel alto à direita (sem esticar). Celular: vídeo no topo (68% da tela) com gradiente, texto embaixo | [Fundo vivo e 3D](regras/fundo-vivo-e-3d.md) |
| Recorte do vídeo | 760×1460 do canto superior esquerdo: tira a tarja de preço e o @. Trecho escolhido quadro a quadro para ninguém ficar cortado ao meio na borda | [Site de cliente](regras/site-de-cliente.md) |
| Loop sem emenda | Reordenar os trechos (6,8–8,6 s + 2,5–6,8 s): o fim emenda no começo, e o único corte fica no meio | [Movimento](regras/movimento.md) |
| Título | Máscara por linha só no desktop; no celular o título quebra natural e entra inteiro (linhas forçadas deixavam "carro" sozinho) | [Movimento](regras/movimento.md) |
| Paleta | Preto/grafite, papel quente, cinza, dourado `#B79556` (escurecido para `#7A5F2E` em texto sobre fundo claro, 5,4:1) | [Cor e paleta](regras/cor-e-paleta.md) |
| Tipografia | Uma família (Archivo variável): largura 112% nos títulos, 100% no texto. Wordmark do rodapé em `cqi` para caber na largura | [Tipografia](regras/tipografia.md) |
| Cards | Proporção 4:5: as fotos da loja são verticais e 4:3 cortava a cabeça das pessoas | [Site de cliente](regras/site-de-cliente.md) |
| Conteúdo | Modo prévia × público, `/previa/` com pendências, nada deduzido da foto | [Site de cliente](regras/site-de-cliente.md) |

Lições técnicas:
- **Tailwind 4:** classe própria fora de `@layer components` ganha das utilities (`hidden` não escondia `.botao`). Toda classe própria vai em `@layer`.
- **Print de página inteira** redimensiona a janela e reinicia animações de entrada: desligar animações (CSS injetado) antes do `fullPage`, senão o título "some" no print.

Related: [Site de cliente](regras/site-de-cliente.md) · [Checklist de entrega](checklist-de-entrega.md) · [Erros que eu cometia](regras/erros-que-eu-cometia.md)
