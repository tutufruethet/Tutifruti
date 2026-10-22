/* Módulo — interações
   Motion (motion.dev) para progresso de rolagem e entradas; Lenis para rolagem suave no desktop. */
(() => {
  'use strict';

  // Links reais do cliente. Enquanto estiverem vazios, os botões abrem o WhatsApp com a mensagem pronta.
  const LINKS = {
    boleto: '', // [INSERIR LINK] 2ª via de boleto
    area: '',   // [INSERIR LINK] área do cliente
  };
  const WA = '5581987879978'; // [CONFIRMAR] (81) 98787-9978 é WhatsApp?
  const EMAIL = 'modulo@moduloadm.com.br';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const isMobile = () => innerWidth <= 760;
  const M = window.Motion;
  const root = document.documentElement;
  root.classList.remove('no-js');

  let menuOpen = false;
  const waLink = (text) => `https://wa.me/${WA}?text=${encodeURIComponent(text)}`;

  // Progresso de rolagem de uma seção (0 a 1). Usa o scroll() do Motion; sem ele, calcula na mão.
  function onProgress(target, cb, offset = ['start start', 'end end']) {
    if (M && M.scroll) return M.scroll((p) => cb(clamp(p, 0, 1)), { target, offset });
    const run = () => {
      const r = target.getBoundingClientRect();
      cb(clamp(-r.top / Math.max(1, r.height - innerHeight), 0, 1));
    };
    addEventListener('scroll', run, { passive: true });
    run();
  }

  function onView(el, enter, leave, amount = 0) {
    if (M && M.inView) return M.inView(el, () => { enter(); return leave; }, { amount });
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? enter() : leave && leave()), { threshold: amount });
    io.observe(el);
  }

  /* Links da área do cliente e WhatsApp */
  $$('[data-link]').forEach((a) => {
    const key = a.dataset.link;
    const msg = key === 'boleto' ? 'Olá, Módulo! Preciso da 2ª via do boleto do meu condomínio.' : 'Olá, Módulo! Quero acessar a área do cliente.';
    a.href = LINKS[key] || waLink(msg);
    a.target = '_blank';
    a.rel = 'noopener';
  });
  $$('[data-wa]').forEach((a) => { a.href = waLink(a.dataset.wa); a.target = '_blank'; a.rel = 'noopener'; });

  /* Rolagem suave */
  let lenis = null;
  if (!reduce && window.Lenis && finePointer) {
    lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 0.9 });
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    const el = id === '#' ? null : $(id);
    if (!el) return;
    e.preventDefault();
    closeMenu();
    if (lenis) lenis.scrollTo(el, { duration: 1.4 });
    else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    history.replaceState(null, '', id);
  });

  /* Odômetro (dígitos em fita) */
  class Odo {
    constructor(el) { this.el = el; this.value = ''; this.set(el.dataset.value || '', true); }
    set(v, instant = false) {
      v = String(v);
      if (v === this.value) return;
      const shape = (s) => s.replace(/\d/g, '0');
      if (shape(v) !== shape(this.value)) this.build(v);
      [...v].forEach((c, i) => {
        const strip = this.el.children[i] && this.el.children[i].firstElementChild;
        if (strip && /\d/.test(c)) {
          if (instant) strip.style.transition = 'none';
          strip.style.transform = `translateY(${-Number(c)}em)`;
          if (instant) { strip.offsetHeight; strip.style.transition = ''; }
        }
      });
      this.value = v;
    }
    build(v) {
      this.el.textContent = '';
      [...v].forEach((c) => {
        if (/\d/.test(c)) {
          const d = document.createElement('span'); d.className = 'odo__d';
          const s = document.createElement('span'); s.className = 'odo__s';
          for (let n = 0; n < 10; n++) { const k = document.createElement('span'); k.textContent = n; s.appendChild(k); }
          d.appendChild(s); this.el.appendChild(d);
        } else {
          const l = document.createElement('span'); l.className = 'odo__l'; l.textContent = c; this.el.appendChild(l);
        }
      });
    }
  }
  const odos = {};
  $$('[data-odo]').forEach((el) => { odos[el.dataset.odo] = new Odo(el); });

  /* Ajusta palavras gigantes à largura */
  function fit(el, ratio = 0.9, max = 30) {
    el.style.fontSize = '100px';
    const r = document.createRange();
    r.selectNodeContents(el);
    const w = r.getBoundingClientRect().width || 1;
    const box = el.parentElement, cs = getComputedStyle(box);
    const avail = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const size = Math.min((avail * ratio * 100) / w, (innerWidth * max) / 100);
    el.style.fontSize = size + 'px';
  }
  const fitAll = () => {
    $$('.pasta__word').forEach((el) => fit(el, isMobile() ? 1 : 0.86, 22));
    $$('.wordmark span').forEach((el) => fit(el, 1, 26));
  };

  /* 01 · Subida — sequência de quadros no canvas (efeito 03 do NãoCodei) */
  const sub = $('[data-subida]');
  const seq = (() => {
    const mob = isMobile();
    const count = mob ? 63 : 90;
    const dir = mob ? 'm' : 'd';
    const url = (i) => `media/seq/${dir}/${String(i + 1).padStart(3, '0')}.webp`;
    const canvas = $('[data-canvas]', sub);
    const ctx = canvas.getContext('2d');
    const frames = new Array(count);
    const ok = new Array(count).fill(false);
    let drawn = -1, current = 0, target = 0, visible = true, w = 0, h = 0;

    const poster = $('[data-poster]', sub);
    if (mob) poster.src = url(0);

    // Ordem de carga: 1º quadro, depois de 8 em 8, de 4 em 4, de 2 em 2 e o resto.
    const order = [];
    [8, 4, 2, 1].forEach((step) => { for (let i = 0; i < count; i += step) if (!order.includes(i)) order.push(i); });
    const critical = new Set(order.slice(0, Math.ceil(count / 8) + 1));
    let criticalLeft = critical.size;
    const listeners = [];
    const onCritical = (fn) => listeners.push(fn);

    let qi = 0, inflight = 0;
    const pump = () => {
      while (inflight < 6 && qi < order.length) {
        const i = order[qi++];
        const img = new Image();
        img.decoding = 'async';
        inflight++;
        img.onload = img.onerror = () => {
          inflight--;
          if (img.naturalWidth) { frames[i] = img; ok[i] = true; }
          if (critical.has(i)) { criticalLeft--; listeners.forEach((fn) => fn(1 - criticalLeft / critical.size)); }
          if (i === 0) { drawn = -1; sub.classList.add('is-ready'); }
          pump();
        };
        img.src = url(i);
      }
    };
    pump();

    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingQuality = 'high';
      drawn = -1;
    };
    const nearest = (i) => {
      for (let d = 0; d < count; d++) {
        if (ok[i - d]) return i - d;
        if (ok[i + d]) return i + d;
      }
      return -1;
    };
    const draw = (i) => {
      const n = nearest(i);
      if (n < 0 || n === drawn) return;
      const img = frames[n];
      const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
      const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
      drawn = n;
    };
    const tick = () => {
      if (visible) {
        current = reduce ? target : lerp(current, target, 0.2);
        if (Math.abs(current - target) < 0.01) current = target;
        draw(Math.round(current));
      }
      requestAnimationFrame(tick);
    };
    resize();
    addEventListener('resize', resize);
    requestAnimationFrame(tick);
    onView(sub, () => { visible = true; drawn = -1; }, () => { visible = false; });

    return { count, onCritical, setProgress: (p) => { target = p * (count - 1); } };
  })();

  // Capítulos do hero
  const caps = $$('[data-cap]', sub);
  const ticks = $$('[data-ticks] li', sub);
  const capNum = $('[data-cap-num]', sub);
  const bar = $('[data-bar]', sub);
  const tag = $('[data-tag]', sub);
  const hint = $('[data-hint]', sub);
  const andarLabel = $('[data-andar-label]', sub);
  const capAt = [0, 0.14, 0.34, 0.54, 0.76];
  let capIdx = 0;
  function setCap(i) {
    if (i === capIdx) return;
    const prev = caps[capIdx];
    prev.classList.remove('is-active');
    if (capIdx > 0) {
      prev.classList.add('is-out');
      const spans = $$('.ln > span', prev);
      setTimeout(() => {
        if (prev.classList.contains('is-active')) return;
        spans.forEach((s) => { s.style.transition = 'none'; });
        prev.classList.remove('is-out');
        prev.offsetHeight;
        spans.forEach((s) => { s.style.transition = ''; });
      }, 650);
    }
    caps[i].classList.remove('is-out');
    caps[i].classList.add('is-active');
    caps.forEach((c, k) => c.setAttribute('aria-hidden', k === i ? 'false' : 'true'));
    ticks.forEach((t, k) => t.classList.toggle('is-on', k === i));
    capNum.textContent = String(i + 1).padStart(2, '0');
    tag.classList.toggle('is-gone', i > 0);
    capIdx = i;
  }
  onProgress(sub, (p) => {
    seq.setProgress(p);
    bar.style.transform = `scaleX(${p})`;
    hint.classList.toggle('is-gone', p > 0.02);
    let i = 0;
    capAt.forEach((t, k) => { if (p >= t) i = k; });
    setCap(i);
    const top = p >= 0.88;
    odos.andar.set(top ? 'COB' : String(1 + Math.floor((p / 0.88) * 15)).padStart(2, '0'));
    andarLabel.textContent = top ? 'Cobertura' : 'Andar';
  });

  // Título letra por letra (prompt VEX Ventures: 30 ms entre letras, 200 ms de espera)
  const title = $('[data-chars]', sub);
  (function splitChars(el) {
    let n = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((c) => {
        if (c.nodeType === 3) {
          const frag = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const word = document.createElement('span');
            word.style.display = 'inline-block'; word.style.whiteSpace = 'nowrap';
            [...part].forEach((ch) => {
              const s = document.createElement('span');
              s.className = 'ch'; s.textContent = ch; s.setAttribute('aria-hidden', 'true');
              s.style.transitionDelay = `${200 + n++ * 30}ms`;
              word.appendChild(s);
            });
            frag.appendChild(word);
          });
          c.replaceWith(frag);
        } else if (c.nodeType === 1 && c.tagName !== 'BR') walk(c);
      });
    };
    walk(el);
  })(title);

  /* Loader (só no desktop): sobe quando os quadros principais carregam, no máximo em 2,6 s */
  const loader = $('.loader');
  const loaderNum = $('[data-loader-num]');
  let started = false;
  function start() {
    if (started) return;
    started = true;
    loader.classList.add('is-done');
    setTimeout(() => { sub.classList.add('is-started'); title.classList.add('is-typed'); }, reduce ? 0 : 350);
    setTimeout(() => loader.remove(), 1400);
  }
  if (reduce || isMobile()) start();
  else {
    let shown = 0, goal = 0;
    seq.onCritical((f) => { goal = f; });
    const t0 = performance.now();
    const step = () => {
      shown = lerp(shown, goal, 0.12);
      loaderNum.textContent = String(Math.round(shown * 100)).padStart(2, '0');
      if ((goal >= 1 && shown > 0.985) || performance.now() - t0 > 2600) { loaderNum.textContent = '100'; setTimeout(start, 180); return; }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* Manifesto: palavras acendem com a rolagem (efeito 04 do NãoCodei) */
  const fill = $('[data-fill]');
  if (fill) {
    const words = fill.textContent.trim().split(/\s+/);
    fill.textContent = '';
    const spans = words.map((w, i) => {
      const s = document.createElement('span'); s.className = 'w'; s.textContent = w;
      fill.appendChild(s);
      if (i < words.length - 1) fill.appendChild(document.createTextNode(' '));
      return s;
    });
    onProgress(fill, (p) => {
      const lit = reduce ? spans.length : Math.round(p * spans.length);
      spans.forEach((s, i) => s.classList.toggle('is-lit', i < lit));
    }, ['start 0.85', 'end 0.55']);
  }

  /* 02 · Um dia no seu prédio */
  const dia = $('[data-dia]');
  if (dia) {
    const vids = $$('[data-dia-video]', dia);
    const steps = $$('[data-step]', dia);
    const tl = $$('[data-timeline] li', dia);
    const tlFill = $('[data-timeline-fill]', dia);
    const hours = ['07', '11', '16', '22'];
    let cur = -1, inView = false;
    const play = () => {
      vids.forEach((v, k) => {
        if (k === cur && inView && !reduce) { if (v.preload === 'none') v.preload = 'auto'; v.play().catch(() => {}); }
        else if (!v.paused) setTimeout(() => { if (k !== cur || !inView) v.pause(); }, 1100);
      });
      const next = vids[cur + 1];
      if (next && next.preload === 'none') next.preload = 'metadata';
    };
    const setStep = (i) => {
      if (i === cur) return;
      const prev = steps[cur];
      if (prev) {
        prev.classList.remove('is-active'); prev.classList.add('is-out');
        const spans = $$('.ln > span', prev);
        setTimeout(() => {
          if (prev.classList.contains('is-active')) return;
          spans.forEach((s) => { s.style.transition = 'none'; });
          prev.classList.remove('is-out'); prev.offsetHeight;
          spans.forEach((s) => { s.style.transition = ''; });
        }, 650);
      }
      steps[i].classList.remove('is-out'); steps[i].classList.add('is-active');
      vids.forEach((v, k) => v.classList.toggle('is-active', k === i));
      tl.forEach((li, k) => li.classList.toggle('is-on', k <= i));
      odos.hora.set(hours[i]);
      cur = i;
      play();
    };
    steps[0].classList.remove('is-active');
    setStep(0);
    onProgress(dia, (p) => {
      setStep(Math.min(3, Math.floor(p * 4)));
      tlFill.style.transform = `scaleX(${p})`;
    });
    onView(dia, () => { inView = true; play(); }, () => { inView = false; vids.forEach((v) => v.pause()); });
  }

  /* 03 · As pastas: trilho horizontal no desktop (efeito 02 do NãoCodei) */
  const pastas = $('[data-pastas]');
  if (pastas) {
    const track = $('[data-track]', pastas);
    const items = $$('[data-pasta]', pastas);
    const dots = $$('[data-dots] li', pastas);
    const colors = items.map((el) => ({ bg: el.style.getPropertyValue('--bg').trim(), fg: el.style.getPropertyValue('--fg').trim() }));
    const hex = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));
    const mix = (a, b, t) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, k) => Math.round(lerp(v, B[k], t))).join(',')})`; };
    const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
    let active = -1;
    const setActive = (i) => {
      if (i === active) return;
      items.forEach((el, k) => el.classList.toggle('is-active', k === i));
      dots.forEach((d, k) => d.classList.toggle('is-on', k === i));
      active = i;
    };
    const update = (p) => {
      if (isMobile()) { track.style.transform = ''; pastas.style.removeProperty('--cur-bg'); return; }
      const max = track.scrollWidth - innerWidth;
      track.style.transform = `translate3d(${-p * max}px,0,0)`;
      const f = p * (items.length - 1);
      const i = Math.min(items.length - 2, Math.floor(f));
      const t = smooth(0.3, 0.7, f - i);
      pastas.style.setProperty('--cur-bg', mix(colors[i].bg, colors[i + 1].bg, t));
      const fg = t < 0.5 ? colors[i].fg : colors[i + 1].fg;
      pastas.style.setProperty('--cur-fg', fg);
      pastas.dataset.tone = fg.toLowerCase() === '#eeebe5' ? 'dark' : 'light';
      setActive(Math.round(f));
    };
    let last = 0;
    onProgress(pastas, (p) => { last = p; update(p); });
    addEventListener('resize', () => update(last));
    if (isMobile()) items.forEach((el) => el.classList.add('is-active'));
  }

  /* 04 · Diferenciais: prévia que segue o cursor */
  const dif = $('[data-dif]');
  const prev = $('[data-dif-preview]');
  if (dif && prev && finePointer) {
    const img = $('img', prev);
    let x = 0, y = 0, tx = 0, ty = 0, on = false, raf = 0;
    const loop = () => {
      x = lerp(x, tx, 0.14); y = lerp(y, ty, 0.14);
      prev.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(${(tx - x) * 0.02}deg)`;
      raf = on || Math.abs(tx - x) > 0.5 ? requestAnimationFrame(loop) : 0;
    };
    dif.addEventListener('mousemove', (e) => { tx = e.clientX + 170; ty = e.clientY; if (!raf) raf = requestAnimationFrame(loop); });
    $$('.dif__row', dif).forEach((row) => {
      row.addEventListener('mouseenter', (e) => {
        if (!on) { x = tx = e.clientX + 170; y = ty = e.clientY; }
        img.src = row.dataset.img; on = true; prev.classList.add('is-on');
        if (!raf) raf = requestAnimationFrame(loop);
      });
    });
    dif.addEventListener('mouseleave', () => { on = false; prev.classList.remove('is-on'); });
  }

  /* 05 · App: boletos abrem em leque, celular com parallax leve */
  const app = $('[data-app]');
  if (app) {
    const bills = $('[data-bills]', app);
    const phone = $('[data-phone]', app);
    onView(bills, () => setTimeout(() => bills.classList.add('is-open'), 250), () => bills.classList.remove('is-open'), 0.6);
    if (!reduce) onProgress(app, (p) => { phone.style.setProperty('--py', `${(0.5 - p) * 80}px`); }, ['start end', 'end start']);
  }

  /* Entradas por linha */
  $$('[data-reveal]').forEach((el) => onView(el, () => el.classList.add('is-in'), null, 0.35));

  /* 06 · Parceiros: marquee contínuo (Magic UI Marquee) */
  const mq = $('[data-marquee] .marquee__row');
  if (mq) {
    [...mq.children].forEach((li) => { const c = li.cloneNode(true); c.setAttribute('aria-hidden', 'true'); $('img', c).alt = ''; mq.appendChild(c); });
    onView(mq.parentElement, () => { mq.style.animationPlayState = ''; }, () => { mq.style.animationPlayState = 'paused'; });
  }

  /* Vídeos que tocam só quando aparecem */
  $$('video[data-autoplay]').forEach((v) => {
    if (reduce) return;
    onView(v, () => { v.preload = 'auto'; v.play().catch(() => {}); }, () => v.pause(), 0.15);
  });

  /* Navegação: some ao descer, volta ao subir, muda de tom conforme a seção */
  const nav = $('[data-nav]');
  const toned = $$('[data-tone]');
  let lastY = scrollY;
  const navTick = () => {
    const y = scrollY;
    const dy = y - lastY;
    if (!menuOpen) {
      if (y > 240 && dy > 4) nav.classList.add('is-hidden');
      else if (dy < -4 || y < 240) nav.classList.remove('is-hidden');
    }
    lastY = y;
    const px = innerWidth / 2, py = 40;
    const sec = toned.filter((s) => { const r = s.getBoundingClientRect(); return r.top <= py && r.bottom > py && r.left <= px && r.right > px; }).pop();
    nav.classList.toggle('is-light', !!sec && sec.dataset.tone === 'light' && !menuOpen);
  };
  addEventListener('scroll', () => requestAnimationFrame(navTick), { passive: true });
  navTick();

  /* Menu do celular */
  const menuBtn = $('[data-menu-btn]');
  const menu = $('[data-menu]');
  function closeMenu() {
    if (!menuOpen) return;
    menuOpen = false; menu.hidden = true;
    menuBtn.setAttribute('aria-expanded', 'false');
    $('.sr', menuBtn).textContent = 'Abrir menu';
    if (lenis) lenis.start();
    document.body.style.overflow = '';
    navTick();
  }
  menuBtn.addEventListener('click', () => {
    if (menuOpen) return closeMenu();
    menuOpen = true; menu.hidden = false;
    menuBtn.setAttribute('aria-expanded', 'true');
    $('.sr', menuBtn).textContent = 'Fechar menu';
    if (lenis) lenis.stop();
    document.body.style.overflow = 'hidden';
    nav.classList.remove('is-hidden', 'is-light');
    $('a', menu).focus();
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

  /* 07 · Formulário de proposta (prompt Build With Us) → WhatsApp ou e-mail */
  const form = $('[data-form]');
  if (form) {
    const card = $('[data-form-card]');
    const body = $('[data-form-body]', card);
    const okBox = $('[data-form-ok]', card);
    const err = $('[data-err]', form);
    const tabs = $$('[data-tab]', card);
    const chipsets = {};
    $$('[data-chips]', form).forEach((set) => {
      chipsets[set.dataset.chips] = set;
      $$('button', set).forEach((b) => b.addEventListener('click', () => {
        $$('button', set).forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
        set.classList.remove('is-invalid');
      }));
    });
    const chip = (name) => { const b = $('[aria-pressed="true"]', chipsets[name]); return b ? b.textContent.trim() : ''; };
    const setMode = (mode) => {
      form.dataset.mode = mode;
      tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === mode)));
      $('[data-panel]', card).setAttribute('aria-labelledby', mode === 'proposta' ? 'tab-prop' : 'tab-cont');
      $$('[data-req-prop]', form).forEach((i) => { i.required = mode === 'proposta'; });
      err.textContent = '';
    };
    tabs.forEach((t) => t.addEventListener('click', () => setMode(t.dataset.tab)));
    setMode('proposta');

    const val = (n) => (form.elements[n] ? form.elements[n].value.trim() : '');
    const validate = () => {
      const bad = [];
      $$('input, textarea', form).forEach((i) => {
        if (i.type === 'checkbox') return;
        const invalid = i.required && (!i.value.trim() || !i.checkValidity());
        i.setAttribute('aria-invalid', String(invalid));
        if (invalid) bad.push(i);
      });
      const chipName = form.dataset.mode === 'proposta' ? 'perfil' : 'assunto';
      const missingChip = !chip(chipName);
      chipsets[chipName].classList.toggle('is-invalid', missingChip);
      const lgpd = form.elements.lgpd;
      const msgs = [];
      if (bad.length) msgs.push('preencha os campos marcados');
      if (missingChip) msgs.push(chipName === 'perfil' ? 'diga se você é síndico, conselho ou morador' : 'escolha o assunto');
      if (!lgpd.checked) msgs.push('marque a autorização de uso dos dados');
      err.textContent = msgs.length ? `Falta pouco: ${msgs.join(', ')}.` : '';
      if (bad[0]) bad[0].focus();
      else if (missingChip) $('button', chipsets[chipName]).focus();
      else if (!lgpd.checked) lgpd.focus();
      return !msgs.length;
    };
    const compose = () => {
      const lines = [];
      if (form.dataset.mode === 'proposta') {
        lines.push('Olá, Módulo! Quero uma proposta de administração.', '');
        lines.push(`Nome: ${val('nome')}`, `Telefone: ${val('telefone')}`, `E-mail: ${val('email')}`);
        lines.push(`Condomínio: ${val('condominio')}`, `Apartamentos: ${val('apartamentos')}`, `Taxa de condomínio: R$ ${val('taxa')}`, `Funcionários: ${val('funcionarios')}`, `Sou: ${chip('perfil')}`);
      } else {
        lines.push('Olá, Módulo! Já sou cliente.', '', `Assunto: ${chip('assunto')}`);
        lines.push(`Nome: ${val('nome')}`, `Telefone: ${val('telefone')}`, `E-mail: ${val('email')}`);
      }
      lines.push('', `Mensagem: ${val('mensagem')}`, '', '(enviado pelo site)');
      return lines.join('\n');
    };
    const done = () => {
      body.hidden = true; okBox.hidden = false; okBox.focus();
      if (window.fbq) window.fbq('track', 'Lead');
      if (window.gtag) window.gtag('event', 'generate_lead', { method: form.dataset.mode });
    };
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validate()) return;
      window.open(waLink(compose()), '_blank', 'noopener');
      done();
    });
    $('[data-mail]', form).addEventListener('click', () => {
      if (!validate()) return;
      const subject = form.dataset.mode === 'proposta' ? `Proposta: ${val('condominio')}` : `Contato de cliente: ${chip('assunto')}`;
      location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(compose())}`;
      done();
    });
    $('[data-again]', card).addEventListener('click', () => {
      form.reset();
      $$('[aria-pressed]', form).forEach((b) => b.setAttribute('aria-pressed', 'false'));
      $$('[aria-invalid]', form).forEach((i) => i.removeAttribute('aria-invalid'));
      okBox.hidden = true; body.hidden = false; $('input', form).focus();
    });
  }

  /* 09 · Aberto agora? (horário de Olinda) */
  const status = $('[data-status]');
  if (status) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const names = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
    const sched = (d) => (d >= 1 && d <= 4 ? [[8, 12], [14, 17]] : d === 5 ? [[8, 12]] : []);
    const nextOpen = (d) => { for (let k = 1; k <= 7; k++) { const n = (d + k) % 7; if (sched(n).length) return k === 1 ? 'amanhã' : names[n]; } return ''; };
    const render = () => {
      const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Recife', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
      const get = (t) => (parts.find((p) => p.type === t) || {}).value;
      const d = days.indexOf(get('weekday'));
      const h = Number(get('hour')) + Number(get('minute')) / 60;
      const s = sched(d);
      const open = s.find(([a, b]) => h >= a && h < b);
      let text;
      if (open) text = `Aberto agora · até ${open[1]}h`;
      else if (s.length && h < s[0][0]) text = `Fechado agora · abre hoje às ${s[0][0]}h`;
      else if (s.length > 1 && h >= s[0][1] && h < s[1][0]) text = `Intervalo · volta às ${s[1][0]}h`;
      else text = `Fechado agora · abre ${nextOpen(d)} às 8h`;
      status.classList.toggle('is-open', !!open);
      $('span', status).textContent = text;
    };
    render();
    setInterval(render, 60000);
  }

  /* Ajustes de layout */
  const relayout = () => { fitAll(); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
  relayout();
  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(relayout, 120); });
})();
