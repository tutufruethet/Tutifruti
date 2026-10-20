/* Prado — one scroll-scrubbed meadow drives the opening acts and the order preview. */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const wait = ms => new Promise(r => setTimeout(r, ms));
const WHATSAPP = ''; // [INSERIR NÚMERO com DDI, ex.: 5511999999999]; vazio abre o WhatsApp para escolher o contato

// `src` is the frame number in the original animation; acts and holds are found from it.
const SEASONS = {
  musgo:   { name: 'Musgo',   acc: '#61702c', hold: 150 },
  agua:    { name: 'Água',    acc: '#287c78', hold: 215 },
  papoula: { name: 'Papoula', acc: '#c63a31', hold: 365 },
  lavanda: { name: 'Lavanda', acc: '#7d5cc2', hold: 65 },
};
const ACT_COLOR = { musgo: 'musgo', agua: 'agua', papoula: 'papoula', lavanda: 'lavanda', fim: 'musgo' };

const root = document.documentElement;
const setAccent = id => root.style.setProperty('--acc', SEASONS[id].acc);

/* ---------- frames: load coarse to fine, draw with cross-fade ---------- */
const M = await fetch('frames/manifest.json').then(r => r.json()).catch(() => null);
// Desktop gets the AI-upscaled 1920 px set (Real-ESRGAN); phones keep the light 960 px one.
if (M?.hd && innerWidth >= 1024) Object.assign(M, M.hd);
const frames = [];
let loaded = 0;
const listeners = new Set();
function loadFrames() {
  const n = M.count, order = [], seen = new Set();
  for (const s of [16, 8, 4, 2, 1]) for (let i = 0; i < n; i += s) if (!seen.has(i)) { seen.add(i); order.push(i); }
  let next = 0, active = 0;
  const pump = () => {
    while (active < 6 && next < order.length) {
      const i = order[next++], img = new Image();
      active++;
      img.decoding = 'async';
      img.onload = () => { frames[i] = img; loaded++; active--; listeners.forEach(f => f(i)); pump(); };
      img.onerror = () => { active--; pump(); };
      img.src = `${M.dir}${String(i).padStart(4, '0')}.${M.ext}`;
    }
  };
  pump();
}
const near = i => { for (let d = 0; d < M.count; d++) { if (frames[i - d]) return frames[i - d]; if (frames[i + d]) return frames[i + d]; } return null; };
const actRange = name => M.acts[name];
const kOf = (src, act) => { const [a, b] = actRange(act); let best = a; for (let k = a; k <= b; k++) if (Math.abs(M.src[k] - src) < Math.abs(M.src[best] - src)) best = k; return best; };

// Average colour of a frame's top or bottom strip, used to extend the scene on tall screens.
const edgeCache = new Map(), probe = document.createElement('canvas');
probe.width = 16; probe.height = 1;
const pg = probe.getContext('2d', { willReadFrequently: true });
const CUT = M ? Math.round(M.h * 0.0905) : 0; // the source frames darken toward their top edge; tall screens skip that strip
function edge(img, i, bottom) {
  const key = i * 2 + (bottom ? 1 : 0);
  if (edgeCache.has(key)) return edgeCache.get(key);
  pg.drawImage(img, 0, bottom ? M.h - 24 : CUT, M.w, 24, 0, 0, 16, 1);
  const d = pg.getImageData(0, 0, 16, 1).data;
  let r = 0, gg = 0, b = 0;
  for (let k = 0; k < 64; k += 4) { r += d[k]; gg += d[k + 1]; b += d[k + 2]; }
  const c = `rgb(${r >> 4},${gg >> 4},${b >> 4})`;
  edgeCache.set(key, c);
  return c;
}

function painter(canvas, { fit = 'stage' } = {}) {
  const g = canvas.getContext('2d', { alpha: false });
  let w = 0, h = 0;
  const size = () => {
    const dpr = Math.min(devicePixelRatio, 2);
    w = canvas.width = Math.round(canvas.clientWidth * dpr);
    h = canvas.height = Math.round(canvas.clientHeight * dpr);
    g.imageSmoothingQuality = 'high'; // resizing the canvas resets this
  };
  size();
  addEventListener('resize', size);
  function place() {
    const iw = M.w, ih = M.h;
    if (fit === 'stage' && w / h < 1.05) {
      // Portrait: frame in the upper part, sky and hill extended from its edge rows.
      const dh = h * 0.6, dw = dh * iw / ih;
      return { dx: w / 2 - 0.53 * dw, dy: h * 0.11, dw, dh: dh * (ih - CUT) / ih, extend: true };
    }
    if (fit === 'stage') {
      // Wide screens: zoom a little and crop from the right so the chair sits clear of the copy column.
      const s = Math.max(w / iw, h / ih) * 1.12, dw = iw * s, dh = ih * s;
      return { dx: (w - dw) * 0.08, dy: (h - dh) * 0.2, dw, dh, extend: false };
    }
    const s = Math.max(w / iw, h / ih), dw = iw * s, dh = ih * s;
    return { dx: (w - dw) / 2, dy: (h - dh) / 2, dw, dh, extend: false };
  }
  function blit(img, alpha, p, i) {
    g.globalAlpha = alpha;
    if (p.extend) {
      // Flat sky above and flat hill below, each blended into the frame edge.
      const top = edge(img, i, false), bot = edge(img, i, true), fade = p.dh * 0.3, y1 = p.dy + p.dh;
      g.fillStyle = top; g.fillRect(0, 0, w, p.dy + 1);
      g.fillStyle = bot; g.fillRect(0, y1 - 1, w, h - y1 + 1);
      g.drawImage(img, 0, CUT, M.w, M.h - CUT, p.dx, p.dy, p.dw, p.dh);
      let gr = g.createLinearGradient(0, p.dy, 0, p.dy + fade);
      // Fade to the same colour at zero alpha: fading to transparent black leaves a grey band.
      gr.addColorStop(0, top); gr.addColorStop(1, top.replace('rgb', 'rgba').replace(')', ',0)'));
      g.fillStyle = gr; g.fillRect(0, p.dy, w, fade);
      gr = g.createLinearGradient(0, y1 - fade, 0, y1);
      gr.addColorStop(0, bot.replace('rgb', 'rgba').replace(')', ',0)')); gr.addColorStop(1, bot);
      g.fillStyle = gr; g.fillRect(0, y1 - fade, w, fade);
      return;
    }
    g.drawImage(img, p.dx, p.dy, p.dw, p.dh);
  }
  return {
    draw(pos) {
      const i = Math.floor(pos), t = pos - i;
      const a = near(i), b = near(Math.min(i + 1, M.count - 1));
      if (!a) return;
      const p = place();
      blit(a, 1, p, i);
      if (b && b !== a && t > 0.01) blit(b, t, p, i + 1);
      g.globalAlpha = 1;
    },
    size,
  };
}

/* ---------- intro ---------- */
const intro = $('.intro'), introN = $('.intro__n'), introBar = $('.intro__bar');
const FIRST = 2;
const firstFrames = new Promise(res => {
  if (!M) return res();
  listeners.add(() => {
    const k = Math.min(1, loaded / FIRST);
    introN.textContent = `${Math.round(k * 100)}%`;
    introBar.style.setProperty('--p', k);
    if (loaded >= FIRST) res();
  });
});
if (M) loadFrames(); else document.body.classList.add('no-canvas');
// Fonts swap in on their own; the intro only waits for the first frames, never longer than 1.8 s.
await Promise.race([Promise.all([firstFrames, wait(reduce ? 0 : 700)]), wait(1800)]);
intro.classList.add('done');
document.body.classList.remove('lock');
setTimeout(() => intro.remove(), 1400);

/* ---------- stage ---------- */
const stage = $('.stage'), acts = $$('.act'), index = $$('.index li');
const stageCanvas = $('#scrub');
const stagePaint = M ? painter(stageCanvas) : null;
let target = 0, shown = 0, current = null, stageOn = true;

function stageProgress() {
  const r = stage.getBoundingClientRect();
  return clamp(-r.top / (r.height - innerHeight));
}
function actAt(k) {
  // Text shows only on the settled frames of each act, never over the dark cut.
  for (const name of Object.keys(M.acts)) {
    const [a, b] = M.acts[name];
    const lo = name === 'musgo' ? -1 : a + 3, hi = name === 'fim' ? M.count : b - 5;
    if (k >= lo && k <= hi) return name;
  }
  return null;
}
function setAct(name) {
  if (name === current) return;
  current = name;
  acts.forEach(el => {
    const on = el.dataset.act === name;
    el.classList.toggle('on', on);
    el.classList.toggle('in', on);
  });
  if (!name) return;
  const color = ACT_COLOR[name];
  if (stageOn) setAccent(color);
  index.forEach(li => li.classList.toggle('on', li.dataset.i === color));
  $('.season__name').textContent = SEASONS[color].name;
}
const nav = $('.nav');
const lum = hex => { const n = parseInt(hex.slice(1), 16); return 0.2126 * (n >> 16) + 0.7152 * (n >> 8 & 255) + 0.0722 * (n & 255); };

function stageFrame() {
  if (!M) return;
  shown = reduce ? target : shown + (target - shown) * 0.14;
  if (Math.abs(target - shown) < 0.002) shown = target;
  stagePaint.draw(shown);
  const k = Math.round(shown);
  setAct(actAt(k));
  $('.stage__pin').style.setProperty('--sky', M.top[k]);
  nav.classList.toggle('dark', stageOn && lum(M.top[k]) < 90);
  $('.cue').style.opacity = k > 6 ? 0 : 1;
}
listeners.add(i => { if (Math.abs(i - shown) < 2) stageFrame(); });

/* ---------- order preview: picking a color plays the bush cut into the new season ---------- */
const preview = M ? painter($('#preview'), { fit: 'cover' }) : null;
let chosen = 'musgo', kind = 'cadeira', qty = 1;
let pv = M ? kOf(SEASONS.musgo.hold, 'musgo') : 0, pvAnim = null;
const holdOf = id => kOf(SEASONS[id].hold, id);
// Arriving at Musgo uses the closing act (it starts on a dark frame); leaving it uses the first act.
const inOf = id => id === 'musgo' ? M.acts.fim[0] : M.acts[id][0];
const arriveHold = id => id === 'musgo' ? kOf(SEASONS.musgo.hold, 'fim') : holdOf(id);

function tween(from, to, ms) {
  return new Promise(res => {
    const t0 = performance.now();
    const step = now => {
      const t = clamp((now - t0) / ms);
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      pv = from + (to - from) * e;
      preview.draw(pv);
      if (t < 1 && pvAnim === step.token) requestAnimationFrame(step); else res();
    };
    step.token = pvAnim;
    requestAnimationFrame(step);
  });
}
async function bloom(from, to) {
  if (!M) return;
  const token = pvAnim = Symbol();
  if (reduce) { pv = holdOf(to); preview.draw(pv); return; }
  const out = M.acts[from][1];
  const start = from === 'musgo' ? holdOf('musgo') : pv;
  await tween(start, out, 520);
  if (pvAnim !== token) return;
  await tween(inOf(to), arriveHold(to), 900);
  if (pvAnim !== token) return;
  pv = holdOf(to);
  preview.draw(pv);
  pvAnim = null;
}
listeners.add(() => { if (!pvAnim) preview?.draw(pv); });

function waLink() {
  const what = kind === 'cadeira' ? `${qty}× Cadeira Prado com almofada ${SEASONS[chosen].name}` : `${qty}× almofada de linho ${SEASONS[chosen].name} (avulsa)`;
  const text = `Olá! Quero pedir: ${what}. Vim pelo site.`;
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
}
const wa = $('.wa');
const refreshOrder = () => { wa.href = waLink(); };
$$('.sw').forEach(b => b.addEventListener('click', () => {
  const id = b.dataset.color;
  if (id === chosen) return;
  const from = chosen;
  chosen = id;
  $$('.sw').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  $('.order__name').textContent = SEASONS[id].name;
  if (!stageOn) setAccent(id);
  bloom(from, id);
  refreshOrder();
}));
$$('.opt button').forEach(b => b.addEventListener('click', () => {
  kind = b.dataset.kind;
  $$('.opt button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  refreshOrder();
}));
$$('.qty button').forEach(b => b.addEventListener('click', () => {
  qty = clamp(qty + +b.dataset.q, 1, 12);
  $('.qty output').textContent = qty;
  refreshOrder();
}));
refreshOrder();

/* ---------- words that light up, rows that light up ---------- */
const words = [];
$$('[data-words]').forEach(el => {
  const walk = (node, hl) => [...node.childNodes].forEach(n => {
    if (n.nodeType === 3) {
      const frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach(t => {
        if (!t.trim()) { frag.append(t); return; }
        const s = document.createElement('span'); s.className = 'w' + (hl ? ' hl' : ''); s.textContent = t; frag.append(s); words.push(s);
      });
      n.replaceWith(frag);
    } else walk(n, hl || n.classList?.contains('hl'));
  });
  walk(el, false);
});
function lightWords() {
  if (!words.length) return;
  const el = words[0].closest('[data-words]'), r = el.getBoundingClientRect();
  const k = clamp((innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.3));
  const n = Math.round(k * words.length);
  words.forEach((w, i) => w.classList.toggle('lit', reduce || i < n));
}
const benRows = $$('.ben li');
const lightRows = () => { const mid = innerHeight * 0.55; benRows.forEach(li => { const r = li.getBoundingClientRect(); li.classList.toggle('lit', r.top < mid && r.bottom > mid - 30); }); };

/* ---------- trama: circle mask grows with scroll ---------- */
const trama = $('.trama'), tramaMedia = $('.trama__media'), tramaVideo = $('.trama video');
function tramaReveal() {
  const r = trama.getBoundingClientRect();
  const p = clamp(-r.top / (r.height - innerHeight));
  const e = 1 - Math.pow(1 - p, 3);
  tramaMedia.style.setProperty('--r', `${6 + e * 72}%`);
  $('.trama__words').style.opacity = 1 - clamp((p - 0.55) / 0.3);
  trama.style.setProperty('--capo', clamp((p - 0.6) / 0.3));
}
if (!reduce) new IntersectionObserver(([e]) => { if (e.isIntersecting) tramaVideo.play().catch(() => {}); else tramaVideo.pause(); }, { rootMargin: '20% 0px' }).observe(trama);

/* ---------- reveals ---------- */
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.2 });
$$('.final, .sec .big').forEach(el => io.observe(el));

/* ---------- rotating word ---------- */
const rot = $('.rot > span');
if (rot && !reduce) { let r = 0; setInterval(() => { r = (r + 1) % 5; rot.style.transform = `translateY(-${r * 1.02}em)`; }, 2200); }

/* ---------- one scroll loop ---------- */
let lastY = scrollY;
function onScroll() {
  const sr = stage.getBoundingClientRect();
  const wasOn = stageOn;
  stageOn = sr.bottom > innerHeight * 0.5;
  if (M) target = stageProgress() * (M.count - 1);
  if (wasOn !== stageOn) { setAccent(stageOn ? ACT_COLOR[current || 'musgo'] : chosen); if (!stageOn) nav.classList.remove('dark'); }
  lightWords(); lightRows(); tramaReveal();
  const y = scrollY;
  nav.classList.toggle('hide', y > lastY && y > innerHeight * 0.6);
  lastY = y;
}
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', () => { onScroll(); stageFrame(); preview?.draw(pv); });
onScroll();

let raf = 0;
(function loop() {
  if (stageOn && M) stageFrame();
  raf = requestAnimationFrame(loop);
})();
preview?.draw(pv);

/* ---------- cursor (mouse only) ---------- */
if (fine && !reduce) {
  const cur = $('.cursor');
  let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
  addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; });
  (function follow() { cx += (x - cx) * 0.16; cy += (y - cy) * 0.16; cur.style.transform = `translate(${cx}px, ${cy}px)`; requestAnimationFrame(follow); })();
  $$('[data-cursor]').forEach(el => {
    el.addEventListener('pointerenter', () => cur.classList.add('big'));
    el.addEventListener('pointerleave', () => cur.classList.remove('big'));
  });
}

if (location.hash === '#debug') window.__prado = { M, frames, get shown() { return shown; }, stageFrame };
