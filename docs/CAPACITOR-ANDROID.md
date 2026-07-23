# Preparação para Capacitor Android

## Estratégia adotada
O sistema usa recursos de servidor do Next.js e Supabase Auth. Por isso, o aplicativo interno Android será um contêiner Capacitor apontando para a versão HTTPS publicada, preservando middleware, cookies HttpOnly, APIs e validações no servidor.

O código de câmera, localização e dispositivo está isolado em `src/lib/platform`. No Commit 02, os adaptadores web e nativos serão implementados sem alterar as regras de negócio.

## Instalação futura do runtime nativo
Quando o fluxo de ponto estiver estabilizado:

```bash
npm install @capacitor/core @capacitor/android \
  @capacitor/camera @capacitor/geolocation @capacitor/device @capacitor/app
npm install -D @capacitor/cli
npx cap add android
```

Antes de sincronizar:

```bash
export CAPACITOR_SERVER_URL=https://SEU-DOMINIO-HTTPS
npm run mobile:check
npx cap sync android
npx cap open android
```

## Regras já preparadas
- `appId`: `br.com.dsservicos.ponto`;
- nome: `Ponto DS Serviços`;
- somente URL HTTPS;
- sem conteúdo misto;
- câmera sem salvamento na galeria;
- localização com alta precisão e sem cache;
- permissões HTTP liberadas apenas para câmera e geolocalização da própria aplicação;
- abstrações independentes para Web e Android.

## Observação de segurança
A presença no Capacitor não substitui validações do servidor. Horário oficial, raio do posto, sessão, sequência da jornada, token da captura e auditoria continuarão validados no backend.
