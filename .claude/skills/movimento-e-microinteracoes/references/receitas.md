# Receitas de movimento

Código próprio, em JS puro, escrito a partir das ideias estudadas (r3f, maath, Ecctrl, pmndrs/examples; todos MIT). Funciona igual dentro de `useFrame((state, delta) => …)`.

## 1. Amortecimento independente de quadros

```js
// λ (lambda) ~ "velocidade": 4 = macio, 10 = firme, 20 = quase colado.
export const damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt));

// Ângulo pelo caminho curto
export const dampAngle = (a, b, lambda, dt) => {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + d * (1 - Math.exp(-lambda * dt));
};
```

O `maath/easing` da pmndrs (`damp`, `damp3`, `dampC`, `dampQ`) faz o mesmo papel com uma mola crítica parametrizada por `smoothTime`; nos exemplos ele aparece em 23 de 199 demos para câmera, escala e cor.

## 2. Mola com sub-passos fixos (peso e quique)

```js
// k = rigidez, c = amortecimento. c = 2·√k é amortecimento crítico (sem quique).
export function stepSpring(s, target, k, c, dt) {
  dt = Math.min(dt, 1 / 30);              // aba voltou do fundo: não explode
  const h = 1 / 240;                       // passo fixo
  let t = dt;
  while (t > 1e-6) {
    const step = Math.min(h, t);
    const force = k * (target - s.x) - c * s.v;   // a mesma forma do "floating force" do Ecctrl
    s.v += force * step;                          // Euler semi-implícito: velocidade primeiro
    s.x += s.v * step;
    t -= step;
  }
  return s;
}
export const atRest = (s, target, eps = 1e-3) => Math.abs(target - s.x) < eps && Math.abs(s.v) < eps;
```

Squash e stretch a partir da velocidade, preservando volume:

```js
const stretch = 1 + Math.min(Math.abs(s.v) * 0.04, 0.25);
mesh.scale.set(1 / Math.sqrt(stretch), stretch, 1 / Math.sqrt(stretch));
```

## 3. Arrastar com inércia + clique vs arrasto

```js
let dragging = false, lastX = 0, vel = 0, moved = 0;
el.addEventListener('pointerdown', (e) => {
  dragging = true; lastX = e.clientX; moved = 0; vel = 0;
  el.setPointerCapture(e.pointerId);              // continua recebendo fora do elemento
  requestFrame();
});
el.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const dx = e.clientX - lastX; lastX = e.clientX; moved += Math.abs(dx);
  rotation += dx * 0.01; vel = dx * 0.01 * 60;    // rad/s aproximado
  requestFrame();
});
el.addEventListener('pointerup', () => { dragging = false; });
el.addEventListener('click', (e) => { if (moved > 6) e.preventDefault(); /* foi arrasto */ });

// no loop:
if (!dragging) { rotation += vel * dt; vel *= Math.exp(-4 * dt); }
const animating = dragging || Math.abs(vel) > 0.01;
```

No r3f o mesmo cuidado já existe: o `onClick` de um objeto só dispara se ele estava sob o ponteiro no `pointerdown` (`initialHits`), e `onPointerMissed` resolve "clicou no vazio".

Acessível: `tabindex="0"`, `role="img"` ou `role="application"` com `aria-label`, e setas do teclado mudando o mesmo alvo.

## 4. Curva de resposta em tabela (LUT)

Ideia do Ecctrl (`bakeCurveLUT`/`evaluateCurveLUT`): avalie uma curva cara uma vez e leia por índice no loop.

```js
export function bakeLUT(fn, samples = 64) {
  const lut = new Float32Array(samples);
  for (let i = 0; i < samples; i++) lut[i] = fn(i / (samples - 1));
  return (x) => {
    const f = Math.min(Math.max(x, 0), 1) * (samples - 1);
    const i = Math.floor(f), j = Math.min(i + 1, samples - 1);
    return lut[i] + (lut[j] - lut[i]) * (f - i);
  };
}
const grip = bakeLUT((x) => Math.sin(Math.min(x * 2, 1) * Math.PI / 2) * (1 - 0.3 * x));
```

## 5. Progresso de scroll

```js
const progress = () => {
  const r = section.getBoundingClientRect();
  return Math.min(Math.max(-r.top / (r.height - innerHeight), 0), 1);
};
const range = (p, from, len) => Math.min(Math.max((p - from) / len, 0), 1); // 0→1 dentro da faixa
const curve = (p, from, len) => Math.sin(range(p, from, len) * Math.PI);   // 0→1→0 (sino)
```

`curve` é o que a pmndrs usa em `horizontal-tiles` para crescer o item em foco e tirar o cinza dele. Leia o scroll num `ref` dentro do loop; não guarde em estado reativo.

## 6. Reveal por linha com máscara (regra da casa)

```css
.line { display:block; overflow:hidden; padding-bottom:.16em; }
.line > span { display:block; transform:translateY(110%); transition:transform 1.1s cubic-bezier(.16,1,.3,1); }
.is-in .line > span { transform:none; }
.is-in .line:nth-child(2) > span { transition-delay:.08s; }
@media (prefers-reduced-motion: reduce) { .line > span { transform:none; transition:none; } }
```

## 7. Loop que dorme

```js
let raf = 0, running = false, last = 0, frames = 0;
export function requestFrame() {
  if (raf) return;
  if (!running) { running = true; last = performance.now(); } // acordou: dt começa pequeno
  raf = requestAnimationFrame(tick);
}
function tick(now) {
  raf = 0;
  const dt = Math.min((now - last) / 1000, 1 / 30); last = now;
  const keepGoing = update(dt);  // devolve true enquanto algo anda
  render(); frames++;            // exponha `frames` para teste (window.__app.frames)
  if (keepGoing && visible) requestFrame(); else running = false;
}
```

É o `frameloop="demand"` + `invalidate()` do r3f em versão vanilla: qualquer evento que muda algo chama `requestFrame()`; várias chamadas no mesmo quadro viram um quadro só.
