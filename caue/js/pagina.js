// Nível 1: the page itself. Runs with or without WebGL.
import { FRASES } from './dados.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const rich = s => s.replace(/\*([^*]+)\*/g, '<span class="serif">$1</span>');
const pad = n => String(n).padStart(2, '0');

/* ---------- recordes (saved on this device) ---------- */
const KEY = 'ilha-do-caue';
export const stats = { gols: 0, saltos: 0, tchibuns: 0 };
try { Object.assign(stats, JSON.parse(localStorage.getItem(KEY)) || {}); } catch { /* storage blocked: start from zero */ }
const listeners = [];
export const onStats = fn => { listeners.push(fn); fn(stats); };
function renderStats() {
  for (const el of $$('[data-stat]')) el.textContent = stats[el.dataset.stat];
  listeners.forEach(fn => fn(stats));
}
export function bump(key) {
  stats[key]++;
  try { localStorage.setItem(KEY, JSON.stringify(stats)); } catch { /* ignore */ }
  renderStats();
}

/* ---------- frases ---------- */
export const phrasesHTML = () => `<ol class="frases-lista">${FRASES.map((f, i) => `<li><span class="label">${pad(i + 1)}</span><p>${rich(f)}</p></li>`).join('')}</ol>`;
let phrase = 0;
function showPhrase(i, animate = true) {
  phrase = (i + FRASES.length) % FRASES.length;
  const q = $('#quote'), n = $('#quoteN');
  n.textContent = `${pad(phrase + 1)} / ${pad(FRASES.length)}`;
  if (!animate || reduce) { q.innerHTML = `<span class="line in"><span>${rich(FRASES[phrase])}</span></span>`; return; }
  q.querySelector('.line')?.classList.add('gone');
  setTimeout(() => {
    q.innerHTML = `<span class="line"><span>${rich(FRASES[phrase])}</span></span>`;
    requestAnimationFrame(() => requestAnimationFrame(() => q.querySelector('.line').classList.add('in')));
  }, 450);
}

export function initPage({ phase }) {
  renderStats();
  showPhrase(0, false);
  $('#quoteNext').addEventListener('click', () => showPhrase(phrase + 1));

  // manifesto words light up with scroll
  const mp = $('[data-words]');
  mp.innerHTML = mp.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ');
  const words = [...mp.querySelectorAll('.w')];
  const lightWords = () => {
    const r = mp.getBoundingClientRect();
    const k = Math.min(Math.max((innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.4), 0), 1);
    const lit = reduce ? words.length : Math.round(k * words.length);
    words.forEach((w, i) => w.classList.toggle('on', i < lit));
  };
  addEventListener('scroll', lightWords, { passive: true });
  lightWords();

  const clock = $('.clock');
  const tick = () => {
    clock.textContent = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(new Date()) + ' BRT';
    if (phase) $$('[data-phase]').forEach(el => { el.textContent = phase(); });
  };
  tick();
  setInterval(tick, 500);
}

export function revealPage() {
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting || e.boundingClientRect.top < 0) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  $$('.hero[data-reveal]').forEach(el => el.classList.add('in'));
  $$('[data-reveal]:not(.in)').forEach(el => io.observe(el));
}
