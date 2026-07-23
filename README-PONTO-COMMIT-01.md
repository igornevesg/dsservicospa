# Módulo de Ponto — Commit 01 revisado

## Entregue
- autenticação por e-mail e senha via Supabase Auth;
- sessão protegida por cookie HttpOnly validado no middleware;
- portal inicial do funcionário em `/funcionario`;
- login em `/funcionario/login`;
- painel-base administrativo em `/administrativo/ponto`;
- tabelas de empresas, postos, funcionários, perfis, vínculos e auditoria;
- RLS e papéis `admin`, `supervisor` e `employee`;
- três empresas iniciais Nova Geração;
- arquitetura preparada para Capacitor Android;
- contratos separados para câmera, geolocalização e identificação do aparelho;
- manifesto instalável e metadados mobile;
- configuração-base do aplicativo `Ponto DS Serviços`;
- política de permissões preparada para câmera e geolocalização.

## Decisão de arquitetura mobile
Como o sistema depende do servidor Next.js, middleware, cookies HttpOnly e Supabase, o APK interno será um contêiner Capacitor conectado à aplicação HTTPS publicada. A camada `src/lib/platform` permite implementar APIs web e plugins nativos sem duplicar as regras de negócio.

Os pacotes Capacitor ainda não foram adicionados ao `package.json` neste commit. Isso é intencional: a plataforma Android será gerada após a estabilização do fluxo de marcação, evitando arquivos nativos prematuros e mantendo o build web atual intacto. Consulte `docs/CAPACITOR-ANDROID.md`.

## Configuração
1. Crie `.env.local` usando `.env.example`.
2. Execute a migration do Supabase.
3. Crie o primeiro usuário no Supabase Auth.
4. Promova-o a administrador no SQL Editor:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'SEU_EMAIL');
```

## Supabase
```bash
npx supabase link --project-ref lpstuzhqnfygtybstddm
npx supabase db push
```

## Validação
```bash
npm ci
npm run typecheck
npm run lint
npm run build
```
