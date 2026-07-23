# Auditoria final pré-produção

Data: 23/07/2026

## Resultado

- `npm ci`: aprovado
- `npm run typecheck`: aprovado
- `npm run lint`: aprovado
- `npm run build`: aprovado
- Next.js: 15.5.21 (Maintenance LTS)
- `brace-expansion`: corrigido para 1.1.16
- recuperação automática de administrador em runtime: removida
- cookies de sessão: HttpOnly, SameSite Strict e Secure em produção
- uploads: bucket privado, limite de 10 MB e tipos PDF/JPEG/PNG
- service role: somente no servidor
- páginas administrativas: protegidas por middleware e validação server-side
- escritas sensíveis: validação de origem, papel e escopo por empresa

## Alerta transitivo conhecido

O `npm audit` mantém duas ocorrências classificadas como altas referentes ao
`sharp@0.34.5`, dependência interna do Next.js 15.5.21. Não há correção compatível
disponível na linha 15 no momento desta auditoria.

O sistema não processa imagens enviadas pelos usuários com o otimizador do Next.js:
as folhas são armazenadas diretamente no bucket privado do Supabase. Não executar
`npm audit fix --force`, pois o npm propõe mudança incompatível de framework.

## Variáveis obrigatórias na Vercel

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RATE_LIMIT_SECRET=
OPENAI_API_KEY=
OPENAI_OCR_MODEL=gpt-5.6-terra
```

`OPENAI_API_KEY` é necessária apenas para leitura assistida. Nenhuma variável
secreta pode receber o prefixo `NEXT_PUBLIC_`.

## Checklist de publicação

1. Confirmar que todas as migrations foram aplicadas no projeto correto.
2. Configurar as variáveis nos ambientes Production e Preview da Vercel.
3. Confirmar o domínio publicado nas configurações do Supabase Auth.
4. Testar login, logout e expiração de sessão.
5. Testar administrador, supervisor e operador separadamente.
6. Testar cadastro de empresa, posto e funcionário.
7. Testar lançamento antes da folha e anexação posterior.
8. Testar leitura assistida com revisão obrigatória.
9. Testar PDF consolidado com a folha original.
10. Manter backup e política de retenção dos documentos.
