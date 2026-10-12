# Arquitetura do NEXUS OS

Um sistema operacional virtual (Next.js + React) que roda em tela cheia ou dentro do monitor de um quarto 3D (React Three Fiber). O OS é o produto; o quarto é a porta de entrada.

Related: [Fase 1](fase-1.md) · [Fase 2](fase-2.md) · [Fase 3](fase-3.md) · [Supabase](supabase.md) · [Estudo de design](../../estudo/README.md) · [Mundos e navegação](../../estudo/regras/mundos-e-navegacao.md)

## Pastas

```
nexus-os/
├── src/
│   ├── app/                  rotas do Next: layout, página, CSS global, ícone
│   ├── apps/                 apps do OS (files, terminal, notes, settings) + catálogo
│   ├── components/ui/        primitivos de UI (estilo shadcn, sobre Radix), com portal preso ao OS
│   ├── design/               tokens: cor, tipo, movimento, camadas, resolução do monitor
│   ├── engine/               cena 3D: câmera, luz, monitor, presets de qualidade, geometria provisória
│   ├── experience/           entrada: modo 3D/2D, HUD, capacidades do navegador
│   ├── os/
│   │   ├── apps/             contrato de app (manifesto), registro, AppHost, openApp
│   │   ├── desktop/          desktop: boot, wallpaper, barra de tarefas, menu, calendário, avisos
│   │   ├── keyboard/         atalhos e escopo de teclado
│   │   ├── notifications/    store de notificações (serviço da SystemBridge)
│   │   ├── session/          boot, perfis, entrada, bloqueio e ciclo de vida da sessão
│   │   ├── shell/            OsRoot, viewport, conversão de coordenadas
│   │   ├── vfs/              contrato, caminhos, VFS em memória, estrutura inicial
│   │   └── window-manager/   lógica pura, store e a janela (arrastar, redimensionar)
│   ├── services/             auth (nuvem/Supabase), persistência (IndexedDB) e contrato da IA
│   ├── settings/             schema (zod) e store de preferências
│   ├── system/               SystemBridge: a única porta dos apps para o "sistema"
│   └── lib/                  utilitários
├── tests/e2e/                Playwright: desktop 2D e quarto 3D
├── scripts/                  servidor estático e passos do CI
├── supabase/migrations/      esquema da nuvem com Row Level Security
└── docs/                     este documento e os critérios de cada fase
```

Entram depois: `src/app/api/` (backend, Fase 6), `public/models/` (GLB, Fase 4).

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
- O desktop conhece os apps só pelo catálogo (`src/apps/catalog.ts`); o código de cada app é carregado sob demanda quando a janela abre.
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

**ADR-012 · Janelas em coordenadas do desktop.** Posição e tamanho ficam em px do container do desktop, nunca da janela do navegador. A lógica do gerenciador é pura (estado → estado) e testada; a store só a aplica. No monitor 3D, o arrasto divide o deslocamento do mouse pela escala do OS (`osScale`), que é uniforme com a câmera de frente (ADR-010).

**ADR-013 · Só entra no catálogo app que funciona.** Nada de ícone decorativo para app futuro. Cada app é carregado sob demanda e roda dentro de um limite de erro: se quebrar, o erro fica na janela e o OS continua.

**ADR-014 · Terminal = interpretador próprio + xterm.js como tela.** O interpretador só chama o VFS; não existe, por desenho, caminho para executar comandos do computador. A edição de linha (cursor, histórico, Tab, Ctrl+C/L/U) é uma classe sem dependência do xterm, testada com um coletor de saída.

**ADR-015 · VFS em memória primeiro.** O `MemoryFileSystem` implementa o contrato inteiro (inclusive observadores e cota). A Fase 3 troca o driver por IndexedDB + Supabase sem mexer nos apps.

**ADR-017 · Persistência write-through.** O VFS continua em memória (rápido, síncrono para a interface) e cada mudança vai para o IndexedDB numa fila em ordem. Ao entrar no perfil, tudo é carregado de volta. Conteúdos ficam por id, então mover uma pasta só reescreve caminhos.

**ADR-018 · Um banco por perfil.** `nexus-os` guarda a lista de perfis; `nexus-os:<perfil>` guarda arquivos, preferências e janelas. Apagar os dados de um perfil é apagar um banco. Convidado nunca abre banco.

**ADR-019 · Perfis locais sem senha, e a interface diz isso.** Num site, uma senha local não protege dados que estão no mesmo navegador; fingir que protege seria pior. O bloqueio é uma cortina. Proteção de verdade é a conta na nuvem (RLS no servidor).

**ADR-020 · Nuvem opcional e carregada sob demanda.** O cliente do Supabase só é baixado quando as variáveis existem. O navegador usa só a chave anon; cada tabela e o bucket têm RLS por `auth.uid()`.

**ADR-021 · Tudo que vem do armazenamento passa por zod.** Preferências, janelas salvas, perfis e backups são validados ao carregar; um registro ruim volta ao padrão em vez de quebrar o boot.

**ADR-016 · Janelas planas.** Sem sombra (estudo: superfícies planas, linhas finas). A janela em foco tem borda mais clara e título aceso; as outras ficam apagadas.

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
