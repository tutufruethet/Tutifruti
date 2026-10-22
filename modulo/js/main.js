import { Predio, FLOORS, clamp, range, damp, keyed } from './predio.js';
import { initForm } from './proposta.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const mobile = matchMedia('(pointer: coarse)').matches || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
const expo = t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const debug = new URLSearchParams(location.search).has('debug');

history.scrollRestoration = 'manual';
scrollTo(0, 0);

/* ---------- link da área do cliente (2ª via): troque aqui quando tiver o endereço definitivo ---------- */
const AREA_DO_CLIENTE = 'https://moduloadm.com.br/';
$$('[data-area]').forEach(a => { a.href = AREA_DO_CLIENTE; });

/* ---------- 3D (ou o prédio em SVG quando não há WebGL2) ---------- */
const canvas = $('#gl');
let predio = null;
try {
  if (!document.createElement('canvas').getContext('webgl2')) throw new Error('sem WebGL2');
  predio = new Predio(canvas, { high: !mobile, reduce });
} catch (err) {
  document.documentElement.classList.add('no-gl');
  console.warn('Prédio 3D desligado:', err.message);
}
const alt = $('.alt');

/* ---------- texto: palavras do manifesto e índice das linhas ---------- */
$$('[data-words]').forEach(el => {
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walk.nextNode()) nodes.push(walk.currentNode);
  for (const n of nodes) {
    const frag = document.createDocumentFragment();
    n.textContent.split(/(\s+)/).forEach(part => {
      if (!part) return;
      if (/^\s+$/.test(part)) { frag.append(part); return; }
      const w = document.createElement('span');
      w.className = 'w';
      w.textContent = part;
      frag.append(w);
    });
    n.replaceWith(frag);
  }
});
const words = $$('.manifesto .w');
$$('[data-reveal], .andar').forEach(el => $$('.line', el).forEach((l, i) => { if (!l.style.getPropertyValue('--i')) l.style.setProperty('--i', i); }));
$$('.andar').forEach(a => $$('li', a).forEach((li, i) => li.style.setProperty('--i', i)));

/* ---------- anos de mercado e contadores ---------- */
const year = +new Intl.DateTimeFormat('en-US', { timeZone: 'America/Recife', year: 'numeric' }).format(new Date());
$$('[data-year]').forEach(el => { el.textContent = year; });
$$('[data-years]').forEach(el => { el.dataset.count = year - 2007; el.textContent = year - 2007; });
const counters = $$('[data-count]');
if (!reduce) counters.forEach(el => { el.textContent = el.dataset.from || 0; });
function count(el) {
  if (reduce || el.dataset.done) return;
  el.dataset.done = 1;
  const from = +(el.dataset.from || 0), to = +el.dataset.count, t0 = performance.now();
  (function step(now) {
    const t = clamp((now - t0) / 1600);
    el.textContent = Math.round(from + (to - from) * expo(t));
    if (t < 1) requestAnimationFrame(step);
  })(t0);
}

/* ---------- revelar ao entrar na tela ---------- */
const io = new IntersectionObserver(entries => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    e.target.classList.add('in');
    $$('[data-count]', e.target).forEach(count);
    io.unobserve(e.target);
  }
}, { threshold: .18 });
$$('[data-reveal]:not([data-reveal="intro"])').forEach(el => io.observe(el));

/* ---------- medidas: seções presas e chaves da história S ---------- */
const story = $$('[data-s]');
const pins = $$('[data-pin]').map(el => ({ el, top: 0, len: 1 }));
const pinOf = id => pins.find(p => p.el.id === id || p.el.classList.contains(id));
const P = { sobre: pinOf('sobre'), predio: pinOf('predio'), app: pinOf('app') };
let keys = [];
let docH = 1;

function measure() {
  const y = scrollY;
  for (const p of pins) {
    p.top = p.el.getBoundingClientRect().top + y;
    p.len = Math.max(1, p.el.offsetHeight - $('.pin', p.el).offsetHeight);
  }
  keys = story.flatMap(el => {
    const top = el.getBoundingClientRect().top + y;
    const k = [{ y: top, s: +el.dataset.s }];
    if (el.dataset.sEnd) k.push({ y: top + el.offsetHeight - $('.pin', el).offsetHeight, s: +el.dataset.sEnd });
    return k;
  }).sort((a, b) => a.y - b.y);
  docH = document.documentElement.scrollHeight - innerHeight;
}
function storyAt(y) {
  if (y <= keys[0].y) return keys[0].s;
  for (let i = 1; i < keys.length; i++) {
    if (y < keys[i].y) return keys[i - 1].s + (keys[i].s - keys[i - 1].s) * (y - keys[i - 1].y) / (keys[i].y - keys[i - 1].y);
  }
  return keys[keys.length - 1].s;
}
const prog = p => clamp((scrollY - p.top) / p.len);

/* ---------- o que fica visível: só renderiza o 3D quando alguma seção "noite" está na tela ---------- */
const night = new Set();
const nightIO = new IntersectionObserver(entries => {
  for (const e of entries) e.isIntersecting ? night.add(e.target) : night.delete(e.target);
});
$$('[data-night]').forEach(el => nightIO.observe(el));

/* ---------- loader: conta até 100 enquanto as fontes e o 3D ficam prontos ---------- */
const loader = $('.loader'), num = $('.loader__num'), lws = $$('.loader__mark .lw');
let loadTarget = .12, loadShown = 0, introAt = Infinity;
const t0 = performance.now();
const fontsReady = (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
  loadTarget += .48;
  predio?.paintSign();
  fitWordmark();
});
setTimeout(() => {
  if (predio) predio.frame(0, 0, 0, 0, 0);
  loadTarget += .4;
}, 60);
setTimeout(() => { loadTarget = 1; }, 6000);

function loaderTick(dt) {
  loadShown = damp(loadShown, Math.min(loadTarget, 1), 4, dt);
  const v = loadTarget >= 1 && performance.now() - t0 > 1300 ? Math.min(1, loadShown + .002) : loadShown;
  num.textContent = String(Math.round(v * 100)).padStart(3, '0');
  lws.forEach((w, i) => w.classList.toggle('on', v > (i + 1) / 4));
  if (v > .995 && loadTarget >= 1 && performance.now() - t0 > 1300) {
    loader.classList.add('done');
    document.body.classList.remove('lock');
    $('[data-reveal="intro"]').classList.add('in');
    introAt = performance.now() + 250;
    measure();
    return true;
  }
  return false;
}

/* ---------- nav, menu e links internos ---------- */
const nav = $('.nav'), menu = $('#menu'), menuBtn = $('.nav__menu');
function setMenu(open) {
  menu.classList.toggle('open', open);
  menu.inert = !open;
  menuBtn.setAttribute('aria-expanded', open);
  menuBtn.textContent = open ? 'Fechar' : 'Menu';
  document.body.classList.toggle('lock', open);
}
menuBtn.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
addEventListener('keydown', e => { if (e.key === 'Escape' && menu.classList.contains('open')) setMenu(false); });
$$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const id = a.getAttribute('href');
  const target = id === '#topo' ? document.body : $(id);
  if (!target) return;
  e.preventDefault();
  setMenu(false);
  const y = id === '#topo' ? 0 : target.getBoundingClientRect().top + scrollY;
  scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
}));

/* ---------- prédio: painel do andar e elevador ---------- */
const andares = $$('.andar'), botoes = $$('.elevador [data-floor]');
let floor = -2;
function setFloor(i) {
  if (i === floor) return;
  andares.forEach((a, k) => {
    a.classList.toggle('off', k === floor && k !== i);
    a.classList.toggle('on', k === i);
    a.setAttribute('aria-hidden', k !== i);
  });
  botoes.forEach(li => li.classList.toggle('on', +li.dataset.floor === i));
  floor = i;
}
botoes.forEach(li => $('button', li).addEventListener('click', () => {
  const i = +li.dataset.floor, p = P.predio;
  scrollTo({ top: p.top + (i + .7) / FLOORS * p.len, behavior: reduce ? 'auto' : 'smooth' });
}));

/* ---------- app: passos e telas ---------- */
const steps = $$('.app__steps li'), telas = $$('.tela'), phone = $('.phone');
let step = 0, phoneP = 0;
function setStep(i) {
  if (i === step) return;
  steps.forEach((s, k) => s.classList.toggle('on', k === i));
  telas.forEach((t, k) => { t.classList.toggle('out', k === step && k !== i); t.classList.toggle('on', k === i); });
  step = i;
}

/* ---------- marquee: anda sozinho e acelera com a velocidade do scroll ---------- */
const track = $('.marquee__track');
const copies = 3;
const items = [...track.children];
for (let c = 1; c < copies; c++) items.forEach(n => track.append(n.cloneNode(true)));
let mx = 0, vel = 0;

/* ---------- cursor e botões magnéticos (só com mouse) ---------- */
const cursor = $('.cursor');
const ptr = { x: innerWidth / 2, y: innerHeight / 2, cx: innerWidth / 2, cy: innerHeight / 2, nx: 0, ny: 0 };
addEventListener('pointermove', e => {
  ptr.x = e.clientX; ptr.y = e.clientY;
  ptr.nx = e.clientX / innerWidth * 2 - 1;
  ptr.ny = e.clientY / innerHeight * 2 - 1;
  if (fine) cursor.classList.add('on');
}, { passive: true });
if (fine) {
  document.addEventListener('pointerover', e => cursor.classList.toggle('big', !!e.target.closest('a,button,summary,label')));
  document.addEventListener('pointerleave', () => cursor.classList.remove('on'));
  $$('[data-magnet]').forEach(b => {
    b.style.transition += ',transform .7s var(--ease)';
    b.addEventListener('pointermove', e => {
      const r = b.getBoundingClientRect();
      b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .22}px,${(e.clientY - r.top - r.height / 2) * .32}px)`;
    });
    b.addEventListener('pointerleave', () => { b.style.transform = ''; });
  });
} else cursor.remove();

/* ---------- horário de Olinda: relógio e "aberto agora" ---------- */
const clockEl = $('[data-clock]'), statusEl = $('[data-status]');
const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const turnos = d => (d >= 1 && d <= 4 ? [[480, 720], [840, 1020]] : d === 5 ? [[480, 720]] : []);
function recife() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Recife', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date()).map(x => [x.type, x.value]));
  return { d: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday), m: +p.hour * 60 + +p.minute, hh: p.hour.padStart(2, '0'), mm: p.minute.padStart(2, '0') };
}
function updateClock() {
  const { d, m, hh, mm } = recife();
  clockEl.textContent = `${hh}:${mm}`;
  const open = turnos(d).some(([a, b]) => m >= a && m < b);
  let txt = 'Aberto agora';
  if (!open) {
    txt = 'Fechado agora';
    for (let k = 0; k < 8; k++) {
      const day = (d + k) % 7;
      const next = turnos(day).find(([a]) => k > 0 || a > m);
      if (next) {
        const h = `${next[0] / 60}h`;
        txt += k === 0 ? ` · abre às ${h}` : k === 1 ? ` · abre amanhã às ${h}` : ` · abre ${DIAS[day]} às ${h}`;
        break;
      }
    }
  }
  statusEl.textContent = txt;
  statusEl.parentElement.classList.toggle('aberto', open);
}
updateClock();
setInterval(updateClock, 20000);

/* ---------- wordmark do rodapé ocupa a largura toda ---------- */
const wordmark = $('.wordmark');
function fitWordmark() {
  wordmark.style.fontSize = '100px';
  const pad = parseFloat(getComputedStyle(wordmark).paddingLeft) * 2;
  const r = document.createRange();
  r.selectNodeContents(wordmark);
  const w = r.getBoundingClientRect().width;
  wordmark.style.fontSize = `${100 * (wordmark.clientWidth - pad) / w * .99}px`;
}

/* ---------- mapa só carrega perto da tela ---------- */
const mapa = $('.mapa iframe');
new IntersectionObserver((e, o) => { if (e[0].isIntersecting) { mapa.src = mapa.dataset.src; o.disconnect(); } }, { rootMargin: '800px' }).observe(mapa);

/* ---------- tamanho ---------- */
function resize() {
  if (predio) predio.resize(canvas.clientWidth, canvas.clientHeight);
  measure();
  fitWordmark();
  dirty = true;
}
let dirty = true;
let resizeTimer;
addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 120); });
resize();

initForm($('#form'));

/* ---------- loop ---------- */
const SCRIM = {
  s:    [0,  .55, 1.1, 1.85, 2.15, 8,  8.25, 9,  9.6, 10, 11],
  side: [1,  .7,  .25, .25,  1,    1,  .3,   .3, .7,  .9, .9],
  dim:  [0,  .3,  .72, .72,  .04,  .04, .48, .48, .2,  0,  0],
};
const root = document.documentElement.style, scrim = $('.scrim').style, hero = $('#topo').style, bar = $('.progress span').style;
let last = performance.now(), sSmooth = 0, lastY = scrollY, loading = true, lit = -1;

function tick(now) {
  const dt = Math.min((now - last) / 1000, .1);
  last = now;
  if (loading && loaderTick(dt)) loading = false;

  const y = scrollY;
  const S = loading ? 0 : storyAt(y);
  sSmooth = reduce || debug ? S : damp(sSmooth, S, 4.2, dt);

  // nav some ao descer, volta ao subir
  if (y > lastY + 3 && y > 240 && !menu.classList.contains('open')) nav.classList.add('hide');
  else if (y < lastY - 3) nav.classList.remove('hide');
  vel = damp(vel, (y - lastY) / Math.max(dt, .001), 6, dt);
  lastY = y;
  bar.setProperty('--sp', (y / docH).toFixed(4));
  hero.setProperty('--hp', clamp(y / innerHeight).toFixed(3));
  scrim.setProperty('--side', keyed(sSmooth, SCRIM.s, SCRIM.side).toFixed(3));
  scrim.setProperty('--dim', keyed(sSmooth, SCRIM.s, SCRIM.dim).toFixed(3));

  // manifesto: palavras acendem com o scroll
  const on = Math.floor(prog(P.sobre) * 1.2 * words.length + (S > 1 ? 1 : 0));
  if (on !== lit) { words.forEach((w, i) => w.classList.toggle('on', i < on)); lit = on; }

  // prédio: um painel por andar
  setFloor(S < 1.75 || S > 8.6 ? -1 : clamp(Math.floor(S - 2), 0, FLOORS - 1));

  // app: passo atual e giro do celular
  const ap = prog(P.app);
  setStep(clamp(Math.floor(ap * 4), 0, 3));
  phoneP = reduce ? .4 : debug ? ap : damp(phoneP, ap, 5, dt);
  phone.style.setProperty('--pp', phoneP.toFixed(4));

  // marquee
  if (!reduce) {
    mx += (70 + Math.min(Math.abs(vel), 4000) * .35) * dt;
    const w = track.scrollWidth / copies;
    if (w) mx %= w;
    track.style.transform = `translate3d(${-mx}px,0,0)`;
  }

  // cursor com atraso (lerp)
  if (fine) {
    ptr.cx = damp(ptr.cx, ptr.x, 14, dt);
    ptr.cy = damp(ptr.cy, ptr.y, 14, dt);
    cursor.style.transform = `translate3d(${ptr.cx}px,${ptr.cy}px,0)`;
  }

  // 3D
  if (predio && (night.size || loading)) {
    const intro = loading ? 0 : clamp((now - introAt) / 1800);
    if (!reduce) predio.frame(sSmooth, dt, fine ? ptr.nx : 0, fine ? ptr.ny : 0, intro);
    else if (dirty || intro < 1) { predio.frame(10.6, dt, 0, 0, 1); dirty = false; }
  }
  if (!predio) for (let i = 0; i < FLOORS; i++) alt.style.setProperty(`--b${i}`, expo(range(S, 2.05 + i, 2.65 + i)).toFixed(3));

  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

if (debug) window.__modulo = {
  predio,
  yAt: s => { for (let i = 1; i < keys.length; i++) if (s <= keys[i].s) return keys[i - 1].y + (keys[i].y - keys[i - 1].y) * (s - keys[i - 1].s) / (keys[i].s - keys[i - 1].s); return keys[keys.length - 1].y; },
  ready: () => !loading,
};
