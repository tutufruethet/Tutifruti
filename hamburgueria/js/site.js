// Comportamentos comuns às duas páginas: loader, reveals, cursor, WhatsApp.

// Troque pelo número real (DDI + DDD + número, só dígitos).
export const WHATSAPP = '5511900000000';

export const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

// Links de pedido: data-pedido="Texto da mensagem"
export function whatsLink(msg) {
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
}
document.querySelectorAll('[data-pedido]').forEach(a => {
  a.href = whatsLink(a.dataset.pedido || 'Oi, Carla! Quero fazer um pedido.');
  a.target = '_blank';
  a.rel = 'noopener';
});

// Loader 0→100; resolve quando a página (e quem chamou) está pronta.
export function runLoader(ready = Promise.resolve()) {
  const loader = document.querySelector('.loader');
  if (!loader) return Promise.resolve();
  const num = loader.querySelector('.loader__num');
  let n = 0, target = 70, done = false;
  ready.then(() => { target = 100; });
  return new Promise(res => {
    const tick = () => {
      n += (target - n) * (reduce ? 1 : .08) + .2;
      if (n >= 99.5) { n = 100; done = true; }
      num.textContent = Math.floor(n);
      if (!done) return requestAnimationFrame(tick);
      setTimeout(() => {
        loader.classList.add('done');
        setTimeout(() => loader.remove(), 1300);
        document.body.classList.remove('loading');
        res();
      }, reduce ? 0 : 250);
    };
    tick();
  });
}

// Reveal por linha / fade quando entra na tela
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { rootMargin: '0px 0px -10% 0px' });
export function observeReveals(root = document) {
  root.querySelectorAll('[data-reveal],[data-fade]').forEach(el => {
    if (!el.closest('[data-hold]')) io.observe(el);
  });
}

// Palavras que acendem com o scroll
const wordBlocks = [...document.querySelectorAll('[data-words]')].map(p => {
  p.innerHTML = p.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ');
  return { p, ws: [...p.querySelectorAll('.w')] };
});
function words() {
  const vh = innerHeight;
  for (const { p, ws } of wordBlocks) {
    const r = p.getBoundingClientRect();
    const k = Math.min(1, Math.max(0, (vh * .85 - r.top) / (r.height + vh * .35)));
    const on = Math.round(k * ws.length);
    ws.forEach((w, i) => w.classList.toggle('on', reduce || i < on));
  }
}

// Direção do scroll: menu some ao descer e volta ao subir
let lastY = scrollY;
addEventListener('scroll', () => {
  const y = scrollY;
  if (Math.abs(y - lastY) > 6) {
    document.body.classList.toggle('down', y > lastY && y > innerHeight * .6);
    lastY = y;
  }
  words();
}, { passive: true });
words();

// Cursor com lerp + botões magnéticos (só mouse)
export const mouse = { x: innerWidth / 2, y: innerHeight / 2 };
addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
if (fine && !reduce) {
  const cur = document.querySelector('.cursor');
  if (cur) {
    let cx = mouse.x, cy = mouse.y;
    const loop = () => {
      cx += (mouse.x - cx) * .2; cy += (mouse.y - cy) * .2;
      cur.style.transform = `translate(${cx}px,${cy}px)`;
      requestAnimationFrame(loop);
    };
    loop();
    document.querySelectorAll('a,button,summary,[data-big]').forEach(el => {
      el.addEventListener('pointerenter', () => cur.classList.add('big'));
      el.addEventListener('pointerleave', () => cur.classList.remove('big'));
    });
  }
  document.querySelectorAll('[data-magnetic]').forEach(el => {
    el.style.transition = 'transform .8s var(--ease), background .4s var(--ease), color .4s var(--ease)';
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .25}px,${(e.clientY - r.top - r.height / 2) * .35}px)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });
} else {
  document.querySelector('.cursor')?.remove();
}

// Relógio local no rodapé
const clock = document.querySelector('.clock');
if (clock) {
  const f = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
  const t = () => { clock.textContent = f.format(new Date()) + ' em São Paulo'; };
  t(); setInterval(t, 15000);
}
