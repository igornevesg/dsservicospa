# DS Serviços — Site Next.js

Projeto final preparado para deploy na Vercel.

## Rodar localmente

```bash
npm install
npm run dev
```

Abra: http://localhost:3000

## Checklist antes do deploy

```bash
npm run check
```

Este comando executa typecheck, lint, build e auditoria de segurança.

## Produção

- Headers de segurança ficam ativos somente em produção para não quebrar o ambiente local.
- CSP permite WhatsApp, YouTube e imagens do Unsplash usadas no layout.
- Formulário envia os dados para o WhatsApp da DS Serviços.
- Site mobile first, com menu hamburger funcional e responsividade desktop/tablet/mobile.

## Próximo ajuste recomendado

Quando selecionar as imagens definitivas, baixe-as, converta para WebP/AVIF e substitua as URLs remotas por arquivos locais em `public/images/`.
