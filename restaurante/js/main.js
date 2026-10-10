/* UI layer: loader, reveals, scroll state for the 3D scene, menu steps, cursor, reservation form. */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mouse = matchMedia('(hover: hover) and (pointer: fine)').matches;
const high = mouse && !/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) && !location.hash.includes('low');
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const wait = ms => new Promise(r => setTimeout(r, ms));
document.documentElement.classList.add('lock');   // no scrolling behind the loader

/* ---------- scene state (read every frame by scene.js) ---------- */
const state = { hero: 0, toMenu: 0, shape: 0, after: 0, mx: 0, my: 0, scroll: 0 };
const menu = $('.menu'), courses = $$('.course'), steps = $$('.menu__index button');
let active = -1;

function onScroll() {
  const vh = innerHeight, y = scrollY;
  const top = menu.offsetTop, len = menu.offsetHeight - vh;
  const p = (y - top) / vh;                       // 0..5 while the stage is pinned
  state.scroll = y;
  state.hero = clamp(y / (vh * 0.8));
  state.toMenu = clamp(y / Math.max(1, top));
  state.shape = clamp(p + 1, 0, 6);
  state.after = clamp((y - (top + len)) / (vh * 0.8));

  const k = clamp(Math.round(p), 0, courses.length - 1);
  if (k !== active) {
    courses.forEach((c, i) => c.classList.toggle('on', i === k));
    steps.forEach((b, i) => b.classList.toggle('on', i === k));
    active = k;
  }
  steps.forEach((b, i) => b.style.setProperty('--p', clamp(p - i + 0.5)));

  // nav hides going down, returns going up
  nav.classList.toggle('hide', y > lastY && y > 80);
  nav.classList.toggle('solid', y > 40);
  lastY = y;
  $$('.nav__links a').forEach(a => {
    const s = $(a.getAttribute('href'));
    a.classList.toggle('on', !!s && s.offsetTop <= y + vh * 0.4 && s.offsetTop + s.offsetHeight > y + vh * 0.4);
  });
  lightWords();
}
const nav = $('.nav');
let lastY = 0;

steps.forEach((b, i) => b.addEventListener('click', () => scrollTo({ top: menu.offsetTop + i * innerHeight + 2, behavior: reduce ? 'auto' : 'smooth' })));

/* ---------- manifesto: words light up with scroll ---------- */
const words = [];
$$('[data-words]').forEach(p => {
  const walk = node => [...node.childNodes].forEach(n => {
    if (n.nodeType === 3) {
      const frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach(t => {
        if (!t.trim()) return frag.append(t);
        const s = document.createElement('span');
        s.className = 'w' + (node.classList?.contains('gold') ? ' gold' : '');
        s.textContent = t; frag.append(s); words.push(s);
      });
      n.replaceWith(frag);
    } else walk(n);
  });
  walk(p);
});
function lightWords() {
  if (!words.length) return;
  const r = words[0].closest('p').getBoundingClientRect();
  const t = clamp((innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.35));
  const n = Math.round(t * words.length);
  words.forEach((w, i) => w.classList.toggle('on', reduce || i < n));
}

/* ---------- reveals: lines rise, blocks fade, siblings staggered ---------- */
function reveal(el) {
  const sibs = $$(':scope > [data-fade]', el.parentElement);
  el.style.transitionDelay = `${Math.max(0, sibs.indexOf(el)) * 80}ms`;
  $$('.line > span', el).forEach((s, i) => { s.style.transitionDelay = `${i * 90}ms`; });
  el.classList.add('in');
}
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { reveal(e.target); io.unobserve(e.target); }
}), { rootMargin: '0px 0px -6% 0px' });

/* ---------- cursor + magnetic buttons ---------- */
if (mouse && !reduce) {
  const dot = $('.cursor');
  let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
  addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; dot.style.opacity = 1; });
  document.addEventListener('pointerleave', () => { dot.style.opacity = 0; });
  addEventListener('pointerover', e => dot.classList.toggle('big', !!e.target.closest('a,button,input,textarea,label')));
  (function loop() {
    cx += (x - cx) * 0.18; cy += (y - cy) * 0.18;
    dot.style.transform = `translate3d(${cx}px,${cy}px,0)`;
    requestAnimationFrame(loop);
  })();
  $$('[data-magnetic]').forEach(b => {
    b.style.transition += ',transform .8s cubic-bezier(.16,1,.3,1)';
    b.addEventListener('pointermove', e => {
      const r = b.getBoundingClientRect();
      b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.22}px,${(e.clientY - r.top - r.height / 2) * 0.3}px)`;
    });
    b.addEventListener('pointerleave', () => { b.style.transform = ''; });
  });
}
addEventListener('pointermove', e => {
  state.mx = (e.clientX / innerWidth) * 2 - 1;
  state.my = (e.clientY / innerHeight) * 2 - 1;
}, { passive: true });

/* ---------- reservation ---------- */
const form = $('.form');
const preview = form.hasAttribute('data-preview');   // published preview: the request goes nowhere
$$('[data-session]').forEach(p => p.addEventListener('click', () => $$('[data-session]').forEach(q => q.setAttribute('aria-pressed', q === p))));
const out = $('output', form);
$$('[data-step]').forEach(b => b.addEventListener('click', () => { out.value = clamp(+out.value + +b.dataset.step, 1, 8); }));
const dateIn = $('input[type=date]', form);
const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
dateIn.min = iso(new Date());
dateIn.max = iso(new Date(Date.now() + 30 * 864e5));
form.addEventListener('submit', e => {
  e.preventDefault();
  const msg = $('.form__msg', form);
  const bad = $$('input[required]', form).find(i => !i.checkValidity());
  if (bad) {
    msg.classList.remove('ok');
    msg.textContent = bad.name === 'email' ? 'Confira o e-mail para recebermos sua confirmação.' : `Preencha ${bad.name === 'data' ? 'a data' : 'o seu nome'} para continuar.`;
    bad.focus();
    return;
  }
  const date = new Date(dateIn.value + 'T12:00');
  if (date.getDay() < 2) {
    msg.classList.remove('ok');
    msg.textContent = 'Abrimos de terça a sábado. Escolha outra data.';
    dateIn.focus();
    return;
  }
  const session = $('[data-session][aria-pressed="true"]').textContent;
  const day = date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  msg.classList.add('ok');
  if (preview) {
    msg.textContent = `Prévia: nada foi enviado. No site no ar, o pedido para ${day}, às ${session}, chega à equipe de reservas.`;
    return;
  }
  msg.textContent = `Pedido recebido: ${out.value} ${out.value > 1 ? 'pessoas' : 'pessoa'}, ${day}, às ${session}. Confirmamos por e-mail.`;
  scramble($('button[type=submit] span', form), 'Pedido enviado');
});

/* Letters shuffle and settle into the new label. */
function scramble(el, text) {
  if (reduce) { el.textContent = text; return; }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ✦·';
  let f = 0;
  const id = setInterval(() => {
    el.textContent = text.split('').map((c, i) => (i < f / 2 || c === ' ' ? c : chars[(Math.random() * chars.length) | 0])).join('');
    if (++f > text.length * 2) clearInterval(id);
  }, 30);
}

/* ---------- footer wordmark fills the full width ---------- */
const mark = $('.footer__mark'), markText = mark.firstElementChild;
const fitMark = () => {
  const cs = getComputedStyle(mark);
  const room = mark.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  mark.style.fontSize = '100px';
  mark.style.fontSize = `${(100 * room) / markText.getBoundingClientRect().width}px`;
};
fitMark();
document.fonts.ready.then(fitMark);
addEventListener('resize', fitMark);

/* ---------- clock ---------- */
const clockEl = $('[data-clock]');
const tick = () => { clockEl.textContent = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }); };
tick(); setInterval(tick, 15e3);

/* ---------- boot: loader counts while fonts and 3D get ready ---------- */
const loader = $('.loader'), num = $('.loader__num');
let target = 0.1, shown = 0;
(function count() {
  shown += (target - shown) * 0.08;
  num.textContent = Math.round(shown * 100);
  if (!loader.classList.contains('done')) requestAnimationFrame(count);
})();

addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', onScroll);
onScroll();

const fonts = Promise.race([
  Promise.all(['300 40px "Cormorant Garamond"', 'italic 300 40px "Cormorant Garamond"', '400 16px "Instrument Sans"'].map(f => document.fonts.load(f))),
  wait(2500),
]).then(() => { target = 0.45; });

const gl = (async () => {
  if (!document.createElement('canvas').getContext('webgl2')) throw new Error('sem WebGL2');
  const { initScene } = await import('./scene.js');
  target = 0.8;
  initScene($('#gl'), state, { high, reduce });
})().catch(err => {
  console.warn('3D desativado:', err.message);
  document.documentElement.classList.add('no-gl');
});

await Promise.all([fonts, gl, wait(reduce ? 0 : 900)]);
target = 1;
await wait(reduce ? 0 : 500);
num.textContent = 100;
loader.classList.add('done');
document.documentElement.classList.remove('lock');
await wait(reduce ? 0 : 300);
const hero = $('.hero');
$$('[data-reveal],[data-fade]').forEach(el => (hero.contains(el) ? reveal(el) : io.observe(el)));
