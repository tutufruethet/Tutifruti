# Módulo — Administradora de Condomínios

Site para a Módulo (Olinda, PE). **Conceito:** *seu prédio, andar por andar.* A rolagem sobe pela fachada de um prédio (cada janela é uma família, cada andar uma rotina, cada rotina um módulo) e depois mostra um dia inteiro do condomínio, das 7h às 22h. Os serviços aparecem como seis pastas de arquivo, e a página fecha com o pedido de proposta pelo WhatsApp.

- HTML, CSS e JS puros, sem build. [Motion 12.43](https://motion.dev) e [Lenis 1.3.26](https://lenis.darkroom.engineering) ficam em `js/vendor/`.
- Rodar localmente: `npx serve .` dentro desta pasta (a sequência de quadros precisa de HTTP).
- Docs: [referências aplicadas](docs/referencias.md) · [copy em 15 blocos](docs/copy.md)

## Deploy na Vercel

1. Em vercel.com → **Add New → Project**, importe o repositório.
2. Em **Root Directory**, escolha `modulo`. Framework: **Other**. Deixe build e output vazios.
3. **Deploy.** O `vercel.json` já configura o cache de `media/` e `js/vendor/`, e o `404.html` é usado sozinho.
4. Depois de ligar o domínio, troque `og:image` em `index.html` pela URL absoluta (`https://dominio/media/og.jpg`).

## Onde colar os links do cliente

No topo de `js/main.js`:

```js
const LINKS = {
  boleto: '', // 2ª via de boleto
  area: '',   // área do cliente
};
const WA = '5581987879978';
```

Enquanto os links estiverem vazios, os botões "2ª via de boleto" e "Área do cliente" abrem o WhatsApp com a mensagem pronta. Ou seja, nenhum botão fica quebrado.

## Atos da página

| # | Seção | O que acontece |
|---|---|---|
| 01 | Subida (hero) | 90 quadros de um drone subindo pela fachada, desenhados num canvas e controlados pela rolagem. O indicador de andar vai de 01 até "COB" e há 5 capítulos de texto. |
| — | Manifesto | O texto acende palavra por palavra. |
| 02 | Um dia no seu prédio | 4 vídeos: 07h morador, 11h obra na fachada, 16h torre, 22h luzes. O relógio é um odômetro e há uma linha do tempo. |
| 03 | As pastas | 6 departamentos num trilho horizontal: a cor de fundo muda, o nome aparece gigante atrás da pasta e a pasta abre. |
| 04 | Diferenciais | Lista em linhas finas com prévia de imagem que segue o cursor. |
| 05 | Área do cliente | Celular com as funções do app e boletos que abrem em leque. |
| 06 | Parceiros | Letreiro corrido com os 7 parceiros do site atual. |
| 07 | Proposta | Cartão com vídeo e formulário real que envia pelo WhatsApp ou por e-mail. |
| 08 | Perguntas | FAQ montado só com fatos do site atual. |
| 09 | Onde estamos | Mapa, horários, aviso de "aberto agora" pelo horário de Olinda e wordmark gigante. |

## Direção de arte

- **Paleta:** tinta `#0e1522`, papel `#eeebe5`, cinza `#5f646d`, acento laranja do logo `#ee7623`. Nas pastas entram tons da mesma família (azul do logo `#1e3a5f`, areia e concreto), uma cor por departamento, como no carrossel da referência.
- **Fontes:** Archivo (variável, larguras de 75 a 125) e Instrument Serif itálico para uma palavra por título.
- **Movimento:** um easing só, expo-out `cubic-bezier(.16,1,.3,1)`; texto revelado por linha com máscara; respeita `prefers-reduced-motion`.

## Efeitos e de onde vieram

| Efeito | Fonte | Onde |
|---|---|---|
| Sequência de quadros no canvas | NãoCodei, efeito 03 | Hero |
| Texto que se preenche | NãoCodei, efeito 04 | Manifesto |
| Galeria horizontal | NãoCodei, efeito 02 | Pastas |
| Odômetro | NãoCodei, efeito 18 | Andar, relógio |
| Título letra por letra | Motionsites, prompt grátis **VEX Ventures** | Hero |
| Cartão com vídeo e formulário | Motionsites, prompt grátis **Build With Us** | Proposta |
| Marquee | Magic UI, Marquee | Parceiros |
| `scroll()` e `inView()` | motion.dev | Todas as seções com rolagem |

## Pendências (dados que o cliente precisa mandar)

- [ ] Link da **2ª via de boleto** e da **área do cliente**
- [ ] Confirmar se **(81) 98787-9978** é o WhatsApp
- [ ] **Logo em vetor** (SVG/AI). O site usa um wordmark tipográfico e um ícone redesenhado a partir do print.
- [ ] Logos dos **parceiros** em alta resolução (os atuais vêm do site antigo e são pequenos)
- [ ] Nome do **aplicativo** e links da App Store e do Google Play, se houver
- [ ] **Fotos reais** de prédios administrados pela Módulo (com autorização) para trocar os vídeos de banco
- [ ] Ano de fundação, número de condomínios atendidos e 3 depoimentos de síndicos (não entraram para não inventar)
- [ ] Link da **política de privacidade** (LGPD) para o formulário

## Créditos

- Vídeos: [Mixkit](https://mixkit.co/license/#videoFree) (licença gratuita): 26154 (drone na fachada), 12169, 32450, 254, 31994 e 49832.
- Ícones: [Lucide](https://lucide.dev) (ISC). Fontes: Google Fonts (OFL).
- Motion e Lenis: MIT (licenças em `js/vendor/`).
- Logos de parceiros e textos de serviço: site atual da Módulo.
