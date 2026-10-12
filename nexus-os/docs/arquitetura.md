# Arquitetura do NEXUS OS

Um sistema operacional virtual (Next.js + React) que roda em tela cheia ou dentro do monitor de um quarto 3D (React Three Fiber). O OS é o produto; o quarto é a porta de entrada.

Related: [Fase 1](fase-1.md) · [Estudo de design](../../estudo/README.md) · [Mundos e navegação](../../estudo/regras/mundos-e-navegacao.md)

## Pastas

```
nexus-os/
├── src/
│   ├── app/                  rotas do Next: layout, página, CSS global, ícone
│   ├── components/ui/        primitivos de UI (estilo shadcn, sobre Radix), com portal preso ao OS
│   ├── design/               tokens: cor, tipo, movimento, camadas, resolução do monitor
│   ├── engine/               cena 3D: câmera, luz, monitor, presets de qualidade, geometria provisória
│   ├── experience/           entrada: modo 3D/2D, HUD, capacidades do navegador
│   ├── os/
│   │   ├── apps/             contrato de app (manifesto) e registro
│   │   ├── keyboard/         atalhos e escopo de teclado
│   │   ├── shell/            OsRoot, viewport, superfície de teste da Fase 1
│   │   ├── vfs/              contrato do sistema de arquivos virtual e caminhos
│   │   └── window-manager/   contrato do gerenciador de janelas
│   ├── services/             contratos de auth, persistência e IA
│   ├── settings/             schema (zod) e store de preferências
│   ├── system/               SystemBridge: a única porta dos apps para o "sistema"
│   └── lib/                  utilitários
├── tests/e2e/                Playwright: desktop 2D e quarto 3D
├── scripts/                  servidor estático e passos do CI
└── docs/                     este documento e os critérios de cada fase
```

Entram depois: `src/app/api/` (backend, Fase 6), `src/os/apps/<app>/` (Fase 2 em diante), `public/models/` (GLB, Fase 4).

## Camadas e dependências

```
experience ──► engine ──► os/shell ──► components/ui ──► design, lib
     │            │           │
     │            └► settings └► os/keyboard, os/apps (tipos)
     └────────────► os/shell
apps ──► SystemBridge ──► vfs, notificações, clipboard   (implementações em services/)
```

Regras:
- `os/*` nunca importa `engine` nem `experience`. O OS não sabe que existe um quarto.
- `engine` só usa a API pública do shell (`OsRoot`, viewport) para montar o OS no monitor.
- Apps falam só com `SystemBridge` e `components/ui`. Nada de IndexedDB, Supabase ou `fetch` direto.
- Chaves secretas só no servidor (rotas em `src/app/api/`). O navegador só tem a chave pública do Supabase; a autorização real é RLS no Postgres e validação no backend.

## Decisões

**ADR-001 · OS primeiro, 3D depois, com teste 3D já na Fase 1.** O produto é o OS; o quarto é entrada. Mas o maior risco técnico é rodar o OS dentro do monitor, então a Fase 1 já valida isso com geometria provisória.

**ADR-002 · Dois modos de viewport.** No monitor, o OS tem resolução lógica fixa de 1280×800 (16:10) e o Drei escala o DOM. Em tela cheia, ele é fluido. Componentes do OS leem o tamanho do container (`cqw`, container queries), nunca da `window`. 1280 px foi escolhido para que, com o monitor em foco numa tela de 1440 px, o texto fique perto da escala 1:1.

**ADR-003 · Portais presos ao OS.** Menus, diálogos e dicas do Radix montam em `[data-os-portal]`, dentro do OS, e não no `body`. Sem isso, um menu aberto no monitor 3D aparece solto na página. Diálogos usam posição absoluta (cobrem só o OS).

**ADR-004 · Teclado com escopo.** Atalhos do OS são registrados no elemento raiz do OS, não na `window`. O quarto ignora teclas vindas do OS, de campos de texto ou com Ctrl/⌘/Alt. Atalhos de uma tecla só não disparam em campos de texto.

**ADR-005 · Estado do OS em Zustand.** O `<Html>` do Drei renderiza numa raiz React separada, onde contextos de fora não chegam, e trocar monitor ↔ tela cheia remonta o OS. Stores Zustand ficam fora da árvore React, então o estado sobrevive às duas coisas. O `OsRoot` traz os próprios providers.

**ADR-006 · SystemBridge só virtual na v1.** Controlar o Windows a partir de um site transforma qualquer XSS, extensão ou aba maliciosa em acesso à máquina. Se o controle real vier, será um app desktop (Tauri) que empacota o NEXUS, com permissões por capacidade, lista de comandos permitidos, confirmação por ação e log de auditoria. O tipo `ProcessService` já não aceita texto livre de shell.

**ADR-007 · Paleta: 3 neutros + 1 acento.** Regra do estudo aplicada à paleta do briefing: tinta `#07090F`, papel `#EAF1FF`, ardósia `#7C869C` (derivada) e ciano `#00D9FF` como único acento. Azul elétrico e roxo viram luz na cena (fita RGB e cor da sombra), não cor de interface. A paleta padrão do Tailwind foi removida.

**ADR-008 · Um easing, duas durações.** Expo-out `cubic-bezier(.16,1,.3,1)` em tudo. O estudo pede 0,9–1,2 s para entradas de site; num SO isso atrapalha. Menus e hover usam 180 ms; câmera e cenas, ~1 s.

**ADR-009 · Fontes: Instrument Sans + JetBrains Mono.** Duas famílias (regra do estudo). A serifa da dupla do estudo dá lugar à mono, que o Terminal, o Code Studio e os rótulos de metadado precisam.

**ADR-010 · Interação no monitor só com a câmera de frente.** O usuário explora o quarto em órbita; clicar no monitor, apertar F ou o botão "Usar o computador" leva a câmera de frente para a tela. Em tela estreita (< 768 px), o OS de 1280 px no monitor ficaria ilegível, então focar leva ao desktop 2D.

**ADR-011 · Renderização sob demanda.** `frameloop="demand"`: com a cena parada, a GPU descansa; com a aba escondida, não renderiza. Animações contínuas (chuva, Fase 4) vão precisar de um orçamento explícito.

## Pipeline de modelos 3D (Fase 4)

1. Fonte: modelagem própria no Blender ou assets CC0, com licença registrada em `docs/assets.md`.
2. Exportar glTF com materiais PBR; texturas em atlas quando possível.
3. Otimizar com `gltf-transform optimize --compress draco --texture-compress ktx2`.
4. Carregar com `useGLTF` (Drei) e os decoders Draco/KTX2; LOD para peças complexas.
5. Manter os pontos de referência de `src/engine/layout.ts` (mesa, tela do monitor) para não quebrar câmera e OS.

Até lá, cada peça é um bloco com nome `placeholder:*` e o HUD avisa "Geometria provisória".

## Como validar

```
npm install
npm run check                                  # lint + typecheck + testes unitários
NEXUS_STATIC_EXPORT=1 npm run build            # build estático em out/
npx playwright install chromium && npm run test:e2e
```

O CI (`.github/workflows/nexus-os.yml`) roda tudo isso a cada push e publica o build estático na branch `nexus-os-preview`.
