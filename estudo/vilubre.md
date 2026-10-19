---
title: Vilubre ton de (perfume)
date: 2026-10-19
tags: [pratica, 3d, landing, copy]
---

# Vilubre ton de (perfume)

Landing page de uma marca fictícia de perfume em [vilubre/index.html](../vilubre/index.html). O produto fica num palco 3D que muda com o scroll (como o site Adidas "CHILE 20"): o frasco num pedestal, com um anel de texto gigante e varas de luz em volta. Também tem o "digite seu nome", que grava o nome no vidro.

Rascunho. O usuário pediu para refazer tudo seguindo um vídeo de referência (site da Azul): hero claro, zoom que entra no produto e seções claras com cards.

A copy saiu da skill `copy-lp-vendas` ([copy.md](../vilubre/copy.md)), e as referências vieram dos três sites do [processo](regras/processo.md).

| Parte | Técnica | De onde veio |
|---|---|---|
| Frasco | Foto do Dribbble recortada à mão (polígono com supersampling) num plano que sempre encara a câmera | Pedido do usuário · [Dribbble: perfume](referencias/dribbble-perfume.md) |
| Essências | Shader gira o matiz em YIQ só no vidro (máscara do corpo), então a tampa dourada não muda | — |
| Nome gravado | Homografia do rosto esquerdo do frasco: o texto segue a perspectiva da foto | — |
| Palco | Anel de texto (cilindro por dentro), varas emissivas com bloom, poeira, pedestal de pedra | [Motionsites](referencias/motionsites.md) · [Fundo vivo e 3D](regras/fundo-vivo-e-3d.md) |
| Notas olfativas | Anotações presas a pontos 3D projetados, com letras que embaralham | [Não Codei](referencias/nao-codei.md) |
| Casa (removida) | 120 quadros renderizados offline em Three.js, canvas sticky com crossfade. O usuário vetou: o site é só da marca | [Movimento](regras/movimento.md) |
| Texto da dor | Palavras que acendem com o scroll | [Movimento](regras/movimento.md) |

## Lições do projeto
- **Correção do usuário: produto real vence produto modelado.** O frasco 3D procedural foi trocado por uma foto recortada. O 3D ficou para o ambiente (anel, luzes, pedestal), que é o que dá profundidade quando a câmera balança.
- **Foto dentro do WebGL pede `NeutralToneMapping`.** Com ACES, a foto escurece e muda de cor. O Neutral quase não mexe abaixo de 0,8.
- **Câmera que balança, não que gira:** como a foto é plana, a câmera oscila uns 35° e o anel e as varas mostram a paralaxe.
- **Correção do usuário: nada de cenário inventado.** A casa saiu porque "é só a marca de perfume". Se precisar de um lugar, use uma imagem do Dribbble recortada, como foi feito com o frasco.
- **Render offline acumulado (testado e removido):** em SwiftShader, cada sub-render de 1280×720 leva de 1 a 2 s. Com 14 amostras, o quadro sai em cerca de 20 s. Desfoque de movimento atrapalha: com o scroll parado, o quadro tem que estar nítido.
- **Reflexo de piscina barato:** câmera espelhada no plano da água, plano de corte global e a textura projetada com a matriz da câmera espelhada.
- **Testar câmera com damping no renderizador por software engana:** o atraso parece erro de posição. Use `#still`, que desliga o damping.
- **Imagem de terceiros:** a foto é de Charlotte B. ([Dribbble](https://dribbble.com/shots/23960344-Concept-perfume-bottle-model-and-render)). Está creditada no rodapé. Para uso comercial, peça licença ou fotografe o produto real.

Related: [Processo](regras/processo.md) · [Checklist de entrega](checklist-de-entrega.md) · [Ilha 3D](mundo-3d.md) · [Demo Tutifruti](demo-tutifruti.md)
