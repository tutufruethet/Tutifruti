# Fase 1 · Estrutura, design system, arquitetura e teste 3D

Related: [Arquitetura](arquitetura.md) · [Checklist de entrega do estudo](../../estudo/checklist-de-entrega.md)

## Critérios de aceitação

| # | Critério | Como é verificado | Estado |
|---|---|---|---|
| 1 | Projeto Next.js (App Router) com TypeScript estrito (`strict`, `noUncheckedIndexedAccess`) | `npm run typecheck` no CI | ✅ |
| 2 | Lint sem erros nem avisos | `npm run lint` (`--max-warnings=0`) no CI | ✅ |
| 3 | Testes unitários passando | `npm run test` (Vitest): tokens, teclado, OsRoot, VFS, registro de apps, settings, qualidade, foco, câmera | ✅ |
| 4 | Build de produção | `NEXUS_STATIC_EXPORT=1 npm run build` no CI | ✅ |
| 5 | Design system em tokens, com 3 neutros + 1 acento e contraste AA | `tokens.test.ts` confere contraste e se o CSS espelha os tokens; a paleta padrão do Tailwind foi removida | ✅ |
| 6 | Componentes de UI em `src/components/ui`, módulos de domínio separados | Estrutura de pastas ([arquitetura](arquitetura.md)) | ✅ |
| 7 | Interfaces TS para SystemBridge, apps, janelas, VFS, auth, persistência, IA e settings | `src/system`, `src/os/*/types.ts`, `src/services/*/types.ts`, `src/settings` | ✅ |
| 8 | Menus, diálogos e dicas abrem dentro do OS, não no `body` | Unitário (`OsRoot.test.tsx`) e E2E no 2D e dentro do monitor 3D | ✅ |
| 9 | Atalhos do OS só valem com o foco no OS; teclas digitadas no OS não mexem no quarto | Unitário e E2E ("fofo" + Esc no monitor não tiram o foco) | ✅ |
| 10 | O DOM do OS cobre exatamente a tela do monitor 3D | E2E compara o retângulo do DOM com a tela projetada (tolerância de 2%; medido: < 1 px) | ✅ |
| 11 | Com o monitor em foco, dá para digitar e abrir menu, e o menu fica no lugar certo | E2E (medido: menu 0,4 px à direita do botão, 6 px abaixo) | ✅ |
| 12 | Estado do OS sobrevive à troca 3D ↔ 2D | E2E: texto digitado no monitor aparece no desktop 2D | ✅ |
| 13 | Presets de qualidade (baixo, médio, alto, ultra) com DPR ≤ 2 | Unitário + E2E troca para "Baixa" e o canvas é recriado | ✅ |
| 14 | Fallback 2D sem WebGL2 e atalho direto para o desktop | `resolveMode` (unitário) + botão "Desktop 2D" e `?mode=2d` | ✅ |
| 15 | Sem erros no console | E2E falha com qualquer `console.error` ou exceção | ✅ |
| 16 | Funciona em 375 px sem rolagem horizontal | E2E no 2D + prints em 1440 e 375 (3D e 2D) | ✅ |
| 17 | Geometria provisória identificada | HUD "Geometria provisória" + meshes `placeholder:*` | ✅ |

## O que é real e o que ainda é contrato

Real e testado: tokens e CSS, componentes de UI, `OsRoot` (resolução fixa ou fluida, portais, atalhos), superfície de teste do shell, cena 3D com o OS no monitor, câmera orbital e foco, presets de qualidade, troca 3D/2D, utilitários de caminho do VFS, registro de apps e schema de settings.

Só contrato (interface TypeScript, sem implementação): `SystemBridge`, VFS, gerenciador de janelas, auth, persistência e IA. A superfície de teste **não é o desktop**: ela só prova as regras do shell.

## Pendências

- Geometria do quarto: blocos provisórios até a Fase 4 (GLB, chuva na janela, materiais PBR, bloom só no emissivo).
- Transição para o monitor: aproximação simples; a coreografia com GSAP é a Fase 5.
- Sair do monitor com Esc quando o foco está dentro do OS: hoje é pelo botão "Sair do monitor" (o Esc fica com o OS).
- Oclusão do DOM do monitor: o OS sempre aparece por cima da cena; a órbita limitada evita ver por trás. Revisar na Fase 4.
- Nitidez do texto no monitor em telas muito grandes (> 2× a resolução lógica): medir na Fase 4.
- Persistência das preferências: em memória até a Fase 3.
- Aviso do R3F sobre `THREE.Clock` (deprecado no three 0.18x): vem da biblioteca, sem efeito.
