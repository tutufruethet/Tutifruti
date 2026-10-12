# Ligar a conta na nuvem (Supabase)

Sem estas etapas, o NEXUS funciona só com perfis locais e convidado. A opção "Conta na nuvem" aparece na tela de entrada quando as variáveis existem.

Related: [Fase 3](fase-3.md) · [Arquitetura](arquitetura.md)

1. Crie um projeto no Supabase.
2. Rode a migration `supabase/migrations/20261012000000_nexus_init.sql` (SQL Editor ou `supabase db push`). Ela cria `profiles`, `user_settings` e o bucket privado `vfs`, todos com Row Level Security: cada usuário só lê e altera as próprias linhas.
3. Em Authentication › URL Configuration, adicione a URL do site (e `http://localhost:3000` para desenvolvimento) em "Redirect URLs". O link do e-mail volta para essa URL.
4. Copie `.env.example` para `.env.local` e preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. Rode o build de novo: as variáveis `NEXT_PUBLIC_*` entram no build.

Segurança:
- A chave anon é pública por desenho; quem protege os dados é o RLS. Nunca use a chave `service_role` no navegador nem neste repositório.
- O login usa link no e-mail com PKCE (o código só vale no mesmo navegador que pediu).
- Preferências na nuvem têm limite de tamanho (16 KB) imposto no banco.
