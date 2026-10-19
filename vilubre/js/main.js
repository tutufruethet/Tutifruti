import { ESSENCES } from './bottle.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const high = fine && !/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const wait = ms => new Promise(r => setTimeout(r, ms));
const hasGL = !!document.createElement('canvas').getContext('webgl2');

const state = { essence: 'ambar', name: '', bag: 0, edition: 1 + Math.floor(Math.random() * 180) };
$('.edition').textContent = String(state.edition).padStart(3, '0');

/* ---------- loader: counts while fonts and the 3D scene come up ---------- */
const loader = $('.loader'), num = $('.loader__num');
let target = 0, shown = 0;
(function count() {
  shown += (target - shown) * 0.12;
  num.textContent = Math.round(shown);
  if (!loader.classList.contains('done')) requestAnimationFrame(count);
})();
target = 30;
await Promise.race([
  Promise.all(['italic 300 40px "Cormorant Garamond"', '300 40px "Cormorant Garamond"', '400 16px "Geist"', '500 16px "Geist"'].map(f => document.fonts.load(f))),
  wait(2500),
]);
target = 65;

/* ---------- stage 1: live bottle ---------- */
const stage = $('.stage'), steps = Object.fromEntries($$('.step').map(s => [s.dataset.step, s]));
let hero = null;
if (hasGL) {
  try {
    const { createHero } = await import('./hero.js');
    hero = createHero($('#gl'), { high, reduce, instant: location.hash.includes('still') });
    hero.bottle.state.number = state.edition;
    hero.bottle.redraw();
  } catch (err) { console.warn('3D indisponível', err); }
}
if (!hero) document.body.classList.add('no-gl');
target = 100;
await wait(reduce ? 0 : 700);
loader.classList.add('done');
document.body.classList.remove('lock');
await wait(reduce ? 0 : 250);
steps.hero.classList.add('in');

const stageProgress = () => {
  const r = stage.getBoundingClientRect();
  return clamp(-r.top / (r.height - innerHeight));
};

const callouts = $$('.callout');
let current = 'hero';
function setStep(p) {
  const next = p < 0.1 ? 'hero' : p < 0.62 ? 'open' : p > 0.8 ? 'name' : null;
  for (const [k, el] of Object.entries(steps)) {
    const on = k === next;
    el.classList.toggle('on', on);
    if (on && !el.classList.contains('in')) requestAnimationFrame(() => el.classList.add('in'));
  }
  if (next && next !== current) {
    current = next;
    if (next === 'open') $$('[data-note]').forEach((b, i) => scramble(b, ESSENCES[state.essence].notes[i]));
  }
  $('.shade').style.opacity = p > 0.8 ? 0.85 : 1;
}

if (hero) {
  hero.onFrame = (p, pts) => {
    if (current !== 'open') return;
    callouts.forEach((c, i) => { c.style.transform = `translate(${pts[i].x * innerWidth}px, ${pts[i].y * innerHeight}px) translateY(-50%)`; });
  };
  new IntersectionObserver(([e]) => e.isIntersecting ? hero.start() : hero.stop(), { rootMargin: '10% 0px' }).observe(stage);
  addEventListener('resize', () => hero.resize());
  if (fine) addEventListener('pointermove', e => hero.setPointer(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight * 2 - 1)));
}

/* ---------- essences ---------- */
function setEssence(id) {
  state.essence = id;
  const e = ESSENCES[id];
  document.documentElement.style.setProperty('--acc', e.accent);
  $$('[data-essence]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.essence === id)));
  $$('.ess-name').forEach(n => { n.textContent = e.name; });
  $$('[data-note]').forEach((b, i) => { b.textContent = e.notes[i]; });
  hero?.setEssence(id);
}
$$('[data-essence]').forEach(b => b.addEventListener('click', () => setEssence(b.dataset.essence)));

/* ---------- engraving ---------- */
const input = $('#name');
input.addEventListener('input', () => {
  state.name = input.value.replace(/\s+/g, ' ').slice(0, 16);
  hero?.setName(state.name);
  if (!hero) $('.nogl-name').textContent = state.name.trim() ? `para ${state.name.trim()}` : '';
});
function goEngrave() {
  const r = stage.getBoundingClientRect();
  const y = scrollY + r.top + (r.height - innerHeight) * 0.9;
  scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  setTimeout(() => input.focus({ preventScroll: true }), reduce ? 0 : 900);
}
$$('[data-engrave]').forEach(b => b.addEventListener('click', goEngrave));
$('[data-add]').addEventListener('click', () => {
  if (!state.name.trim()) {
    const f = $('.field'); f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake');
    input.focus();
    return;
  }
  state.bag += 1;
  $('.bag-count').textContent = state.bag;
  toast(`${ESSENCES[state.essence].name} para ${state.name.trim()}, Nº ${String(state.edition).padStart(3, '0')}, está na sacola.`);
});
$$('[data-to]').forEach(b => b.addEventListener('click', () => $('#' + b.dataset.to).scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' })));

const toastEl = $('.toast');
let toastT;
function toast(msg) {
  toastEl.textContent = msg; toastEl.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), 3200);
}

/* ---------- scramble (mono-like reveal for the note names) ---------- */
const glyphs = 'abcdefghijklmnopqrstuvwxyzáéíóú';
function scramble(el, word) {
  if (reduce) { el.textContent = word; return; }
  let f = 0; const total = 22;
  cancelAnimationFrame(el._raf);
  (function tick() {
    const out = [...word].map((ch, i) => (f / total) * word.length > i || ch === ' ' || ch === '-' ? ch : glyphs[(Math.random() * glyphs.length) | 0]).join('');
    el.textContent = out;
    if (++f <= total) el._raf = requestAnimationFrame(tick); else el.textContent = word;
  })();
}

/* ---------- words that light up with scroll ---------- */
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
  const k = clamp((innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.35));
  const n = Math.round(k * words.length);
  words.forEach((w, i) => w.classList.toggle('lit', reduce || i < n));
}

/* ---------- benefits rows light as they cross the middle ---------- */
const bens = $$('.bens li');
function lightRows() {
  const mid = innerHeight * 0.55;
  bens.forEach(li => { const r = li.getBoundingClientRect(); li.classList.toggle('lit', r.top < mid && r.bottom > mid - 40); });
}

/* ---------- reveals ---------- */
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.2 });
$$('.sec [data-fade], .final, .sec .big, .scarce').forEach(el => io.observe(el));

/* ---------- nav hides going down, returns going up ---------- */
const nav = $('.nav');
let lastY = scrollY;

/* ---------- one scroll loop for everything ---------- */
function onScroll() {
  const p = stageProgress();
  hero?.setProgress(p);
  setStep(p);
  lightWords();
  lightRows();
  const y = scrollY;
  nav.classList.toggle('hide', y > lastY && y > 200);
  lastY = y;
}
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', onScroll);
onScroll();

/* ---------- cursor + magnetic buttons (mouse only) ---------- */
if (fine && !reduce) {
  const cur = $('.cursor');
  let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
  addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; });
  (function loop() {
    cx += (x - cx) * 0.18; cy += (y - cy) * 0.18;
    cur.style.transform = `translate(${cx}px, ${cy}px)`;
    requestAnimationFrame(loop);
  })();
  $$('a, button, summary, input').forEach(el => {
    el.addEventListener('pointerenter', () => cur.classList.add('big'));
    el.addEventListener('pointerleave', () => cur.classList.remove('big'));
  });
  $$('.btn').forEach(b => {
    b.addEventListener('pointermove', e => {
      const r = b.getBoundingClientRect();
      b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px, ${(e.clientY - r.top - r.height / 2) * 0.25}px)`;
    });
    b.addEventListener('pointerleave', () => { b.style.transform = ''; });
  });
}

/* ---------- local clock ---------- */
const clock = $('.clock');
const tickClock = () => { clock.textContent = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(new Date()); };
tickClock(); setInterval(tickClock, 30000);

if (location.hash === '#debug') window.__vilubre = { hero, state, setEssence };
