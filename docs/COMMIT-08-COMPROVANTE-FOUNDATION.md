# Commit 08 — Fundação do comprovante

## Entregas

- NSR global, sequencial e exclusivo para cada marcação aceita.
- Hash SHA-256 calculado no PostgreSQL antes da gravação.
- Backfill determinístico de NSR e hash para marcações aceitas existentes.
- Tentativas recusadas não recebem NSR.
- Configuração administrativa do empregador, desenvolvedor e registro INPI.
- Comprovante técnico disponível imediatamente após a marcação.
- Consulta dos comprovantes das últimas 48 horas no portal do funcionário.
- CPF completo retornado somente ao próprio funcionário autenticado.

## Limite de conformidade desta etapa

Este commit ainda não emite PDF assinado em PAdES. Para utilização formal como REP-P ainda serão necessários:

- registro real do programa no INPI;
- certificado digital ICP-Brasil;
- geração e assinatura PAdES do PDF;
- AFD e assinatura CAdES;
- AEJ pelo programa de tratamento;
- Atestado Técnico e Termo de Responsabilidade;
- revisão técnica, trabalhista e jurídica.

O sistema identifica o documento atual como `Comprovante técnico` para não induzir conformidade inexistente.

## Migration

```bash
npx supabase link --project-ref amtbwdmpysrgxztokbfm
npx supabase db push
```
