/* Motor de rolagem: mede as cenas, suaviza o scroll (lerp) e chama cada cena a cada frame.
   A rolagem continua nativa; só os valores que movem as camadas são suavizados. */
(function () {
  const M = (window.M = {});
  const root = document.documentElement;

  M.clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  M.lerp = (a, b, k) => a + (b - a) * k;
  M.seg = (p, a, b) => M.clamp((p - a) / (b - a));
  // aceleração e desaceleração suaves para o que é guiado pela rolagem
  M.io = k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  // expo-out, a assinatura das entradas por tempo (o mesmo do showreel)
  M.eo = k => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k));

  M.reduced = () => root.classList.contains('reduced');
  // fator de deslocamento: com movimento reduzido vira um corte seco (sem trajeto)
  M.mv = k => (M.reduced() ? (k >= 0.5 ? 1 : 0) : k);

  M.vw = innerWidth; M.vh = innerHeight; M.mobile = false;
  M.sec = {};
  M.scenes = [];
  M.onMeasure = [];

  M.measure = () => {
    M.vw = innerWidth; M.vh = innerHeight;
    M.mobile = matchMedia('(max-width: 760px)').matches;
    document.querySelectorAll('[data-scene], #conceito').forEach(el => {
      const top = el.getBoundingClientRect().top + scrollY;
      M.sec[el.id] = { el, top, len: Math.max(1, el.offsetHeight - M.vh) };
    });
    M.max = root.scrollHeight - M.vh;
    M.onMeasure.forEach(f => f());
  };
  // progresso dentro da cena fixada (0 → 1)
  M.prog = (id, y) => M.clamp((y - M.sec[id].top) / M.sec[id].len);
  // aproximação: 0 quando a cena aparece embaixo, 1 quando encosta no topo
  M.enter = (id, y) => M.clamp((y - (M.sec[id].top - M.vh)) / M.vh);
  // posição absoluta de rolagem para um ponto da cena
  M.at = (id, p) => M.sec[id].top + p * M.sec[id].len;

  let ys = scrollY, last = -1, running = false;
  M.force = () => { last = -1; };
  M.now = 0;
  function frame(t) {
    M.now = t / 1000;
    const target = scrollY;
    ys = M.reduced() ? target : ys + (target - ys) * 0.12;
    if (Math.abs(target - ys) < 0.05) ys = target;
    M.y = ys;
    if (ys !== last) { M.scenes.forEach(s => s(ys)); last = ys; }
    M.tick && M.tick(M.now);
    requestAnimationFrame(frame);
  }
  M.start = () => {
    if (running) return; running = true;
    M.measure(); ys = scrollY; M.scenes.forEach(s => s(ys));
    requestAnimationFrame(frame);
  };
  let rz;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { M.measure(); M.force(); }, 120); });
})();
