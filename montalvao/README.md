# Montalvão Motors · site

Landing page, catálogo de veículos, página de cada veículo e página institucional da Montalvão Motors.
Next.js 16 + TypeScript + Tailwind 4, exportado como site estático (`out/`), sem servidor nem banco.

## Rodar

```bash
npm install
npm run dev            # prévia em http://localhost:3000
npm run build          # gera out/ em modo PRÉVIA (selos de Demonstração/Pendente, noindex)
npm run build:publico  # gera out/ em modo PÚBLICO (só conteúdo confirmado)
npm start              # serve out/ em http://localhost:3000
```

Para o build público, defina o domínio: `NEXT_PUBLIC_SITE_URL=https://seudominio.com.br npm run build:publico`.
Ele entra no link enviado pelo WhatsApp, no Open Graph e no sitemap.

## Prévia × público

| | Prévia (`npm run build`) | Público (`npm run build:publico`) |
|---|---|---|
| Veículos com `publicado: false` | aparecem com selo **Demonstração** | não aparecem |
| Dados da loja vazios (`null`) | aparecem como **Pendente** | não aparecem |
| FAQ com `publicar: false` | aparece com selo **Pendente** | não aparece |
| Botões de WhatsApp sem número | desativados, com aviso “Número pendente” | não aparecem |
| Indexação | bloqueada (`noindex` + robots) | liberada; demonstração nunca entra no sitemap |
| `/previa/` | lista o que falta para publicar | 404 |

## Onde editar

- `content/loja.ts`: WhatsApp, telefone, Instagram, endereço, link de rota, horário, logo oficial e mensagens do WhatsApp.
- `content/veiculos.ts`: catálogo. Campo desconhecido fica `null`; `publicado: true` só com dados confirmados pela loja.
- `content/faq.ts`: perguntas frequentes; `publicar: true` só com resposta confirmada.
- `app/privacidade/page.tsx`: política de privacidade. Revise se entrar analytics, pixel ou formulário com envio.

Os filtros do catálogo (marca, carroceria, ordenação por preço/ano) aparecem sozinhos quando há dados para eles.

## Fotos e vídeo

Originais em `midia/originais/`. O script `scripts/midia.mjs` recorta (tirando tarjas de texto e o @ dos posts),
gera AVIF/WebP em várias larguras, comprime o vídeo da abertura (H.264 + AV1, 480 e 720 px) e escreve o
manifesto `content/midia.json`.

```bash
npm run midia   # precisa de ffmpeg com libx264 e libsvtav1
```

Para um carro novo: coloque as fotos em `midia/originais/`, registre o recorte em `scripts/midia.mjs`,
rode `npm run midia` e cadastre o veículo em `content/veiculos.ts` com os ids das fotos.
Só fotos do mesmo exemplar na galeria de um veículo.

## Estrutura

```
app/            páginas (home, veiculos, veiculos/[slug], a-montalvao, privacidade, previa), sitemap, robots
components/     cabeçalho, abertura com vídeo, card e catálogo, galeria, formulário, rodapé
content/        dados editáveis (loja, veículos, FAQ) e manifesto de mídia gerado
lib/            modo prévia/público, WhatsApp, formatação, helpers do catálogo
scripts/        processamento de mídia
```
