/* Formulário em etapas: uma pergunta por tela. Sem JS, vira um formulário comum que abre o e-mail.
   No fim, monta a mensagem e abre o WhatsApp da Módulo já preenchido (ou o e-mail, se a pessoa preferir). */

const WHATSAPP = '5581987879978';
const EMAIL = 'modulo@moduloadm.com.br';

export function initForm(form) {
  const steps = [...form.querySelectorAll('.step')];
  const cur = form.querySelector('[data-cur]'), tot = form.querySelector('[data-tot]');
  const bar = form.querySelector('.form__bar span');
  const back = form.querySelector('[data-back]'), next = form.querySelector('[data-next]'), send = form.querySelector('[data-send]');
  const mail = form.querySelector('[data-mail]'), mailto = form.querySelector('[data-mailto]');
  const note = form.querySelector('.form__err');
  const msg = form.querySelector('textarea[name="Mensagem"]');
  let flow = 'proposta', i = 0;

  const active = () => steps.filter(s => s.dataset.flow === flow || s.dataset.flow === 'all');
  const labelOf = f => f.closest('label')?.querySelector('.label')?.textContent || f.name;

  function show(k, focus = true) {
    const list = active();
    i = Math.max(0, Math.min(k, list.length - 1));
    steps.forEach(s => {
      s.classList.toggle('on', s === list[i]);
      s.disabled = !list.includes(s);
    });
    cur.textContent = String(i + 1).padStart(2, '0');
    tot.textContent = String(list.length).padStart(2, '0');
    bar.style.setProperty('--f', (i + 1) / list.length);
    const end = i === list.length - 1;
    back.hidden = i === 0;
    next.hidden = end;
    send.hidden = !end;
    mail.hidden = !end;
    msg.required = flow === 'contato';
    note.textContent = '';
    note.classList.remove('ok');
    if (focus) list[i].querySelector('input:not([type=radio]),textarea,input')?.focus({ preventScroll: true });
  }

  function valid() {
    for (const f of active()[i].querySelectorAll('input,textarea')) {
      const ok = f.checkValidity();
      if (f.type !== 'radio') f.setAttribute('aria-invalid', !ok);
      if (ok) continue;
      note.textContent = f.type === 'radio' ? 'Escolha uma opção para continuar.'
        : f.validity.valueMissing ? `Preencha “${labelOf(f)}”.`
        : f.type === 'email' ? 'Confira o e-mail: parece incompleto.'
        : `Confira “${labelOf(f)}”.`;
      f.focus();
      return false;
    }
    return true;
  }

  function message() {
    const head = flow === 'proposta' ? '*Pedido de proposta* (pelo site)' : '*Mensagem de cliente* (pelo site)';
    const lines = [head, ''];
    for (const [k, v] of new FormData(form)) if (k !== 'Tipo' && String(v).trim()) lines.push(`${k}: ${String(v).trim()}`);
    return lines.join('\n');
  }

  next.addEventListener('click', () => { if (valid()) show(i + 1); });
  back.addEventListener('click', () => show(i - 1));
  form.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || e.target.tagName !== 'INPUT' || e.target.type === 'radio') return;
    e.preventDefault();
    (next.hidden ? send : next).click();
  });
  // Escolha com o mouse/dedo já avança; com o teclado, a pessoa confirma em "Continuar".
  let pointerAt = -1e4;
  form.addEventListener('pointerdown', () => { pointerAt = performance.now(); });
  form.querySelectorAll('.choices input').forEach(r => r.addEventListener('change', () => {
    if (performance.now() - pointerAt < 1000) setTimeout(() => { if (valid() && !next.hidden) show(i + 1); }, 380);
  }));
  form.querySelectorAll('input[name="Tipo"]').forEach(r => r.addEventListener('change', () => {
    flow = r.value === 'Pedido de proposta' ? 'proposta' : 'contato';
    show(0, false);
  }));
  form.querySelectorAll('input[type=tel]').forEach(t => t.addEventListener('input', () => {
    const d = t.value.replace(/\D/g, '').slice(0, 11);
    t.value = d.length < 3 ? d : d.length < 7 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
  }));

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!valid()) return;
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message())}`, '_blank', 'noopener');
    note.textContent = 'Abrimos o WhatsApp com a sua mensagem pronta. Se não abriu, envie por e-mail.';
    note.classList.add('ok');
  });
  mailto.addEventListener('click', e => {
    if (!valid()) { e.preventDefault(); return; }
    const subject = flow === 'proposta' ? 'Pedido de proposta pelo site' : 'Contato pelo site';
    mailto.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message().replace(/\*/g, ''))}`;
  });

  show(0, false);
}
