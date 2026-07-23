# Commit 10 - Funcionários, leitura assistida e PDF consolidado

## Entregas

- Cadastro rápido de funcionários sem conta de login, vinculados a empresa e posto.
- Upload privado de folha manuscrita assinada em PDF, JPEG ou PNG.
- Leitura assistida por IA com correspondência ao cadastro de funcionários.
- Revisão humana obrigatória antes da gravação de qualquer horário.
- Histórico da extração e auditoria da confirmação.
- PDF consolidado com relatório dos lançamentos e a folha original anexada.

## Configuração

```env
OPENAI_API_KEY=chave_apenas_no_servidor
OPENAI_OCR_MODEL=gpt-5.6-terra
```

Nunca use o prefixo `NEXT_PUBLIC_` na chave da OpenAI.

## Banco

```bash
npx supabase link --project-ref amtbwdmpysrgxztokbfm
npx supabase db push
```

A migration deste commit é:

```text
supabase/migrations/20260724090000_ponto_commit_10_ocr_and_documents.sql
```

## Segurança

A leitura não cria ponto automaticamente. Ela gera uma proposta editável, e somente
as linhas conferidas pelo operador são persistidas. A folha fica em bucket privado,
o arquivo temporário enviado para leitura é excluído ao término e a API usa
`store: false`.
