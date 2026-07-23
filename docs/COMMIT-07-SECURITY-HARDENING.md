# Commit 07 — Segurança operacional

## Entregas

- Rate limiting atômico no PostgreSQL para login e criação de desafios de ponto.
- Identificadores do rate limit armazenados apenas como SHA-256 com segredo do servidor.
- Bloqueio temporário após excesso de tentativas.
- Cadastro, ativação e desativação de celulares autorizados por posto.
- Identificador do aparelho exibido no portal do funcionário.
- Toda mudança de autorização gera `audit_logs`.
- Quando um posto possui qualquer aparelho cadastrado, somente aparelhos ativos podem marcar.
- Função segura para limpar desafios expirados após 24 horas.

## Variável recomendada

Crie um segredo aleatório exclusivo no ambiente de produção:

```env
RATE_LIMIT_SECRET=gere-um-segredo-aleatorio-longo
```

Se ele não for informado, o backend usa a `SUPABASE_SERVICE_ROLE_KEY` como chave do hash. O segredo nunca recebe o prefixo `NEXT_PUBLIC_`.

## Retenção

Este commit não apaga marcações, fotos, ajustes ou auditorias automaticamente. A retenção desses dados deve ser definida após revisão trabalhista e de LGPD. Apenas tokens de captura expirados podem ser limpos pela função `cleanup_expired_clock_tokens()`.

## Migration

```bash
npx supabase link --project-ref amtbwdmpysrgxztokbfm
npx supabase db push
```
