# DS Serviços - Site institucional Next.js

Site one page, mobile first, preparado para deploy na Vercel.

## Onde colocar os vídeos

Antes de rodar o projeto ou fazer deploy, copie os vídeos MP4 para:

```text
public/videos/
```

Os nomes precisam ser exatamente:

```text
public/videos/hero.mp4
public/videos/drone.mp4
```

- `hero.mp4`: usado no fundo da Hero e também na seção **Quem Somos**.
- `drone.mp4`: usado na seção **Monitoramento por Drone**.

Recomendações para melhor performance:

- MP4/H.264.
- 10 a 25 segundos.
- Vídeo sem áudio ou áudio irrelevante, pois o site reproduz mudo.
- Idealmente até 8–12 MB cada.
- Hero em 16:9, preferencialmente 1920x1080.

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

## Ajustes desta versão

- Hero usando vídeo local em `<video>` com autoplay, muted, loop e playsInline.
- Seção **Quem Somos** usando o mesmo vídeo local da Hero, mantendo a proporção da div.
- Seção **Drone** usando vídeo local próprio, mantendo a proporção da div.
- Removido uso do player do YouTube como background, evitando controles, tela preta e atrasos do iframe.
- Menu mobile em tela cheia, com fundo escuro, blur, fechamento por link, botão, fundo e tecla `Esc`.
- Headers de segurança preservados para produção.

## Deploy na Vercel

1. Copie `hero.mp4` e `drone.mp4` para `public/videos/`.
2. Suba o projeto para o GitHub.
3. Importe o repositório na Vercel.
4. Use o build padrão do Next.js: `next build`.
