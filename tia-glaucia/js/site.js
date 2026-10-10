// Interações da página. Os dados vêm de js/config.js (window.SITE).
const SITE = window.SITE || {};
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduzido = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Dados ----------
const pendente = (v) => !v || !String(v).trim() || /^\[.*\]$/.test(String(v).trim());

function numeroWhatsApp() {
  if (pendente(SITE.WHATSAPP)) return null;
  let n = String(SITE.WHATSAPP).replace(/\D/g, '');
  if (n.length === 10 || n.length === 11) n = '55' + n;
  return n.length >= 12 && n.length <= 13 ? n : null;
}

function linkInstagram() {
  if (pendente(SITE.INSTAGRAM)) return null;
  const v = String(SITE.INSTAGRAM).trim();
  if (/^https?:\/\//i.test(v)) return v;
  if (/^@?[\w.]+$/.test(v)) return 'https://instagram.com/' + v.replace(/^@/, '');
  return null;
}

const WHATS = numeroWhatsApp();
const INSTA = linkInstagram();
const linkWhats = (texto) => `https://wa.me/${WHATS}${texto ? '?text=' + encodeURIComponent(texto) : ''}`;

function etiquetaPendente(texto) {
  const s = document.createElement('span');
  s.className = 'dado-pendente';
  s.innerHTML = '<span class="pendente">Pendente</span>';
  s.append(texto);
  return s;
}

function preencherCampos() {
  $$('[data-campo]').forEach((dd) => {
    const v = SITE[dd.dataset.campo];
    dd.replaceChildren(pendente(v) ? etiquetaPendente('A preencher') : String(v));
  });

  $$('[data-contato="WHATSAPP"]').forEach((dd) => {
    if (!WHATS) return dd.replaceChildren(etiquetaPendente('Número a inserir'));
    const a = Object.assign(document.createElement('a'), { href: linkWhats(), target: '_blank', rel: 'noopener', textContent: formatarTelefone(WHATS) });
    dd.replaceChildren(a);
  });
  $$('[data-contato="INSTAGRAM"]').forEach((dd) => {
    if (!INSTA) return dd.replaceChildren(etiquetaPendente('Link a inserir'));
    const nome = '@' + INSTA.replace(/\/+$/, '').split('/').pop();
    dd.replaceChildren(Object.assign(document.createElement('a'), { href: INSTA, target: '_blank', rel: 'noopener', textContent: nome }));
  });

  const bio = $('[data-bio]');
  const paragrafos = (SITE.BIOGRAFIA || []).filter((p) => p && p.trim());
  if (!paragrafos.length || paragrafos.every(pendente)) {
    const box = document.createElement('div');
    box.className = 'bio__pendente';
    box.innerHTML = '<span class="pendente">Biografia pendente</span>';
    const p = document.createElement('p');
    p.textContent = 'Em breve, a Tia Gláucia conta aqui um pouco da sua história.';
    box.append(p);
    bio.replaceChildren(box);
  } else {
    bio.replaceChildren(...paragrafos.map((t) => Object.assign(document.createElement('p'), { textContent: t })));
  }

  if (SITE.FOTO && !pendente(SITE.FOTO)) {
    const img = Object.assign(new Image(), { src: SITE.FOTO, alt: `Foto da ${SITE.NOME || 'Tia Gláucia'}`, loading: 'lazy', decoding: 'async' });
    $('[data-foto]').replaceChildren(img);
  }

  const lista = $('[data-servicos]');
  (SITE.SERVICOS || []).forEach((s, i) => {
    const li = document.createElement('li');
    li.className = 'ajuda__item';
    li.dataset.revelar = '';
    li.style.setProperty('--ordem', i % 2);
    const n = String(i + 1).padStart(2, '0');
    const img = `img/ajuda-${(i % 4) + 1}.webp`;
    li.innerHTML = `<div class="ajuda__img"><img src="${img}" alt="" width="400" height="400" loading="lazy" decoding="async" style="--atraso:${-i * 1.3}s"></div>
      <span class="ajuda__num">${n}</span><h3></h3><p></p>`;
    $('h3', li).textContent = s.titulo;
    $('p', li).textContent = s.texto || '';
    if (!s.texto) $('p', li).remove();
    lista.append(li);
  });
  $('[data-servicos-pendente]').hidden = SITE.SERVICOS_CONFIRMADOS === true;

  const ano = $('[data-ano]');
  if (ano) ano.textContent = new Date().getFullYear();
}

function formatarTelefone(n) {
  const m = n.replace(/^55/, '').match(/^(\d{2})(\d{4,5})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : n;
}

// ---------- Aviso ----------
let avisoTimer = 0;
function avisar(texto) {
  const el = $('[data-aviso]');
  el.textContent = texto;
  el.classList.add('mostra');
  clearTimeout(avisoTimer);
  avisoTimer = setTimeout(() => el.classList.remove('mostra'), 5200);
}

// ---------- WhatsApp e Instagram ----------
function abrir(url) {
  // Com 'noopener' o window.open devolve null; por isso o opener é cortado à mão.
  const w = window.open(url, '_blank');
  if (w) w.opener = null;
  else location.href = url;
}

function ligarBotoes() {
  $$('[data-whatsapp]').forEach((b) => b.addEventListener('click', () => {
    if (!WHATS) return avisar('O número de WhatsApp da Tia Gláucia ainda não foi cadastrado no site. Em breve ele aparece aqui.');
    abrir(linkWhats('Olá, Tia Gláucia! Vim pelo site e gostaria de conversar sobre reforço escolar.'));
  }));
  $$('[data-instagram]').forEach((b) => b.addEventListener('click', () => {
    if (!INSTA) return avisar('O link do Instagram ainda não foi cadastrado no site.');
    abrir(INSTA);
  }));
}

// ---------- Formulário ----------
function ligarFormulario() {
  const form = $('[data-form]');
  const retorno = $('[data-retorno]');
  const erro = (campo, msgEl, ok) => {
    msgEl.hidden = ok;
    if (campo.setAttribute) campo.setAttribute('aria-invalid', String(!ok));
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const nome = form.nome.value.trim();
    const serie = form.serie.value.trim();
    const turno = (form.querySelector('input[name="turno"]:checked') || {}).value || '';
    const msg = form.mensagem.value.trim();

    erro(form.nome, $('#e-nome'), !!nome);
    erro(form.serie, $('#e-serie'), !!serie);
    const turnos = $('.turnos', form);
    $('#e-turno').hidden = !!turno;
    turnos.toggleAttribute('data-invalido', !turno);

    if (!nome) return form.nome.focus();
    if (!serie) return form.serie.focus();
    if (!turno) return $('input[name="turno"]', form).focus();

    const texto = [
      'Olá, Tia Gláucia! Gostaria de pedir um horário para reforço escolar.',
      '',
      `Responsável: ${nome}`,
      `Ano ou série do aluno: ${serie}`,
      `Turno de preferência: ${turno}`,
      msg ? `Sobre o apoio: ${msg}` : null,
      '',
      'Enviado pelo site.',
    ].filter((l) => l !== null).join('\n');

    if (WHATS) {
      retorno.hidden = true;
      abrir(linkWhats(texto));
      return;
    }
    // Sem número cadastrado: não finge envio. Mostra a mensagem pronta para copiar.
    retorno.hidden = false;
    retorno.innerHTML = '<p><span class="pendente">Pendente</span></p><p>O WhatsApp da Tia Gláucia ainda não foi cadastrado no site, então o pedido <strong>não foi enviado</strong>. Sua mensagem ficou assim:</p><pre></pre><div><button class="botao botao--linha botao--pequeno" type="button">Copiar mensagem</button></div>';
    $('pre', retorno).textContent = texto;
    $('button', retorno).addEventListener('click', async (ev) => {
      try {
        await navigator.clipboard.writeText(texto);
        ev.currentTarget.textContent = 'Mensagem copiada';
      } catch {
        const r = document.createRange();
        r.selectNodeContents($('pre', retorno));
        getSelection().removeAllRanges();
        getSelection().addRange(r);
        ev.currentTarget.textContent = 'Texto selecionado: copie com Ctrl+C';
      }
    });
    retorno.focus();
  });

  form.addEventListener('input', (e) => {
    const t = e.target;
    if (t.name === 'nome' && t.value.trim()) erro(t, $('#e-nome'), true);
    if (t.name === 'serie' && t.value.trim()) erro(t, $('#e-serie'), true);
    if (t.name === 'turno') { $('#e-turno').hidden = true; $('.turnos', form).removeAttribute('data-invalido'); }
  });
}

// ---------- Topo que some ao descer ----------
function ligarTopo() {
  const topo = $('[data-topo]');
  const flut = $('[data-flutuante]');
  let ultimoY = scrollY;
  const aoRolar = () => {
    const y = scrollY;
    topo.toggleAttribute('data-rolou', y > 20);
    topo.toggleAttribute('data-escondido', y > 320 && y > ultimoY && !topo.contains(document.activeElement));
    ultimoY = y;
  };
  addEventListener('scroll', aoRolar, { passive: true });
  aoRolar();
  setTimeout(() => flut.classList.add('aparece'), reduzido ? 0 : 1600);
}

// ---------- Revelar ao rolar ----------
function ligarRevelar() {
  let resto = $$('[data-revelar]');
  if (reduzido) return resto.forEach((el) => el.classList.add('visivel'));
  // Checagem simples no scroll: revela o que já entrou na tela (ou ficou para trás).
  let pedido = 0;
  const checar = () => {
    pedido = 0;
    const limite = innerHeight * 0.92;
    resto = resto.filter((el) => {
      if (el.getBoundingClientRect().top < limite) { el.classList.add('visivel'); return false; }
      return true;
    });
    if (!resto.length) removeEventListener('scroll', aoRolar);
  };
  const aoRolar = () => { if (!pedido) pedido = requestAnimationFrame(checar); };
  addEventListener('scroll', aoRolar, { passive: true });
  addEventListener('resize', aoRolar);
  checar();
}

// ---------- Trilha da jornada ----------
function ligarTrilha() {
  const caixa = $('[data-trilha]');
  const svg = $('.trilha__svg', caixa);
  const guia = $('.trilha__guia', caixa);
  const tinta = $('.trilha__tinta', caixa);
  const lapis = $('.trilha__lapis', caixa);
  const etapas = $$('.etapa', caixa);
  let total = 1, marcos = [], vertical = false, alvo = 0, atual = reduzido ? 1 : 0, raf = 0;

  function montar() {
    const r = caixa.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${r.width} ${r.height}`);
    const pts = etapas.map((li) => {
      const m = $('.etapa__marco', li).getBoundingClientRect();
      return [m.left - r.left + m.width / 2, m.top - r.top + m.height / 2];
    });
    vertical = pts[1][0] - pts[0][0] < 40;
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    if (vertical) {
      // Celular: desce pela coluna dos números, com uma leve onda.
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
        const dy = (y1 - y0) / 3;
        d += ` C ${x0 + 26} ${y0 + dy}, ${x1 - 26} ${y1 - dy}, ${x1} ${y1}`;
      }
    } else {
      // Desktop: segue na altura dos números e troca de nível no vão entre as colunas,
      // para nunca passar por cima do texto.
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
        const a = etapas[i - 1].getBoundingClientRect(), b = etapas[i].getBoundingClientRect();
        const textoFim = Math.max(...[...etapas[i - 1].children].map((c) => c.getBoundingClientRect().right)) - r.left;
        const vao = (Math.min(textoFim, a.right - r.left) + (b.left - r.left)) / 2;
        const k = Math.min(70, (x1 - x0) / 4);
        d += ` L ${vao - k} ${y0} C ${vao} ${y0}, ${vao} ${y1}, ${vao + k} ${y1} L ${x1} ${y1}`;
      }
    }
    guia.setAttribute('d', d);
    tinta.setAttribute('d', d);
    total = tinta.getTotalLength();
    tinta.style.strokeDasharray = `${total} ${total}`;
    // Fração do caminho em que cada marco é alcançado.
    marcos = pts.map(([x, y]) => {
      let melhor = 0, dist = Infinity;
      for (let s = 0; s <= 200; s++) {
        const p = tinta.getPointAtLength((s / 200) * total);
        const dd = (p.x - x) ** 2 + (p.y - y) ** 2;
        if (dd < dist) { dist = dd; melhor = s / 200; }
      }
      return melhor;
    });
    desenhar(atual);
  }

  function desenhar(p) {
    if (!marcos.length) return;
    tinta.style.strokeDashoffset = String(total * (1 - p));
    const L = Math.max(0.001, p * total);
    const a = tinta.getPointAtLength(L);
    const b = tinta.getPointAtLength(Math.min(total, L + 2));
    const ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
    // O lápis aponta para trás do traço, inclinado como numa mão que escreve.
    const giro = vertical ? (ang - 90) * 0.3 - 105 : ang * 0.35 - 40;
    const escala = vertical ? 0.72 : 1;
    lapis.style.transform = `translate(${a.x}px, ${a.y - 9.5}px) rotate(${giro}deg) scale(${escala})`;
    lapis.style.opacity = p > 0.995 ? '0' : '1';
    etapas.forEach((li, i) => li.classList.toggle('aceso', p >= marcos[i] - 0.01));
  }

  function medirAlvo() {
    const r = caixa.getBoundingClientRect();
    const vh = innerHeight;
    // Começa quando a trilha entra na tela e termina com o último passo a ~60% da altura.
    const ultimo = $('.etapa:last-child .etapa__marco', caixa).getBoundingClientRect();
    const ini = r.top - vh * 0.85;
    const fim = ultimo.top - vh * 0.6;
    alvo = Math.min(1, Math.max(0, -ini / (fim - ini || 1)));
  }

  function loop() {
    atual += (alvo - atual) * 0.12;
    if (Math.abs(alvo - atual) < 0.0005) atual = alvo;
    desenhar(atual);
    raf = atual !== alvo ? requestAnimationFrame(loop) : 0;
  }

  montar();
  new ResizeObserver(montar).observe(caixa);
  if (reduzido) return;
  addEventListener('scroll', () => { medirAlvo(); if (!raf) raf = requestAnimationFrame(loop); }, { passive: true });
  medirAlvo();
  if (!raf) raf = requestAnimationFrame(loop);
}

// ---------- Abertura e cena 3D ----------
function temWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

function ligarAbertura() {
  requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add('entrou')));

  const arte = $('[data-arte]');
  const caixa = $('[data-cena]');
  const mostrarEstatica = () => { if (arte.dataset.modo !== '3d') arte.dataset.modo = 'estatica'; };
  if (!temWebGL() || new URLSearchParams(location.search).has('sem3d')) return mostrarEstatica();

  // Se o 3D demorar, a imagem estática segura a composição.
  const espera = setTimeout(mostrarEstatica, 2600);
  const iniciar = () => import('./hero3d.js').then(({ iniciarCena }) => {
    clearTimeout(espera);
    const pularIntro = arte.dataset.modo === 'estatica';
    iniciarCena(caixa, { reduzido, pularIntro });
    requestAnimationFrame(() => { arte.dataset.modo = '3d'; });
  }).catch((e) => { clearTimeout(espera); console.warn('Cena 3D indisponível:', e); mostrarEstatica(); });

  const fontes = document.fonts ? document.fonts.load('600 40px Fraunces').catch(() => {}) : Promise.resolve();
  fontes.then(() => setTimeout(iniciar, 120));
}

preencherCampos();
ligarBotoes();
ligarFormulario();
ligarTopo();
ligarRevelar();
ligarTrilha();
ligarAbertura();
