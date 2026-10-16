/* O cartão é uma camada única que atravessa as cenas.
   Cada chave diz onde ele está num ponto da rolagem: centro (x em vw, y em vh), escala, rotação e opacidade.
   A rotação fica limitada a poucos graus: a imagem é plana e não tem verso. */
(function () {
  const el = document.querySelector('.card');
  const tilt = document.querySelector('.card__tilt');
  let keys = [], cw = 0, ch = 0;

  const S = (x, y, s, r, o = 1) => ({ x, y, s, r, o });
  function build() {
    const at = M.at, vh = M.vh;
    const conceitoTop = M.sec.conceito.top;
    keys = M.mobile ? [
      [at('abertura', 0), S(56, 41.5, 0.95, -5)],
      [at('abertura', 0.12), S(56, 41.5, 0.95, -5)],
      [at('abertura', 0.55), S(56, 34, 0.78, 3)],
      [at('abertura', 1), S(56, 32, 0.76, 4)],
      [at('painel', 0), S(64, 27, 0.52, 8)],
      [at('painel', 1), S(64, 24, 0.5, 10)],
      [at('ritmo', 0), S(70, -25, 0.58, 10)],
      [at('ritmo', 1), S(50, 120, 0.9, -6)],
      [at('video', 1), S(50, 120, 0.9, -6)],
      [at('fechamento', 0), S(50, 36, 0.98, -4)],
      [at('fechamento', 1), S(50, 34, 0.96, -3)],
      [conceitoTop, S(50, -30, 0.96, -3)],
    ] : [
      [at('abertura', 0), S(73.5, 40, 0.95, -6)],
      [at('abertura', 0.12), S(73.5, 40, 0.95, -6)],
      [at('abertura', 0.55), S(74, 31, 0.74, 3)],
      [at('abertura', 1), S(74, 29, 0.72, 5)],
      [at('painel', 0), S(80, 19, 0.6, 9)],
      [at('painel', 1), S(78, 13, 0.58, 11)],
      [at('ritmo', 0), S(78, -30, 0.58, 11)],
      [at('ritmo', 1), S(50, 125, 0.9, -8)],
      [at('video', 1), S(50, 125, 0.9, -8)],
      [at('fechamento', 0), S(50, 42, 0.9, -4)],
      [at('fechamento', 1), S(50, 39, 0.88, -3)],
      [conceitoTop, S(50, -30, 0.88, -3)],
    ];
    cw = el.offsetWidth; ch = el.offsetHeight;
    void vh;
  }
  M.onMeasure.push(build);

  function state(y) {
    if (y <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) {
      const [ya, a] = keys[i], [yb, b] = keys[i + 1];
      if (y <= yb) {
        const raw = M.clamp((y - ya) / Math.max(1, yb - ya));
        const k = M.mv(M.io(raw));
        return { x: M.lerp(a.x, b.x, k), y: M.lerp(a.y, b.y, k), s: M.lerp(a.s, b.s, k), r: M.lerp(a.r, b.r, k), o: M.lerp(a.o, b.o, M.io(raw)) };
      }
    }
    return keys[keys.length - 1][1];
  }

  M.scenes.push(y => {
    const s = state(y);
    const x = (s.x / 100) * M.vw - cw / 2, yy = (s.y / 100) * M.vh - ch / 2;
    el.style.transform = `translate3d(${x.toFixed(1)}px,${yy.toFixed(1)}px,0) rotate(${s.r.toFixed(2)}deg) scale(${s.s.toFixed(4)})`;
    el.style.opacity = s.o;
    el.style.visibility = s.y < -40 || s.y > 140 ? 'hidden' : 'visible';
  });

  // flutuação lenta + inclinação pelo ponteiro (só com mouse), ambas limitadas
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  let tx = 0, ty = 0, rx = 0, ry = 0;
  if (fine) addEventListener('pointermove', e => {
    tx = (e.clientY / M.vh - 0.5) * -6;
    ty = (e.clientX / M.vw - 0.5) * 7;
  }, { passive: true });
  M.tick = t => {
    if (M.reduced()) { tilt.style.transform = ''; return; }
    rx += (tx - rx) * 0.06; ry += (ty - ry) * 0.06;
    const f = Math.sin(t * 1.05) * 0.6; // ~6 s por ciclo
    tilt.style.transform = `perspective(1600px) translateY(${(f * 1.1).toFixed(2)}%) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) rotate(${(f * 0.6).toFixed(2)}deg)`;
  };
})();
