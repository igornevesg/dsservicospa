# Commit 05 — Fechamento mensal

## Entregas

- Nova rota administrativa `/administrativo/ponto/relatorios`.
- Competência mensal protegida pelo mesmo Auth, middleware e RLS.
- Agrupamento por funcionário e dia.
- Cálculo das horas a partir de pares de marcações aceitas.
- Total do intervalo e indicação de jornada completa ou pendente.
- Contagem de tentativas recusadas sem apagá-las ou convertê-las em ponto.
- Filtros por empresa, funcionário e pendências.
- Exportação CSV UTF-8 com separador `;`, compatível com Excel em português.
- Limite explícito de 5.000 tentativas por competência.

## Regra importante

O fechamento não cria, altera nem completa marcações. Jornadas incompletas permanecem pendentes para conferência administrativa e futura rotina de ajuste auditável.

## Validação

```bash
npm ci
npm run typecheck
npm run lint
npm run build
```
