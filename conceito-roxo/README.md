# Seu próximo movimento — estudo de interface

Site conceitual de uma fintech, contado em movimento pela rolagem. Estudo independente de design, **sem vínculo com a Nubank**; todos os valores são fictícios.

## Como rodar

As fontes são locais e o navegador bloqueia fontes em `file://`, então sirva por HTTP:

```bash
cd Tutifruti            # raiz do repositório
python3 -m http.server 8000
# abra http://localhost:8000/conceito-roxo/
```

Funciona igual no GitHub Pages. Não tem build nem dependências.

## Estrutura

| Arquivo | O que faz |
|---|---|
| `index.html` | As cenas, em ordem: abertura → transformação → painel → ritmo → vídeo → fechamento → conceito |
| `css/style.css` | Tokens (3 neutros + roxo), layout de cada cena, versão de celular, entrada por tempo |
| `js/engine.js` | Mede as cenas, suaviza a rolagem (lerp) e chama as cenas a cada frame |
| `js/card.js` | Chaves de posição do cartão (uma lista para desktop, outra para celular) |
| `js/scenes.js` | Uma função por cena, com as janelas de progresso de cada grupo |
| `js/main.js` | Entrada inicial, planejador de demonstração, botão de movimento reduzido |

Para mudar o tempo de uma cena, altere a altura dela (`.scene--painel{height:380vh}`) ou as janelas `seg(p, início, fim)` em `scenes.js`.

## Assets (troque mantendo o nome do arquivo)

| Arquivo | Uso | Origem |
|---|---|---|
| `assets/cartao.png` / `.webp` / `-1000.webp` | Cartão do site (recorte justo, 2109×1505, fundo transparente) | Render 3D em código (`assets/fonte/cartao.html`) |
| `assets/cartao-roxo.png` | Cartão com margem ampla (3200×2400), para outros usos | Mesmo render |
| `assets/fundo.jpg`, `fundo-1280.jpg`, `fundo-4k.png` | Fundo escuro com luz roxa nas laterais | Gerado em numpy (`assets/fonte/fundo.py`) |
| `assets/video.mp4` / `.webm` + `video-poster.jpg` | Vídeo ilustrativo vertical (9:16), sem som | Enviado pelo usuário |

Se trocar o cartão por outra imagem, mantenha a mesma proporção (≈ 1,40 : 1) ou ajuste `width`/`height` do `<img>` em `index.html`.
Não há logo: sem logo oficial anexada, o site usa só o nome do estudo em texto.

## Acessibilidade e movimento

- Rolagem nativa: nada é sequestrado, links da navegação funcionam desde o primeiro frame.
- `prefers-reduced-motion` ou o botão "Reduzir movimento do site" trocam deslocamentos por cortes secos e opacidade.
- Vídeo só toca quando está na tela, sem som, com botão de pausa.
- Foco visível, link para pular ao conteúdo, `details/summary` nativos no conceito.
