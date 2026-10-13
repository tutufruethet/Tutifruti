---
title: react-three-examples
date: 2026-10-13
tags: [referencia, 3d, react, testes]
---

# react-three-examples

268 exemplos oficiais do three.js refeitos em r3f v10 (WebGPU): [pmndrs/react-three-examples](https://github.com/pmndrs/react-three-examples) (MIT). Lido: `AGENTS.md`, `CLAUDE.md`, `styleNotes.md`, `tests/animates.spec.ts`.

## Estilo de código (regras da casa deles)
1. Controles junto de quem consome; nada de passar valor de leva por props.
2. Declarativo primeiro; instância compartilhada só quando a partilha é real, marcada com `REVIEW(shared-instance)`.
3. Não inventar recurso que o original não tem.
4. Tipos vêm dos elementos JSX; cast é sinal de lacuna (registrar).
5. Comentário curto, uma vez; refs com nome do que guardam; imports em hierarquia.
6. Divergência das regras nunca é silenciosa: corrige ou vira emenda com changelog; dúvida de julgamento vai para uma fila de revisão.

## Verificação em camadas
| Camada | Prova |
|---|---|
| typecheck + lint + build | o código compila |
| smoke | sinal de pronto (`__exampleReady`), contexto WebGPU real, canvas não-preto, console limpo |
| animates | dois screenshots com 2,2 s de intervalo diferem > 100 px (tolerância 4 por canal) e `__frameCount` subiu > 5 |
| screenshot olhado | pegou um bug de tone mapping que as duas camadas anteriores deixaram passar |
| clique em cada controle | o estado padrão só testa o primeiro estado |

**Lição:** teste automático encontra o que trava; só o olho encontra o que está feio ou errado.

Related: [Superpowers](superpowers.md) · [React Three Fiber](react-three-fiber.md) · [Checklist de entrega](../checklist-de-entrega.md)
