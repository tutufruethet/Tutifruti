# Fase 2 · Desktop, gerenciador de janelas e apps básicos

Related: [Arquitetura](arquitetura.md) · [Fase 1](fase-1.md) · [Checklist de entrega do estudo](../../estudo/checklist-de-entrega.md)

## Critérios de aceitação

| # | Critério | Como é verificado | Estado |
|---|---|---|---|
| 1 | Tela de boot com etapas reais (montar o VFS, conferir apps), contador e saída em cortina; roda uma vez por aba | E2E espera `data-desktop-ready`; print do boot | ✅ |
| 2 | Wallpaper configurável (4 opções em CSS, sem imagem) | Settings › Aparência | ✅ |
| 3 | Barra de tarefas com janelas abertas, notificações e relógio | E2E clica nos botões da barra | ✅ |
| 4 | Menu de apps com busca e navegação por setas; Ctrl/⌘ K abre | Unitário (`filterApps`, Desktop) + E2E no 2D e no monitor 3D | ✅ |
| 5 | Notificações: avisos temporários + central com histórico | Unitário (store) + E2E (boas-vindas na central) | ✅ |
| 6 | Relógio e calendário mensal em pt-BR | Unitário (`monthGrid`) + E2E (calendário dentro do OS) | ✅ |
| 7 | Janelas: arrastar, redimensionar (8 bordas), minimizar, maximizar, foco e ordem | Unitário (lógica pura) + E2E (arrastar 120×60 px, maximizar, minimizar e restaurar pela barra) | ✅ |
| 8 | Arrastar no monitor 3D converte px da tela em px do OS | E2E: deslocamento = 100 px ÷ escala do monitor (±3 px) | ✅ |
| 9 | Atalhos: Alt+W fecha, Alt+M minimiza, Alt+↑ maximiza, Alt+J alterna; no macOS, pela tecla física | Unitário (`event.code`) + E2E (Alt+W) | ✅ |
| 10 | Telas estreitas: janelas em tela cheia, barra compacta, sem rolagem horizontal | E2E em 375 px + print | ✅ |
| 11 | VFS em memória com CRUD, cópia/movimento recursivos, busca sem acento, observadores e cota | 15 testes unitários (`memory.test.ts`) | ✅ |
| 12 | Files: navegar, lugares, criar, renomear, excluir com confirmação, buscar, importar e exportar | Desktop.test + E2E (nova pasta) | ✅ |
| 13 | Terminal (xterm.js): `help ls cd pwd mkdir touch cat cp mv rm clear` + `echo` com `>`/`>>`, histórico, Tab; nada roda no computador real | Testes do interpretador e da sessão + E2E no 2D e no monitor | ✅ |
| 14 | Files e Terminal usam o mesmo sistema: pasta criada no Terminal aparece no Files | E2E | ✅ |
| 15 | Notes: salvamento automático, busca por título e conteúdo, renomear, excluir | E2E (salva, fecha, reabre e acha pela busca) | ✅ |
| 16 | Settings: wallpaper, qualidade gráfica, movimento reduzido, lista de atalhos | Print + E2E abre e fecha | ✅ |
| 17 | Lint, typecheck, unitários, build e E2E passando; sem erro no console | CI | ✅ |

## O que é real e o que ainda falta

Real: desktop, janelas, barra de tarefas, menu, notificações, calendário, boot e os quatro apps, todos sobre a `SystemBridge`.

O sistema de arquivos e as preferências ficam **na memória da aba**: somem ao recarregar. A persistência (IndexedDB local e Supabase) e o login são a Fase 3. Browser, Music, Nexus AI, Calendar (eventos), Code Studio e System Monitor são da Fase 6 e não aparecem no menu até existirem.

## Pendências

- Persistência do VFS, das janelas abertas e das preferências (Fase 3).
- Seleção de texto no Terminal dentro do monitor 3D pode ficar deslocada (o xterm calcula a posição do mouse com a caixa projetada). Digitar e rolar funcionam.
- Prévia de imagens no Files; hoje arquivos que não são texto são exportados ao abrir.
- Arrastar arquivos entre pastas e da área de trabalho do computador para o Files.
- Temas além do escuro (Fase 6).
