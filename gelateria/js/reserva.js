// Diálogo de reserva: horários, validação, código e arquivo de agenda.

import { horariosDeRetirada, validarReserva, codigoDaReserva, gerarICS, nomeDaMontagem, preco, formatarPreco } from './estado.js';

const $ = (id) => document.getElementById(id);

export function montarReserva({ obterEstado, agora = () => new Date() }) {
  const dialogo = $('dialogo');
  const form = $('form-reserva');
  const feito = $('feito');
  let horarios = [];
  let urlICS = '';
  let origem = null;

  function abrir() {
    origem = document.activeElement;
    const estado = obterEstado();
    horarios = horariosDeRetirada(agora());
    $('horario').replaceChildren(...horarios.map((h) => new Option(h.rotulo, h.valor)));
    $('pedido').textContent = `${nomeDaMontagem(estado)}, ${formatarPreco(preco(estado))}`;
    limparErros();
    form.hidden = false;
    feito.hidden = true;
    dialogo.showModal();
    $('nome').focus();
  }

  function limparErros() {
    for (const c of ['nome', 'horario', 'bolas']) {
      $(`erro-${c}`).textContent = '';
      $(c)?.removeAttribute('aria-invalid');
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const estado = obterEstado();
    const dados = { nome: $('nome').value, horario: $('horario').value };
    const erros = validarReserva(dados, horarios.map((h) => h.valor), estado);
    limparErros();
    for (const [campo, msg] of Object.entries(erros)) {
      $(`erro-${campo}`).textContent = msg;
      $(campo)?.setAttribute('aria-invalid', 'true');
    }
    const primeiro = ['nome', 'horario', 'bolas'].find((c) => erros[c]);
    if (primeiro) { (primeiro === 'bolas' ? $('erro-bolas') : $(primeiro)).focus(); return; }

    const nome = dados.nome.trim();
    const codigo = codigoDaReserva(estado, dados.horario, nome);
    const rotulo = horarios.find((h) => h.valor === dados.horario).rotulo;
    $('codigo').textContent = codigo;
    $('feito-detalhe').textContent = `${rotulo}, em nome de ${nome}. ${nomeDaMontagem(estado)}, ${formatarPreco(preco(estado))} no balcão.`;
    const ics = gerarICS({
      codigo, inicio: dados.horario, agora: agora(),
      resumo: `Retirada na Tutifruti (${codigo})`,
      descricao: `${nomeDaMontagem(estado)}. Total ${formatarPreco(preco(estado))}. Mostre o código ${codigo} no balcão.`,
    });
    if (urlICS) URL.revokeObjectURL(urlICS);
    urlICS = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    $('baixar-ics').href = urlICS;
    form.hidden = true;
    feito.hidden = false;
    $('t-feito').focus();
  });

  const fechar = () => dialogo.close();
  $('voltar').addEventListener('click', fechar);
  $('fechar').addEventListener('click', fechar);
  dialogo.addEventListener('close', () => origem?.focus?.());
  // Clique no fundo escuro fecha. O alvo também é o <dialog> no padding, então confere a posição.
  dialogo.addEventListener('click', (e) => {
    if (e.target !== dialogo) return;
    const r = dialogo.getBoundingClientRect();
    const fora = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    if (fora) fechar();
  });

  return { abrir };
}
