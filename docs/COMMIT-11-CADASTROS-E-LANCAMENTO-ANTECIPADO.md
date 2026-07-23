# Commit 11 - Cadastros e lançamento antes da folha

## Entregas

- Área `/administrativo/ponto/cadastros` para empresas, postos e funcionários.
- Empresas cadastradas por administradores.
- Postos e funcionários cadastrados por administradores ou supervisores.
- Operadores mantêm acesso ao lançamento, sem permissão para alterar cadastros.
- Competência pode ser iniciada sem folha assinada.
- Horários podem ser lançados diariamente antes da chegada do documento.
- A folha posterior é vinculada à mesma competência e aos lançamentos existentes.
- Leitura automática e PDF consolidado são habilitados após o anexo da folha.
- Consulta do perfil de autorização feita no servidor após validação do token.

## Migration

```bash
npx supabase link --project-ref amtbwdmpysrgxztokbfm
npx supabase db push
```

Migration:

```text
supabase/migrations/20260724110000_ponto_commit_11_early_entries.sql
```

## Variáveis obrigatórias na Vercel

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Depois de publicar, encerre a sessão antiga e faça login novamente para renovar os
cookies protegidos.
