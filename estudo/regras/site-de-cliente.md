---
title: Site de cliente com material real
date: 2026-10-16
tags: [regra, conteudo, cliente]
---

# Site de cliente com material real

Quando o site é de um negócio de verdade (loja, serviço), a honestidade do conteúdo vale mais que o efeito.

1. **Material real primeiro.** Fotos e vídeos do cliente, sem banco de imagem que finja outra realidade (ex.: supercarro numa loja de seminovos).
2. **Não deduzir dado pela foto.** Ano, versão, km, preço e até a carroceria (Logan e Sandero têm a mesma frente) ficam `null` até o cliente confirmar. Marca visível no emblema pode; modelo pela aparência, não.
3. **Prévia × público.** O mesmo código gera duas versões: a prévia mostra tudo com selo "Demonstração"/"Pendente" e `noindex`; a pública esconde o que não foi confirmado. Uma página `/previa/` lista o que falta, gerada a partir do conteúdo.
4. **Nenhum botão falso.** Sem número de WhatsApp, o botão aparece desativado e marcado na prévia e some no público. Nunca um número fictício.
5. **Sobreposições de post fora.** Tarjas de preço, @ e slogans ("a melhor loja") são recortados das fotos e do vídeo, sem cortar pessoa nem parte importante do carro.
6. **Pessoa sem nome inventado.** Quem aparece nas fotos humaniza a página, mas não ganha nome, cargo ou história que o cliente não deu.
7. **Copy sem promessa.** Nada de "aprovação garantida", garantia, tempo de mercado ou "melhor da região" sem prova. FAQ comercial (troca, financiamento) fica pendente até a confirmação.
8. **Logo:** se só existe em foto de baixa resolução, usar wordmark tipográfico provisório e pedir o arquivo, sem redesenhar o símbolo.

Related: [Montalvão Motors](../montalvao-motors.md) · [Erros que eu cometia](erros-que-eu-cometia.md) · [Checklist de entrega](../checklist-de-entrega.md)
