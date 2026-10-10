---
title: Hamburgueria Cozinha da Carla
date: 2026-10-10
tags: [pratica, 3d, webgl, landing]
---

# Hamburgueria Cozinha da Carla

Site em duas páginas em [hamburgueria/](../hamburgueria/index.html), feito com o cardápio e a história da cozinheira enviados pelo cliente. Precisa ser servido por HTTP (usa o Three.js de `mundo/vendor`).

| Página | Papel | O que tem |
|---|---|---|
| [index.html](../hamburgueria/index.html) | Apresentação | Hero com hambúrguer 3D que se monta e abre no scroll (vista explodida com etiquetas), cardápio editorial, história da Carla com polaroids |
| [pedir.html](../hamburgueria/pedir.html) | Atrair clientes | Foto como herói, combo, cardápio compacto com "Pedir" no WhatsApp, motivos, 3 passos, perguntas, barra fixa no celular |

| Parte | Regra aplicada |
|---|---|
| Burger 3D procedural: pão por `LatheGeometry` com cor por vértice, gergelim instanciado, queijo e alface por deslocamento de plano | [Fundo vivo e 3D](regras/fundo-vivo-e-3d.md) (3D é herói) |
| Sombra roxo-marrom (hemisférica), contraluz laranja, sombra real só da luz chave | [Fundo vivo e 3D](regras/fundo-vivo-e-3d.md) |
| Etiquetas presas às camadas (conteúdo dentro da cena) | [Mundos e navegação](regras/mundos-e-navegacao.md) |
| Paleta tinta `#120d0a`, creme `#f1e8da`, cinza `#8c8174`, acento cheddar `#f5a524` | [Cor e paleta](regras/cor-e-paleta.md) |
| Instrument Sans + Instrument Serif itálico ("Carla", "verdade") | [Tipografia](regras/tipografia.md) |
| Luz quente que segue o cursor sobre a foto (página de pedidos, sem WebGL) | [Lusion](referencias/lusion.md) |
| Sem WebGL vira foto; reduced-motion tira giro e queda; render só depois do loader | [Performance](regras/performance.md) |

## Lições do projeto
- **Vista explodida é o scroll mais fácil de entender:** cada camada sobe `progresso × vão × índice` e a câmera recua para caber a pilha. Ninguém precisa de instrução.
- **Lathe não precisa de `computeVertexNormals`:** recalcular cria uma costura visível no pão. Para o miolo claro, o perfil precisa de pontos extras na face plana, senão a cor vira degradê.
- **Não renderizar atrás do loader:** o laço 3D começava antes do loader acabar, a animação de entrada acontecia escondida e o contador travava no renderizador por software.
- **Grid com foto primeiro no HTML:** sem `grid-row:1` explícito, o texto foi para a segunda linha e a foto (absoluta) sumiu.
- **Hover em listas só com `hover: hover`:** no toque, o estado de hover "gruda" e apaga os preços.
- **Polaroids do cartaz:** recortar com máscara de polígono (PNG/WebP com alfa) mantém a letra manuscrita do cliente sem adicionar uma terceira fonte.

Related: [Ilha 3D](mundo-3d.md) · [Demo Tutifruti](demo-tutifruti.md) · [Checklist de entrega](checklist-de-entrega.md) · [Fundo vivo e 3D](regras/fundo-vivo-e-3d.md)
