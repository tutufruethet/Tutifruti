# Receitas testadas

Código que funcionou nos sites do projeto Tutifruti (demo, portfólio de fotos e ilha 3D). Copie e adapte.

## Índice
1. Revelação por linha e fade
2. IntersectionObserver: armadilha do clip-path
3. Palavras que acendem com o scroll
4. Prévia que segue o cursor (lerp)
5. Foto em WebGL com ondulação no cursor
6. Fundo vivo: shader de tela cheia
7. Three.js: setup, bloom e tone mapping
8. Vendorizar o Three.js sem CDN
9. Mundo 3D: grama, ciclo, física (assets/3d)
10. Câmera de seguir e órbita
11. Transição diagonal entre níveis
12. Testes com Playwright e gancho #debug
13. Publicar como artifact com vários arquivos

## 1. Revelação por linha e fade
```html
<h1 data-reveal><span class="line" style="--i:0"><span>Um portfólio</span></span>
<span class="line" style="--i:1"><span>que você <em class="serif">dirige.</em></span></span></h1>
```
```css
.line{display:block;overflow:hidden;padding-bottom:.16em;margin-bottom:-.16em}
.line>span{display:inline-block;transform:translateY(110%);transition:transform 1.2s var(--ease) calc(var(--i,0)*80ms)}
.in .line>span{transform:none}
[data-fade]{opacity:0;transform:translateY(1.2rem);transition:opacity 1s var(--ease) calc(var(--i,0)*80ms),transform 1s var(--ease) calc(var(--i,0)*80ms)}
.in [data-fade],[data-fade].in{opacity:1;transform:none}
```
Para o primeiro quadro: aplique `.in` no hero logo depois do loader. Dentro de um artifact, nada importante pode ficar em `opacity:0` esperando o scroll.

## 2. IntersectionObserver: armadilha do clip-path
Um elemento com `clip-path: inset(100% 0 0 0)` tem área visível zero, e o **IO nunca dispara** para ele. Observe o **contêiner** e aplique a classe no filho:
```js
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting || e.boundingClientRect.top < 0) { (e.target.ph || e.target).classList.add('in'); io.unobserve(e.target); }
}), { rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('.ph').forEach(ph => { ph.parentElement.ph = ph; io.observe(ph.parentElement); });
```
O `top < 0` revela o que foi pulado por âncora ou scroll rápido.

## 3. Palavras que acendem com o scroll
```js
mp.innerHTML = mp.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ');
const k = clamp01((innerHeight * .85 - r.top) / (r.height + innerHeight * .4));
words.forEach((w, i) => w.classList.toggle('on', i < Math.round(k * words.length)));
// .w{opacity:.15;transition:opacity .3s linear} .w.on{opacity:1}
```

## 4. Prévia que segue o cursor (lerp)
Use `damp(a, b, k, dt) = a + (b - a) * (1 - exp(-k * dt))` no rAF para a posição. A escala fica num elemento interno com transição CSS (`.on .preview__in{transform:translate(-50%,-50%) scale(1)}`). Esconda com `@media (hover:none)`.

## 5. Foto em WebGL com ondulação no cursor
Shader de tela cheia que amostra a foto (cover-fit em `uv`), com onda `sin(r*38. - t*4.) * exp(-r*5.) * .018 * hover` a partir do mouse e RGB shift proporcional à velocidade do mouse. A textura precisa vir por HTTP: abrindo via `file://`, o WebGL bloqueia (tainted canvas). Deixe um `<img>` por baixo como fallback.

## 6. Fundo vivo: shader de tela cheia
Um triângulo `[-1,-1, 3,-1, -1,3]` + fbm com domain warping (`q = fbm(p)`, `r = fbm(p + q)`, `f = fbm(p + r)`) + mouse empurrando `p -= (p - m) * .45 * exp(-d*d*5.)` (suave, sem singularidade) + grão + vinheta. Pause com IO fora da tela. Com `reduce`, renderize um frame parado.

## 7. Three.js: setup, bloom e tone mapping
```js
renderer.setPixelRatio(Math.min(devicePixelRatio, high ? 1.75 : 1.5));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;           // preserva as cores
const composer = new EffectComposer(renderer);              // HalfFloat: aceita HDR
composer.addPass(new RenderPass(scene, camera));
if (high) composer.addPass(new UnrealBloomPass(size, 0.55, 0.45, 1)); // threshold 1
composer.addPass(new OutputPass());                         // tone map + sRGB no fim
```
- Emissivo que brilha: `color.multiplyScalar(2)` em MeshBasic ou `emissiveIntensity` > 1.
- ShaderMaterial próprio renderiza em linear; deixe o OutputPass converter (sempre use o composer).
- Luzes (r155+ físicas): sol ~2,5, hemisfério ~1,1. A sombra colorida vem do `groundColor` do HemisphereLight.
- Sombra que segue o jogador: mova `sun.position` e `sun.target` com o foco, ortho de ±30.

## 8. Vendorizar o Three.js sem CDN
O registry do npm costuma ser acessível mesmo quando CDNs estão bloqueados:
```bash
curl -sO https://registry.npmjs.org/three/-/three-0.170.0.tgz && tar xzf three-0.170.0.tgz
# copie package/build/three.module.min.js + examples/jsm usados (postprocessing/*, shaders/*, loaders/FontLoader, geometries/TextGeometry) + LICENSE
```
```html
<script type="importmap">{ "imports": { "three": "./vendor/three/build/three.module.min.js", "three/addons/": "./vendor/three/examples/jsm/" } }</script>
```
Não rode `npm install` de projetos de terceiros (scripts desconhecidos). Baixar um tarball conhecido é ok.

## 9. Mundo 3D: módulos em assets/3d
- `grass.js`: `createGrass({ subdivisions, size, island, path:{radius,width}, hide:[Vector4(x,z,r,soft)] })`. Atualize por frame: `uTime`, `uCenter` (centro um pouco à frente do carro, para cobrir a vista inclinada), `uCar`, `uLit` (sol*0.32 + céu*0.42), `uFog*`. 270² lâminas no desktop e 150² no celular.
- `cycle.js`: `new DayCycle(240)`, depois `update(dt)` e `state.{sun,sunI,sky,ground,hemiI,fogA,fogB,lamp,night}`. `next()` avança animado até a próxima fase.
- `physics.js`: círculos no XZ, `addStatic(x,z,r)`, `addBody({x,z,r,m,h,friction})`, `step(dt, car)`. O impulso chama `onHit(impacto, nx, nz)`. Para derrubar: eixo `(nz,0,-nx)` e ângulo indo a π/2 com mola; levantar depois de 9 s longe do carro.
- Carro arcade: velocidade separada em frente/lateral; aderência = `lateral *= exp(-6.5*dt)` (dá drift); curva proporcional à velocidade; pitch/roll por aceleração/curva com damp; rodas giram `speed*dt/raio`.
- Chão: CircleGeometry com textura canvas (pixel = `(X+R)/(2R)*W`, `(Z+R)/(2R)*H` após `rotation.x=-π/2`). Textos no chão em planos com CanvasTexture (espere `document.fonts.load` antes).

## 10. Câmera de seguir e órbita
```js
target.set(car.x + car.vx*.3, .8, car.z + car.vz*.3);          // antecipa o movimento
desired.set(target.x, target.y + 17*z, target.z + 16*z);       // ângulo fixo, como o Bruno
camPos.x = damp(camPos.x, desired.x, 4, dt); camLook.lerp(target, 1 - Math.exp(-6*dt));
```
Retrato (aspect < 0.8): zoom ×1,75. Nível de apresentação: órbita lenta, raio de 70 e névoa near/far bem maiores.

## 11. Transição diagonal entre níveis
```css
.wipe{position:fixed;inset:-10% -40%;background:var(--accent);transform:translateX(-120%) skewX(-14deg)}
.wipe.in{transform:translateX(0) skewX(-14deg);transition:transform .65s cubic-bezier(.7,0,.3,1)}
.wipe.out{transform:translateX(120%) skewX(-14deg);transition:transform .7s cubic-bezier(.7,0,.3,1)}
```
Fluxo: `in` → esperar 650ms → trocar o estado (mostrar/ocultar, mudar a câmera) → `out` → limpar.

## 12. Testes com Playwright e gancho #debug
```js
chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] })
```
- Sirva por HTTP (`python3 -m http.server`).
- Prints em 1440×900 e 375×812 (`isMobile`, `hasTouch`). Confira `document.documentElement.scrollWidth` e se `scrollX` fica em 0.
- Sem GPU o FPS cai muito. No `main.js`, use `if (location.hash === '#debug') window.ilha = { car, cycle, world, physics, ... }` e rode a física num laço (`car.update(1/60, input); physics.step(1/60, car)`) para testar batidas.
- O print pode mostrar áreas em branco por atraso de pintura; role 1px e tire de novo antes de concluir que é bug.
- Salve prints e scripts no scratchpad, com caminho absoluto.

## 13. Publicar como artifact com vários arquivos
- O arquivo principal não leva `<!doctype>`, `<html>`, `<head>` nem `<body>`. Classes ou atributos que estariam no `<body>` devem ser aplicados por JS.
- Mande os módulos, o vendor, as fontes JSON e as imagens em `files` (`{"js/main.js":"js/main.js", ...}`) com `root` na pasta. Ajuste caminhos que apontem para fora (`../`).
- O importmap inline e os módulos próprios funcionaram dentro do app do Claude.
