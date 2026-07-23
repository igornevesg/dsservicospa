# Commit 04 — Painel diário e evidências

## Entregas

- Visão diária das marcações no painel administrativo.
- Filtros por data, empresa, posto, status, nome e matrícula.
- Indicadores de marcações aceitas, recusadas, funcionários em jornada e evidências.
- Horário oficial do servidor em `America/Sao_Paulo`.
- Exibição da distância, precisão do GPS, motivo da recusa e dispositivo.
- Fotos permanecem no bucket privado.
- A foto é transmitida por endpoint autenticado somente após a RLS confirmar que o gestor pode acessar a empresa.
- Toda visualização de foto gera o evento `clock_evidence_viewed` em `audit_logs`.
- Respostas e imagens protegidas com `no-store`.
- Limite operacional de 500 marcações por dia.
- Índices por empresa/data e status/data.

## Aplicação

```bash
npx supabase link --project-ref amtbwdmpysrgxztokbfm
npx supabase db push

npm ci
npm run typecheck
npm run lint
npm run build
```
