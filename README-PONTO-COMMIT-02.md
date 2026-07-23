# DS Serviços — Sistema de Ponto — Commit 02

## Entregas

- painel administrativo conectado ao Supabase;
- cadastro de empresas, postos, funcionários e supervisores;
- isolamento de supervisores por empresa via RLS;
- criação de usuários somente pelo backend com `service_role` protegida;
- senha temporária forte e troca obrigatória no primeiro acesso;
- sessão em cookies `HttpOnly`, `SameSite=Strict` e `Secure` em produção;
- access token removido do `localStorage`;
- renovação segura da sessão pelo middleware;
- validação de origem nas ações mutáveis;
- mensagens genéricas no login contra enumeração de usuários;
- redirecionamentos limitados a rotas internas autorizadas;
- trilha de auditoria na criação de usuários;
- arquitetura web preservada para empacotamento posterior com Capacitor.

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha as chaves do projeto DS Serviços.

`SUPABASE_SERVICE_ROLE_KEY` é exclusiva do servidor. Nunca use o prefixo `NEXT_PUBLIC_` nela.

## Migration

```bash
npx supabase link --project-ref amtbwdmpysrgxztokbfm
npx supabase db push
```

## Primeiro administrador

O usuário inicial deve ser criado no Supabase Auth. Depois, promova-o no SQL Editor:

```sql
update public.profiles
set role = 'admin', company_id = null, is_active = true
where id = (select id from auth.users where email = 'SEU_EMAIL');
```

## Validação

```bash
npm ci
npm run typecheck
npm run lint
npm run build
```
