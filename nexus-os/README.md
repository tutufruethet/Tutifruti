# NEXUS OS

Sistema operacional virtual dentro de um quarto 3D. Você entra no quarto, senta no computador e usa um desktop de verdade: janelas, arquivos, terminal, notas, música, IA.

**Estado atual: Fase 2.** Desktop com janelas, barra de tarefas, menu de apps, notificações e calendário, dentro do monitor 3D ou em tela cheia. Apps: Files, Terminal, Notes e Settings, sobre um sistema de arquivos virtual **em memória** (a persistência é a Fase 3). Veja [Fase 1](docs/fase-1.md) e [Fase 2](docs/fase-2.md).

## Rodar

Node 20.9 ou mais novo.

```
npm install
npm run dev            # http://localhost:3000
```

- `/?mode=3d` abre o quarto; `/?mode=2d` abre direto o desktop em tela cheia.
- Atalhos (com o foco no OS): Ctrl/⌘ K menu de apps · Alt+W fecha · Alt+M minimiza · Alt+↑ maximiza · Alt+J alterna janelas.
- `?debug` expõe `window.__nexus` (estado da câmera, retângulo da tela) para testes.

## Verificar

```
npm run check                                   # lint + typecheck + testes unitários
NEXUS_STATIC_EXPORT=1 npm run build             # build estático em out/
npx playwright install chromium && npm run test:e2e
```

O CI roda tudo a cada push e publica o build estático na branch `nexus-os-preview`.

## Stack

Next.js (App Router) + TypeScript estrito · Tailwind CSS 4 · componentes estilo shadcn sobre Radix · React Three Fiber + Drei · Zustand · zod · xterm.js · Vitest + Testing Library · Playwright.

Entram nas próximas fases: GSAP (transições), Rapier (colisões), TanStack Query, Supabase (Auth, Postgres, Storage), IndexedDB, Monaco, Web Audio e a API de IA no backend.

## Fases

1. Estrutura, design system, arquitetura e teste 3D ✅
2. Desktop, gerenciador de janelas e apps básicos ← **aqui**
3. Autenticação, persistência e sistema de arquivos virtual
4. Quarto 3D com modelos GLB, luz e interações
5. Transições cinematográficas entre quarto e desktop
6. Nexus AI, apps avançados e configurações
7. Otimização, segurança, acessibilidade e testes
8. Deploy e documentação

## Documentação

- [Arquitetura e decisões](docs/arquitetura.md)
- [Fase 1: critérios de aceitação](docs/fase-1.md)
- [Fase 2: critérios de aceitação](docs/fase-2.md)
- Regras de design: [estudo de design e 3D](../estudo/README.md)
