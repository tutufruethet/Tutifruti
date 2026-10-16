/* Abertura (por tempo, sem bloquear a navegação), seção funcional e preferência de movimento. */
(function () {
  const root = document.documentElement;

  // entrada breve e coordenada: fundo, título e cartão, cada um com seu gesto
  const go = () => { M.start(); requestAnimationFrame(() => root.classList.add('is-in')); };
  Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 700))]).then(go);
  document.fonts.ready.then(() => { M.measure(); M.force(); });
  addEventListener('load', () => { M.measure(); M.force(); });

  // planejador de demonstração: conta simples, nada sai do navegador
  const f = document.querySelector('[data-calc]');
  const val = document.querySelector('[data-calc-val]'), bar = document.querySelector('[data-calc-bar]'), pct = document.querySelector('[data-calc-pct]');
  const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  function calc() {
    const meta = Math.max(0, +f.meta.value || 0), g = Math.max(0, +f.guardado.value || 0), n = +f.prazo.value;
    f.prazoOut.value = n === 1 ? '1 mês' : `${n} meses`;
    const falta = Math.max(0, meta - g), share = meta > 0 ? Math.min(1, g / meta) : 0;
    val.textContent = money.format(falta / n);
    bar.style.transform = `scaleX(${share})`;
    pct.textContent = meta > 0 ? `${Math.round(share * 100)}% já guardado` : 'Defina um valor para a meta';
  }
  f.addEventListener('input', calc); calc();

  // preferência de movimento reduzido, além da do sistema
  const t = document.querySelector('[data-motion]');
  const sync = () => t.setAttribute('aria-pressed', root.classList.contains('reduced'));
  t.addEventListener('click', () => {
    const on = root.classList.toggle('reduced');
    try { localStorage.setItem('movimento', on ? 'reduzido' : 'normal'); } catch (e) {}
    sync(); M.force();
  });
  sync();

  // o botão final leva o foco para a seção funcional
  document.querySelectorAll('a[href="#conceito"]').forEach(a => a.addEventListener('click', () => {
    setTimeout(() => document.getElementById('conceito').focus({ preventScroll: true }), 50);
  }));
})();
