# SitePlan

Ferramenta para transformar o briefing de um negócio em um planejamento de site editável: páginas, seções, textos, CTAs, jornadas de conversão, materiais pendentes, requisitos e um prompt de desenvolvimento.

## Executar

```bash
cd siteplan
npm install
npm run dev        # http://localhost:3000
npm test           # testes da lógica (gerador, import/export, materiais, IA)
npm run build      # build de produção
```

Requer Node 20.9 ou mais novo. Os projetos ficam salvos no IndexedDB do navegador.

## IA (opcional)

Sem chave, tudo funciona em **modo demonstração**: geração por regras e modelos por segmento, identificada na interface. Para ativar a IA, crie `siteplan/.env.local`:

```bash
ANTHROPIC_API_KEY=sua-chave
# SITEPLAN_AI_MODEL=claude-opus-5-5   # opcional
```

A chave só é lida nas rotas do servidor (`src/app/api/ai/*`). O navegador só sabe se a IA está disponível. As respostas vêm em formato estruturado e passam por validação Zod duas vezes (servidor e navegador) antes de entrar no editor.

## Fluxo

1. Criar projeto (ou abrir o exemplo da clínica odontológica).
2. Briefing em 6 etapas, com salvamento automático.
3. Revisão com lacunas e geração (demonstração ou IA).
4. Planejamento em abas: visão geral, mapa de páginas, seções (arrastar e soltar, teclado, biblioteca, regeneração com prévia), jornada com problemas detectados, conteúdo pendente e requisitos.
5. Entrega: prompt de desenvolvimento (editável, 16 partes), Markdown, JSON com `schemaVersion`, importação validada e versão de impressão.

## Estrutura

| Pasta | Papel |
|---|---|
| `src/lib/schema` | Tipos e schemas Zod, catálogo, fábrica, migração e importação |
| `src/lib/storage` | Interface `ProjectRepository` e implementação IndexedDB (troque em `getRepository()` para usar um backend) |
| `src/lib/generator` | Modo demonstração: perfis por segmento, regras de tipo de site, seções e jornadas |
| `src/lib/plan` | Operações de edição, análise de problemas, lacunas e sincronização de materiais |
| `src/lib/ai` | Prompts, schema de resposta, normalização e cliente (só servidor) |
| `src/lib/export` | Prompt de desenvolvimento, Markdown, JSON e tradução da direção visual |
| `src/components` | Interface |

## Limitações conhecidas

- A geração com IA foi testada com respostas simuladas e com chave inválida; a chamada real depende de uma chave configurada.
- O limite de requisições da IA é em memória (bom para uma instância; em várias instâncias, use um armazenamento compartilhado).
- URLs de referência não são acessadas: entram no prompt como referências informadas pelo usuário.
- Dados ficam só no navegador. Para usar em outro computador, exporte e importe o JSON.
