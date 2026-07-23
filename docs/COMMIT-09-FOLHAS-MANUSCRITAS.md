# Commit 09 — Folhas manuscritas

- Login exclusivo para administrador, supervisor e operador.
- Funcionários são cadastros sem conta no Auth.
- Portal, câmera, GPS, dispositivos e comprovantes REP-P foram removidos da aplicação.
- Upload privado da folha assinada em PDF, JPEG ou PNG, limitado a 10 MB.
- SHA-256 do documento original e prevenção de duplicidade.
- Lotes por empresa, posto e competência.
- Digitação diária de horários e ocorrências.
- Vínculo obrigatório entre lançamento, folha, funcionário, operador e posto.
- Fechamento mensal alimentado somente pelos lançamentos das folhas.
- Tabelas antigas preservadas no banco até a auditoria final.

## Migrations

```bash
npx supabase link --project-ref amtbwdmpysrgxztokbfm
npx supabase db push
```

As migrations `20260724070000` e `20260724070100` devem ser aplicadas juntas.
