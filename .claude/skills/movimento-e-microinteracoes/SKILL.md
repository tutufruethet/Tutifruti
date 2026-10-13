---
name: movimento-e-microinteracoes
description: Use quando for adicionar ou ajustar animação, transição, efeito de hover, arrastar, scroll animado, mola, inércia ou qualquer resposta visual a uma ação do usuário, em DOM, canvas ou 3D; também quando uma animação estiver travando, variando de velocidade entre telas de 60 e 120 Hz ou parecendo genérica.
---

# Movimento e microinterações

Movimento serve para **mostrar o que mudou** e **dar peso às coisas**. Um momento orquestrado vale mais que dez efeitos espalhados.

Regras da casa: [Movimento](../../../estudo/regras/movimento.md) (easing expo-out `cubic-bezier(.16,1,.3,1)`, entradas de 0,9–1,2s, stagger de 60–90ms, reveal por linha com máscara). Elas valem mais que esta skill.

## Quando usar
- Animação de entrada, de estado, de hover, de foco, de arrasto, de scroll.
- Valores animados em loop (`requestAnimationFrame`, `useFrame`).
- Bug de "mais rápido no monitor de 120 Hz", tremedeira, salto no primeiro quadro.

## Quando não usar
- Escolha de paleta e layout: `design-premium`. Iluminação e materiais: `cena-3d`.

## Princípios
1. **Responder à pessoa vale mais que se mexer sozinho.** Movimento disparado pelo usuário (abrir, adicionar, confirmar) é bem-vindo. Movimento automático é raro e tem motivo.
2. **Um momento orquestrado.** Uma sequência de carregamento OU um reveal principal. Não aplique fade-and-slide em toda seção.
3. **Independente da taxa de quadros.** Todo valor que anda no loop usa `delta`. `x += 0.1` por quadro roda duas vezes mais rápido em 120 Hz.
4. **Amortecer, não colar.** Cursor, câmera, cor de hover: `damp` com meia-vida, nunca `lerp` com fator fixo por quadro.
5. **Fora do framework.** Atualizações rápidas mutam o objeto dentro do loop; não passam por `setState`/store reativa a 60 fps (r3f: "Avoid setState in loops").
6. **Parar quando assenta.** Se nada se mexe, o loop dorme (renderização sob demanda). Bateria é parte do design.
7. **`prefers-reduced-motion`:** pula direto para o estado final, mantém a mudança de cor/estado como retorno.

## Ferramentas (código em [references/receitas.md](references/receitas.md))

| Necessidade | Ferramenta | Origem |
|---|---|---|
| Seguir um alvo suavemente | `damp(a, b, λ, dt) = lerp(a, b, 1 - e^(-λ·dt))` | `maath/easing` (pmndrs) |
| Peso, quique, squash | Mola-amortecedor `F = k·x − c·v`, integrada com sub-passos fixos | Ecctrl (`springK`, `dampingC`) |
| Arrastar com inércia | Pointer capture + velocidade amortecida depois de soltar | r3f events |
| Clique vs arrasto | Clique só conta se o ponteiro desceu e subiu no mesmo alvo e andou < 6px | r3f `initialHits` |
| Curva de resposta ajustável | Curva Hermite "assada" em tabela (LUT) e lida por índice | Ecctrl `bakeCurveLUT` |
| Progresso de scroll | `p ∈ [0,1]`; `range(início, tamanho)`; `curve()` em sino `sin(π·t)` | drei `useScroll` |
| Animação longa fiel | Animar a câmera no Blender e "raspar" a timeline pelo scroll | pmndrs `camera-scroll` |
| Muitos itens com hover | Cor e escala amortecidas por item no loop | pmndrs `horizontal-tiles` |
| Anúncio do que mudou | `aria-live="polite"` com o mesmo verbo do botão | — |

## Microinterações que valem o custo
- **Adicionar algo:** o objeto viaja até onde ele fica (a bola cai na casquinha), com um squash curto no impacto.
- **Remover:** encolhe e some em ~250ms; o resto se reorganiza com mola.
- **Selecionado:** troca de cor amortecida + marca; nada de pulsar.
- **Hover:** só com `@media (hover: hover)`; nunca esconda informação atrás de hover.
- **Botão pressionado:** `transform: scale(.97)` em `:active`, 120ms.
- **Copiar link / salvar:** status em texto ("Link copiado"), some sozinho em 2–3s, anunciado por `aria-live`.

## Erros comuns
| Erro | Correção |
|---|---|
| `lerp(a, b, 0.1)` por quadro | `damp(a, b, λ, dt)` |
| Mola integrada com `dt` variável grande (aba voltou do fundo) | Limitar `dt` a 1/30 e usar sub-passos fixos |
| `new Vector3()` dentro do loop | Reusar objetos criados fora (sem lixo para o GC) |
| Animação começa com salto no modo sob demanda | Pedir o quadro antes (`invalidate()`) e começar no próximo `requestAnimationFrame` |
| Transição de 300ms com `ease` em tudo | Easing da casa, durações da casa, e só onde há mudança |
| Loop rodando com a aba escondida ou o canvas fora da tela | `visibilitychange` + `IntersectionObserver` |
| Tirar um item recria os vizinhos (casando por índice) | Case por identidade; os que ficam só mudam de alvo e a mola leva |
| Câmera fixa: 1 item fica pequeno, 3 itens não cabem | Enquadrar pelo **alvo** do conteúdo e amortecer a câmera |
| Título revelado só quando o 3D carrega | Revelar o texto no primeiro quadro; o 3D chega depois |

## Critérios de qualidade
- [ ] Toda animação no loop usa `dt` (testado com a mesma cena em 60 e 120 Hz, ou com `dt` simulado).
- [ ] O loop para quando nada se mexe (contador de quadros não sobe em repouso).
- [ ] Reduced motion: estado final imediato, sem viagem; nada quebra.
- [ ] Arrastar funciona com mouse, toque e teclado (setas) quando o objeto é interativo.
- [ ] Cada ação do usuário tem retorno visível em < 100ms e texto anunciado quando muda dado.
- [ ] Um único momento orquestrado na página; o resto responde a ações.

## Referências
- [references/receitas.md](references/receitas.md): damp, mola com sub-passos, inércia, clique vs arrasto, LUT, scroll, reveal por linha.
- Estudo: [React Three Fiber](../../../estudo/referencias/react-three-fiber.md) · [Ecctrl](../../../estudo/referencias/ecctrl.md) · [pmndrs/examples](../../../estudo/referencias/pmndrs-examples.md).
