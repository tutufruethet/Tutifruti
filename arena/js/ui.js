// Page layer: loader, reveals, scramble, cursor, magnet, manifesto, clock. Works without WebGL.

// Fill in the arena's real contacts. Empty keeps the links pointing at #contato.
export const CONTACT = { whatsapp: '', instagram: '' }; // whatsapp: '5581999999999' (DDI+DDD+número), instagram: 'usuario'

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+<>/';
export function scramble(el, dur = 750) {
  const text = el.dataset.text ??= el.textContent;
  if (reduce) return;
  const t0 = performance.now();
  cancelAnimationFrame(el._raf);
  const tick = now => {
    const k = Math.min((now - t0) / dur, 1);
    const n = Math.floor(k * text.length);
    let s = text.slice(0, n);
    for (let i = n; i < text.length; i++) s += text[i] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
    el.textContent = s;
    if (k < 1) el._raf = requestAnimationFrame(tick);
  };
  el._raf = requestAnimationFrame(tick);
}

/* ---------- loader ---------- */
const loader = $('.loader'), num = $('.loader__num');
let target = 0, shown = 0;
(function count() {
  shown += (target - shown) * (reduce ? 1 : 0.07);
  num.textContent = String(Math.round(shown * 100)).padStart(3, '0');
  if (!loader.classList.contains('done')) requestAnimationFrame(count);
})();
scramble($('.loader [data-scramble]'), 1200);
export const setLoad = v => { target = Math.max(target, v); };
export function finishLoad() {
  target = 1;
  return new Promise(resolve => {
    const check = () => {
      if (shown < 0.995) return requestAnimationFrame(check);
      num.textContent = '100';
      setTimeout(() => {
        loader.classList.add('done');
        document.body.classList.add('ready');
        resolve();
      }, reduce ? 0 : 250);
    };
    check();
  });
}

/* ---------- contacts ---------- */
if (CONTACT.whatsapp) $$('[data-wa]').forEach(a => { a.href = `https://wa.me/${CONTACT.whatsapp}`; a.target = '_blank'; a.rel = 'noopener'; });
if (CONTACT.instagram) $$('[data-ig]').forEach(a => { a.href = `https://instagram.com/${CONTACT.instagram}`; });

/* ---------- reveals ---------- */
const io = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  e.target.classList.add('in');
  $$('[data-scramble]', e.target).forEach(el => scramble(el));
  io.unobserve(e.target);
}), { rootMargin: '0px 0px -12% 0px' });
$$('[data-reveal],[data-manifesto]').forEach(el => io.observe(el));
$$('[data-scramble-hover]').forEach(el => el.addEventListener('pointerenter', () => scramble(el, 450)));

/* ---------- clock ---------- */
const fmt = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Recife' });
const tickClock = () => $$('[data-clock]').forEach(el => { el.textContent = `Paulista ${fmt.format(new Date())}`; });
tickClock();
setInterval(tickClock, 15000);

/* ---------- scroll direction (nav hides going down) ---------- */
const nav = $('.nav');
let lastY = scrollY;
addEventListener('scroll', () => {
  const y = scrollY;
  if (Math.abs(y - lastY) > 4) document.body.dataset.dir = y > lastY ? 'down' : 'up';
  nav.classList.toggle('hide', y > innerHeight * 0.5);
  lastY = y;
}, { passive: true });

/* ---------- manifesto: words light with scroll ---------- */
const man = $('.manifesto');
man.innerHTML = man.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ');
const words = $$('.w', man);
function lightWords() {
  const r = man.getBoundingClientRect();
  const k = reduce ? 1 : Math.min(Math.max((innerHeight * 0.8 - r.top) / (r.height + innerHeight * 0.35), 0), 1);
  const n = Math.round(k * words.length);
  words.forEach((w, i) => w.classList.toggle('lit', i < n));
}
addEventListener('scroll', lightWords, { passive: true });
lightWords();

/* ---------- experiences: hover (mouse) or centered row (touch) picks a world ---------- */
const xpList = $('.xp');
const xpHandlers = [];
export const onXp = fn => xpHandlers.push(fn);
const pick = li => {
  $$('li', xpList).forEach(x => x.classList.toggle('on', x === li));
  xpHandlers.forEach(fn => fn(+li.dataset.xp));
};
if (fine) {
  $$('li', xpList).forEach(li => li.addEventListener('pointerenter', () => pick(li)));
} else {
  xpList.classList.add('touch');
  const mid = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && pick(e.target)), { rootMargin: '-45% 0px -45% 0px' });
  $$('li', xpList).forEach(li => mid.observe(li));
}

/* ---------- back to the real world ---------- */
$('[data-top]').addEventListener('click', () => scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));

/* ---------- cursor + magnetic buttons (mouse only) ---------- */
if (fine && !reduce) {
  const c = $('.cursor');
  let x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y;
  addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; c.classList.add('on'); }, { passive: true });
  document.addEventListener('pointerleave', () => c.classList.remove('on'));
  document.addEventListener('pointerover', e => c.classList.toggle('big', !!e.target.closest('a,button,[data-hover],.xp li')));
  (function loop() {
    x += (tx - x) * 0.18; y += (ty - y) * 0.18;
    c.style.transform = `translate3d(${x}px,${y}px,0)`;
    requestAnimationFrame(loop);
  })();

  $$('[data-magnet]').forEach(b => {
    b.addEventListener('pointermove', e => {
      const r = b.getBoundingClientRect();
      b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px,${(e.clientY - r.top - r.height / 2) * 0.35}px)`;
    });
    b.addEventListener('pointerleave', () => { b.style.transform = ''; });
  });
}
