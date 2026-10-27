# Nonna: fly-over 3D

Filme de 14,5 s (1440×1152, 60 fps) que sobrevoa a landing page da [Nonna Pizzaria](https://nonnapizzaria.vercel.app/) e termina num cartão com o título.

- `index.html`: o filme em WebGL2. Cada quadro é calculado a partir do tempo em `seek(t)`.
- `assets/`: a página capturada em 6 faixas (`page*.png`), as 42 peças que levantam (`L_*.png`), as posições (`layout.json`), o logo e as fontes.
- `render.js`: renderiza o MP4 com Playwright.
- `check_flow.py`: mede a prévia com fluxo óptico. Confere que o deslize nunca perde velocidade e que o voo nunca dá zoom-in.
- `capture.js`: recaptura a página, se o site mudar.

## Renderizar no PC (com GPU)

```bash
cd video/nonna-flyover
npm install
npx playwright install chromium
npm run render            # 60 fps, 16 subframes -> nonna-flyover.mp4
```

No Windows, o script usa `--use-angle=d3d11 --enable-gpu --ignore-gpu-blocklist`. O console mostra a GPU usada. Se aparecer `SwiftShader`, a GPU não foi usada; rode `node render.js --headed`.

Prévia rápida e checagem: `npm run preview` e depois `npm run check` (precisa de `pip install opencv-python`).

## Ajustes

- Frase final: `LINE1` e `LINE2` no topo do `<script>` em `index.html`.
- Câmera: `glideShare` (velocidade como fração do cruzeiro), `distance`, `tilt` e `camera(t)`.
- Peças: tabela `CFG` (altura `z` em px, ângulo `a` em graus).
