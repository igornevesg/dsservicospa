# Commit 06 — Ajustes auditáveis

## Regras

- Marcações originais nunca são alteradas nem apagadas.
- Administradores registram ajustes aprovados com justificativa.
- Supervisores enviam solicitações pendentes.
- Somente administradores aprovam ou rejeitam solicitações.
- Toda criação e decisão gera registro em `audit_logs`.
- Apenas ajustes aprovados entram no fechamento mensal.
- O CSV indica quais eventos foram ajustados.

## Migration

```bash
npx supabase link --project-ref amtbwdmpysrgxztokbfm
npx supabase db push
```

A migration é `20260724010000_ponto_commit_06_auditable_adjustments.sql`.
