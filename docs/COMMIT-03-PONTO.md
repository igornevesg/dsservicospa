# Commit 03 — Marcação de ponto

## Entregas

- Jornada diária sequencial: entrada, início do intervalo, retorno e saída.
- Foto obrigatória capturada por `getUserMedia`; não há seletor de arquivo ou galeria.
- GPS em alta precisão, sem posição em cache.
- Distância calculada no banco a partir das coordenadas oficiais do posto.
- Horário oficial definido no servidor.
- Token de captura aleatório, armazenado apenas como SHA-256, válido por dois minutos e de uso único.
- Foto JPEG armazenada em bucket privado `clock-evidence`.
- Tentativas aceitas e recusadas ficam registradas para auditoria.
- RLS permite ao funcionário ler somente as próprias marcações e ao gestor somente as empresas autorizadas.
- Base de aparelhos autorizados preparada. Quando um posto tiver aparelhos cadastrados, a validação torna-se obrigatória.
- Adaptadores web separados para futura substituição pelos plugins do Capacitor.

## Requisitos do posto

Antes de testar, o funcionário precisa estar ativo, possuir posto principal e o posto precisa ter latitude, longitude e raio configurados.

## Aplicação

```bash
npx supabase link --project-ref amtbwdmpysrgxztokbfm
npx supabase db push

npm ci
npm run typecheck
npm run lint
npm run build
```

Câmera e geolocalização exigem HTTPS em produção. Em desenvolvimento, `localhost` é aceito pelos navegadores modernos.
