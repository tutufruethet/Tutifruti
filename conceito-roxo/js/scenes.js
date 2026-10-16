/* Cenas. Cada uma recebe a rolagem suavizada e posiciona seus elementos.
   Janelas de tempo em progresso da cena (0 → 1); cada grupo tem seu próprio gesto. */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const { seg, io, eo, mv, lerp } = M;
  const R = () => M.reduced();

  // mostra/esconde uma linha mascarada: k=1 visível; dir=-1 sai por cima, dir=1 entra de baixo
  function line(el, k, dir = 1) {
    if (R()) { el.style.transform = 'none'; el.style.opacity = k; return; }
    el.style.opacity = M.seg(k, 0.06, 0.3); // some de vez no fim do trajeto (acentos não sobram fora da máscara)
    el.style.transform = `translate3d(0,${(dir * 112 * (1 - k)).toFixed(2)}%,0)`;
  }
  const brl = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  /* ---------- fundo: parallax lento, a camada mais distante ---------- */
  const bg = $('.bg__img');
  M.scenes.push(y => {
    const p = y / Math.max(1, M.max);
    bg.style.transform = R() ? 'none' : `translate3d(0,${(-p * 5).toFixed(3)}vh,0) scale(${(1.02 + p * 0.06).toFixed(4)})`;
  });

  /* ---------- Cenas 1 e 2: abertura e transformação ---------- */
  const t1 = $('[data-t1]'), t1l = $$('[data-t1] .l-s');
  const t2l = $$('[data-t2] .l-s'), t2b = $('[data-t2-body]'), hint = $('[data-hint]');
  M.scenes.push(y => {
    const p = M.prog('abertura', y);
    // o título sai linha a linha, por cima, mais rápido que o cartão
    t1l.forEach((el, i) => line(el, 1 - io(seg(p, 0.1 + i * 0.06, 0.34 + i * 0.06)), -1));
    t1.style.transform = R() ? 'none' : `translate3d(0,${(-7 * io(seg(p, 0.08, 0.45))).toFixed(2)}vh,0)`;
    t2l.forEach((el, i) => line(el, io(seg(p, 0.4 + i * 0.07, 0.64 + i * 0.07)), 1));
    const kb = io(seg(p, 0.6, 0.8));
    t2b.style.opacity = kb;
    t2b.style.transform = `translate3d(0,${(mv(1 - kb) * 24).toFixed(1)}px,0)`;
    hint.style.opacity = 1 - seg(p, 0, 0.05);
  });

  /* ---------- Cena 3: painel de vidro ---------- */
  const glass = $('[data-glass]'), intro = $('[data-p-intro]');
  const G = $$('[data-g]');
  const saldo = $('[data-saldo]'), path = $('[data-line]'), area = $('[data-area]');
  const bars = $$('.bar i', G[2]), ring = $('[data-ring]'), meta = $('[data-meta]');
  const L = path.getTotalLength();
  path.style.strokeDasharray = L;
  const W = [[0.03, 0.17], [0.2, 0.36], [0.39, 0.55], [0.58, 0.74]];
  M.scenes.push(y => {
    const e = io(M.enter('painel', y)), p = M.prog('painel', y);
    const base = M.mobile ? '' : 'translateY(-50%) ';
    if (R() || e >= 1) glass.style.transform = base || 'none';
    else glass.style.transform = `${base}perspective(1400px) translate3d(0,${(10 * (1 - e)).toFixed(2)}vh,0) rotateX(${(14 * (1 - e)).toFixed(2)}deg)`;
    const ki = io(seg(M.enter('painel', y), 0.55, 1));
    intro.style.opacity = ki;
    intro.style.transform = `translate3d(${(mv(1 - ki) * -30).toFixed(1)}px,0,0)`;

    const k = W.map(([a, b]) => io(seg(p, a, b)));
    // 1. saldo: sobe e o número conta
    G[0].style.opacity = k[0];
    G[0].style.transform = `translate3d(0,${(mv(1 - k[0]) * 18).toFixed(1)}px,0)`;
    saldo.textContent = brl.format(12480.35 * (R() ? (k[0] > 0 ? 1 : 0) : eo(k[0])));
    // 2. gráfico: a linha se desenha
    G[1].style.opacity = Math.min(1, k[1] * 3);
    path.style.strokeDashoffset = (L * (1 - mv(k[1]))).toFixed(1);
    area.style.opacity = k[1];
    // 3. categorias: barras crescem em sequência
    G[2].style.opacity = Math.min(1, k[2] * 3);
    bars.forEach((b, i) => b.style.setProperty('--k', mv(io(seg(k[2], i * 0.14, i * 0.14 + 0.58))).toFixed(3)));
    // 4. meta: o anel fecha
    G[3].style.opacity = Math.min(1, k[3] * 3);
    ring.style.setProperty('--k', (0.64 * mv(k[3])).toFixed(3));
    meta.textContent = Math.round(64 * mv(k[3]));
  });

  /* ---------- Cena 4: ritmo tipográfico ---------- */
  const words = $$('[data-w]');
  const cap = $('[data-cap]'), cols = $('[data-cols]');
  // Organize: letras soltas que se alinham
  const org = words[0];
  const letters = [...org.textContent].map((ch, i) => {
    const s = document.createElement('span'); s.textContent = ch;
    const h = n => { const v = Math.sin((i + 1) * 91.7 + n * 13.3) * 43758.5; return v - Math.floor(v); };
    s._d = { x: (h(1) - 0.5) * 70, y: (h(2) - 0.5) * 90, r: (h(3) - 0.5) * 90 };
    return s;
  });
  org.textContent = ''; letters.forEach(s => org.appendChild(s));
  // Acompanhe: o ponto lidera, o texto acompanha
  const aco = words[1], acoText = $('.aco__text', aco), track = $('[data-track]'), dot = $('[data-dot]');
  // Planeje: a palavra se monta em 6 colunas, como um plano
  const pla = words[2];
  const slices = [];
  for (let i = 0; i < 6; i++) {
    const c = document.createElement('span'); c.className = 'pla__col';
    c.style.clipPath = `inset(-20% ${(100 - (i + 1) * 100 / 6).toFixed(3)}% -45% ${(i * 100 / 6).toFixed(3)}%)`;
    const t = document.createElement('span'); t.textContent = 'Planeje.';
    c.appendChild(t); pla.appendChild(c); slices.push(t);
  }
  // posições de pilha (composição final)
  let stack = [];
  M.onMeasure.push(() => {
    const s = M.mobile ? 0.5 : 0.4;
    let yTop = M.vh * (M.mobile ? 0.13 : 0.16);
    stack = words.map(w => {
      const fs = parseFloat(getComputedStyle(w).fontSize);
      const h = fs * s * 0.92, cy = yTop + h / 2; yTop += h;
      return { s, dy: cy - M.vh / 2 };
    });
  });
  function pose(w, i, k) {
    const st = stack[i], m = mv(k);
    w.style.transform = `translate3d(0,calc(-50% + ${(st.dy * m).toFixed(1)}px),0) scale(${lerp(1, st.s, m).toFixed(4)})`;
  }
  M.scenes.push(y => {
    const p = M.prog('ritmo', y);
    // Organize.
    letters.forEach((s, i) => {
      const k = io(seg(p, 0.0 + i * 0.012, 0.15 + i * 0.012)), d = s._d, m = mv(k);
      s.style.transform = `translate3d(${(d.x * (1 - m)).toFixed(2)}vw,${(d.y * (1 - m)).toFixed(2)}vh,0) rotate(${(d.r * (1 - m)).toFixed(1)}deg)`;
      s.style.opacity = 0.12 + 0.88 * k;
    });
    pose(org, 0, io(seg(p, 0.26, 0.36)));
    org.style.color = p > 0.3 ? '#8d8996' : '';
    // Acompanhe.
    const ka = io(seg(p, 0.3, 0.5));
    aco.style.opacity = seg(p, 0.29, 0.31);
    pose(aco, 1, io(seg(p, 0.56, 0.66)));
    const lead = Math.min(1, ka * 1.08);
    track.style.transform = `scaleX(${mv(lead).toFixed(4)})`;
    dot.style.left = (mv(lead) * 100).toFixed(2) + '%';
    dot.style.opacity = 1 - seg(p, 0.52, 0.56);
    acoText.style.clipPath = `inset(-20% ${((1 - mv(ka)) * 100).toFixed(2)}% -30% 0)`;
    aco.style.color = p > 0.6 ? '#8d8996' : '';
    // Planeje.
    slices.forEach((t, i) => {
      const k = io(seg(p, 0.6 + i * 0.025, 0.73 + i * 0.025));
      t.style.transform = `translate3d(0,${(mv(1 - k) * (i % 2 ? -110 : 110)).toFixed(2)}%,0)`;
      t.style.opacity = Math.min(1, k * 5);
    });
    pose(pla, 2, io(seg(p, 0.84, 0.93)));
    cols.style.opacity = (seg(p, 0.55, 0.62) * (1 - seg(p, 0.86, 0.93))).toFixed(3);
    // legenda final
    const kc = io(seg(p, 0.9, 0.98));
    cap.style.opacity = kc;
    cap.style.transform = `translate3d(0,${(mv(1 - kc) * 20).toFixed(1)}px,0)`;
  });

  /* ---------- Cena 4b: vídeo, máscara que cresce e imagem em contra-parallax ---------- */
  const vid = $('[data-vid]'), media = $('[data-video]'), vl = $$('[data-v-title] .l-s');
  const vcap = $('[data-v-cap]'), vctl = $('[data-v-ctl]');
  M.scenes.push(y => {
    const e = M.enter('video', y), p = M.prog('video', y);
    const k = io(seg(e * 0.45 + p * 0.55, 0.25, 0.7)), m = mv(k);
    // de uma janela pequena ao quadro inteiro: inset em % de cada lado
    const ix = lerp(30, 0, m), iy = lerp(26, 0, m), rad = lerp(160, 28, m);
    vid.style.clipPath = `inset(${iy.toFixed(2)}% ${ix.toFixed(2)}% round ${rad.toFixed(1)}px)`;
    media.style.transform = R() ? 'none' : `translate3d(0,${((p - 0.5) * -6).toFixed(2)}%,0) scale(${(1.18 - 0.12 * m).toFixed(4)})`;
    vl.forEach((el, i) => line(el, io(seg(e * 0.45 + p * 0.55, 0.38 + i * 0.07, 0.6 + i * 0.07)), 1));
    const kc = seg(e * 0.45 + p * 0.55, 0.6, 0.72);
    vcap.style.opacity = vctl.style.opacity = kc;
    vctl.style.visibility = kc > 0.01 ? 'visible' : 'hidden';
  });
  // toca só quando está na tela; pausa manual sempre disponível; com movimento reduzido não toca sozinho
  let userPaused = false;
  const setCtl = () => { vctl.textContent = media.paused ? 'Reproduzir vídeo' : 'Pausar vídeo'; vctl.setAttribute('aria-pressed', media.paused); };
  vctl.addEventListener('click', () => { if (media.paused) { userPaused = false; media.play().catch(() => {}); } else { userPaused = true; media.pause(); } });
  media.addEventListener('play', setCtl); media.addEventListener('pause', setCtl);
  new IntersectionObserver(([en]) => {
    if (en.isIntersecting && !userPaused && !R()) media.play().catch(() => {});
    else if (!en.isIntersecting) media.pause();
  }, { threshold: 0.25 }).observe(vid);
  setCtl();

  /* ---------- Cena 5: fechamento, ritmo mais lento ---------- */
  const fl = $$('[data-fim-title] .l-s'), btn = $('[data-fim-btn]');
  M.scenes.push(y => {
    const p = M.prog('fechamento', y), e = M.enter('fechamento', y);
    fl.forEach((el, i) => line(el, io(seg(e * 0.5 + p * 0.5, 0.42 + i * 0.08, 0.62 + i * 0.08)), 1));
    const kb = io(seg(e * 0.5 + p * 0.5, 0.58, 0.72));
    btn.style.opacity = kb;
    btn.style.transform = `translate3d(0,${(mv(1 - kb) * 16).toFixed(1)}px,0)`;
    btn.style.visibility = kb > 0.01 ? 'visible' : 'hidden';
  });

  /* ---------- contador de cena na navegação ---------- */
  const count = $('[data-count]');
  M.scenes.push(y => {
    const mid = y + M.vh * 0.5;
    let n = 1;
    if (M.prog('abertura', y) > 0.45) n = 2;
    if (mid > M.sec.painel.top) n = 3;
    if (mid > M.sec.ritmo.top) n = 4;
    if (mid > M.sec.video.top) n = 5;
    if (mid > M.sec.fechamento.top) n = 6;
    count.textContent = String(n).padStart(2, '0');
  });
})();
