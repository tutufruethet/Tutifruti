# Fase 3 · Login, sessão e persistência

Related: [Arquitetura](arquitetura.md) · [Fase 2](fase-2.md) · [Ligar a nuvem](supabase.md)

## Critérios de aceitação

| # | Critério | Como é verificado | Estado |
|---|---|---|---|
| 1 | Arquivos e pastas sobrevivem ao recarregar (IndexedDB, write-through em fila) | Unitário com IndexedDB simulado (criar, editar, mover, apagar e recarregar) + E2E com recarga real | ✅ |
| 2 | Preferências sobrevivem ao recarregar | E2E: wallpaper "Vazio" continua depois da recarga | ✅ |
| 3 | Janelas abertas voltam no mesmo lugar | Unitário (`restoreWindows`) + E2E (Files e Settings reabertos) | ✅ |
| 4 | Tela de entrada depois do boot: perfil local (sem senha), convidado ou nuvem | E2E cria perfil, entra como convidado e volta ao perfil | ✅ |
| 5 | A sessão volta sozinha ao recarregar; sair esquece a sessão | E2E: recarregar não mostra a tela de entrada; sair mostra | ✅ |
| 6 | Bloquear (Alt+L ou menu) sem fechar nada; desbloquear | E2E | ✅ |
| 7 | Perfis isolados: um não enxerga os arquivos do outro | Unitário (dois perfis, dois bancos) + E2E (convidado não vê a pasta da Bia) | ✅ |
| 8 | Convidado não grava nada; tudo some ao sair | Unitário | ✅ |
| 9 | Settings › Dados: uso real (VFS e `navigator.storage`), pedir armazenamento persistente, exportar e importar backup, apagar os dados do perfil com confirmação | Unitário do backup (texto, binário, pastas vazias) + E2E (apagar dados) + print | ✅ |
| 10 | Sem IndexedDB, o OS segue em memória e avisa | Caminho de erro no `openDevice` (só convidado fica disponível) | ✅ |
| 11 | Dados lidos do armazenamento são validados (zod): registro ruim volta ao padrão, nunca quebra o boot | Unitário (settings, janelas salvas, perfis, backup) | ✅ |
| 12 | Supabase pronto para ligar: link no e-mail, preferências sincronizadas, migrations com RLS, só aparece com as variáveis configuradas | Unitário com cliente **simulado**; **não testado num projeto real** | ⚠️ |
| 13 | Lint, typecheck, unitários, build e E2E; sem erro no console | CI | ✅ |

## O que é real e o que falta

Real e testado: perfis locais, convidado, bloqueio, saída, persistência do VFS, das preferências e das janelas, backup e exclusão de dados.

A conta na nuvem está escrita e coberta por testes com um cliente simulado, mas **ainda não rodou contra um projeto Supabase**. Para ligar: [supabase.md](supabase.md).

## Pendências

- Sincronizar os arquivos do VFS com o Supabase Storage. O bucket `vfs` e as políticas de RLS já estão na migration; falta o motor de sincronização (conflitos, envio em segundo plano).
- Testar o login por e-mail e o RLS num projeto real (precisa da URL e da chave anon).
- Senha ou PIN opcional para perfis locais. Hoje o bloqueio é uma cortina, e a interface diz isso.
- Duas abas no mesmo perfil gravam em paralelo; a última escrita vence. Coordenar com `BroadcastChannel` fica para a Fase 7.
