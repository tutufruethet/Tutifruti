---
title: Módulo Administradora (prédio 3D no scroll)
date: 2026-10-22
tags: [pratica, 3d, webgl, scroll]
---

# Módulo Administradora (prédio 3D no scroll)

Site novo para a [Módulo Administradora de Condomínios](https://moduloadm.com.br/) (Olinda, PE) em [modulo/index.html](../modulo/index.html). Conceito aprovado pelo usuário: **"o prédio que se monta"**. A logo da Módulo é uma torre laranja, e no site ela vira um prédio 3D à noite que se monta andar por andar conforme o scroll; cada andar é uma frente de serviço.

| Parte | Técnica | De onde veio |
|---|---|---|
| História do scroll | Um número S com chaves por seção; câmera, painéis, luzes e fundo leem o mesmo S | [Movimento](regras/movimento.md) · [Nike conceito](referencias/nike-conceito.md) |
| Andares | Módulos caem e encaixam (expo-out), a planta em linhas laranja some, as janelas acendem uma a uma (limiar por janela no mapa emissivo) | [Fundo vivo e 3D](regras/fundo-vivo-e-3d.md) |
| Cidade | 420 prédios instanciados, janelas procedurais com `fwidth`, carros como pontos animados na GPU | [Bruno Simon](referencias/bruno-simon.md) |
| Composição | Lente deslocada para o prédio ficar nas colunas da direita; no celular, sobe para a metade de cima | [Grid e espaço](regras/grid-e-espaco.md) |
| Dois caminhos | Elevador (botões 01–06) para pular de andar; lista completa dos 45 serviços em acordeão | [Mundos e navegação](regras/mundos-e-navegacao.md) |
| Acabamento | Loader com a logo acendendo, cursor com lerp, botões magnéticos, marquee que acelera com o scroll, status "aberto agora" no fuso de Recife, wordmark do tamanho da tela | [Detalhes de acabamento](regras/detalhes-de-acabamento.md) |
| Formulário | Uma pergunta por tela; no fim abre o WhatsApp com a mensagem pronta | [Checklist de entrega](checklist-de-entrega.md) |
| Fallbacks | Sem WebGL2: prédio em SVG que se monta com o mesmo S. Reduced-motion: prédio pronto e aceso, câmera parada | [Performance](regras/performance.md) |

## Lições do projeto
- **Perguntar antes:** o usuário quer decidir a direção. Duas opções com prévia em texto bastaram para aprovar antes do código.
- **Janelas procedurais sem antisserrilhado parecem defeito:** de longe viram um "código de barras". Resolver com `fwidth` e média por distância.
- **Testar cada pose de câmera:** um poste na calçada cruzava a fachada na abertura e no fim; só apareceu no print.
- **Texto do scroll no S cru, 3D no S suavizado:** o texto troca na hora certa e a câmera continua macia.

Related: [Nike SP (conceito)](referencias/nike-conceito.md) · [Ilha 3D](mundo-3d.md) · [Checklist de entrega](checklist-de-entrega.md)
