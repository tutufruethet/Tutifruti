// DOM: desenha o estado e traduz cliques em ações. Nenhuma regra de negócio aqui.

import { SABORES, BASES, COBERTURAS, PRECO_BOLAS, ADICIONAL_PREMIUM, MAX_BOLAS } from './dados.js';
import { SABOR, preco, formatarPreco, podeAdicionar, itensDaConta } from './estado.js';

const $ = (id) => document.getElementById(id);
const el = (tag, attrs = {}, ...filhos) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k === 'style') n.style.cssText = v;
    else if (k.startsWith('data-') || k.startsWith('aria-') || k === 'role' || k === 'for') n.setAttribute(k, v);
    else n[k] = v;
  }
  n.append(...filhos.filter((f) => f != null));
  return n;
};
const ordinal = (i) => `${i + 1}ª bola`;

function linhaPontilhada(rotulo, valor) {
  return el('div', {}, el('dt', {}, rotulo), el('span', { class: 'pontilhado', 'aria-hidden': 'true' }), el('dd', {}, valor));
}

function opcaoRadio(nome, item, precoTexto) {
  return el('label', { class: 'opcao' },
    el('input', { type: 'radio', name: nome, value: item.id }),
    el('span', {}, el('span', { class: 'opcao-nome' }, item.nome), item.nota ? el('span', { class: 'opcao-nota' }, item.nota) : null),
    el('span', { class: 'preco' }, precoTexto));
}

export function montarUI(acoes) {
  // Partes fixas: criadas uma vez a partir do catálogo.
  $('opcoes-base').append(...BASES.map((b) => opcaoRadio('base', b, b.preco ? `+ ${formatarPreco(b.preco)}` : 'incluso')));
  $('opcoes-cobertura').append(...COBERTURAS.map((c) => opcaoRadio('cobertura', c, c.preco ? `+ ${formatarPreco(c.preco)}` : '')));
  $('precos').append(...PRECO_BOLAS.slice(1).map((v, i) => linhaPontilhada(i ? `${i + 1} bolas` : '1 bola', formatarPreco(v))));

  $('lista-sabores').append(...SABORES.map((s) => el('li', {},
    el('button', { type: 'button', class: 'sabor', 'data-sabor': s.id, 'aria-describedby': 'regra-bolas' },
      el('span', { class: 'amostra', style: `--cor:${s.cor}`, 'aria-hidden': 'true' }),
      el('span', {},
        el('span', { class: 'sabor-nome' }, s.nome),
        el('span', { class: 'sabor-nota' }, s.premium ? `${s.nota}; + ${formatarPreco(ADICIONAL_PREMIUM)} a bola` : s.nota)),
      el('span', { class: 'sabor-direita', 'aria-hidden': 'true' },
        el('span', { class: 'sabor-qtd' }), el('span', { class: 'sabor-mais' }, '+'))))));

  // Eventos → ações
  document.querySelector('.quadro').addEventListener('change', (e) => {
    if (e.target.name === 'base') acoes.base(e.target.value);
    if (e.target.name === 'cobertura') acoes.cobertura(e.target.value);
  });
  $('lista-sabores').addEventListener('click', (e) => {
    const b = e.target.closest('.sabor');
    if (b) acoes.adicionar(b.dataset.sabor, b);
  });
  $('pilha').addEventListener('click', (e) => {
    const b = e.target.closest('.tirar');
    if (b) acoes.remover(Number(b.dataset.indice));
  });
  $('lista-fav').addEventListener('click', (e) => {
    const usar = e.target.closest('.fav-usar');
    const tirar = e.target.closest('.fav-tirar');
    if (usar) acoes.usarFavorito(usar.dataset.id);
    if (tirar) acoes.tirarFavorito(tirar.dataset.id);
  });
  $('copiar').addEventListener('click', acoes.copiar);
  $('salvar').addEventListener('click', acoes.salvar);
  $('reservar').addEventListener('click', acoes.reservar);
}

export function renderizar(estado) {
  for (const r of document.querySelectorAll('input[name=base]')) r.checked = r.value === estado.base;
  for (const r of document.querySelectorAll('input[name=cobertura]')) r.checked = r.value === estado.cobertura;

  const cheio = !podeAdicionar(estado);
  const regra = $('regra-bolas');
  regra.textContent = cheio
    ? `${MAX_BOLAS} de ${MAX_BOLAS} bolas. Tire uma para trocar de sabor.`
    : `Toque num sabor para pôr uma bola. ${estado.bolas.length} de ${MAX_BOLAS}.`;
  regra.classList.toggle('cheio', cheio);
  for (const b of document.querySelectorAll('.sabor')) {
    const qtd = estado.bolas.filter((s) => s === b.dataset.sabor).length;
    b.setAttribute('aria-disabled', String(cheio));
    b.querySelector('.sabor-qtd').textContent = qtd ? `${qtd}×` : '';
    b.setAttribute('aria-label', `Pôr uma bola de ${SABOR[b.dataset.sabor].nome}${qtd ? `, já tem ${qtd}` : ''}`);
  }

  const copinho = estado.base === 'copinho';
  $('t-montagem').textContent = copinho ? 'Seu copinho' : 'Sua casquinha';
  $('titulo-verbo').textContent = copinho ? 'Monte o seu' : 'Monte a sua';
  $('titulo-base').textContent = copinho ? 'copinho.' : 'casquinha.';
  // Lida de cima para baixo, como a pilha aparece na casquinha.
  $('pilha').replaceChildren(...estado.bolas.map((s, i) => el('li', {},
    el('span', { class: 'ordem' }, ordinal(i)),
    el('span', { class: 'amostra', style: `--cor:${SABOR[s].cor}`, 'aria-hidden': 'true' }),
    el('span', { class: 'pilha-nome' }, SABOR[s].nome),
    el('button', { type: 'button', class: 'tirar', 'data-indice': String(i), 'aria-label': `Tirar a ${ordinal(i)}, ${SABOR[s].nome}` }, 'Tirar'),
  )).reverse());
  $('pilha-vazia').hidden = estado.bolas.length > 0;

  $('resumo').replaceChildren(...itensDaConta(estado).map((i, k) => linhaPontilhada(i.rotulo, `${k ? '+ ' : ''}${formatarPreco(i.valor)}`)));
  $('total').textContent = formatarPreco(preco(estado));
}

export function renderizarFavoritos(lista) {
  $('qtd-fav').textContent = lista.length ? `(${lista.length})` : '';
  $('fav-vazio').hidden = lista.length > 0;
  $('lista-fav').replaceChildren(...lista.map((f) => el('li', {},
    el('button', { type: 'button', class: 'fav-usar', 'data-id': f.id, 'aria-label': `Montar de novo: ${f.nome}` },
      el('span', { class: 'amostras', 'aria-hidden': 'true' }, ...f.estado.bolas.map((s) => el('span', { class: 'amostra', style: `--cor:${SABOR[s].cor}` }))),
      el('span', {}, f.nome),
      el('span', { class: 'preco' }, formatarPreco(preco(f.estado)))),
    el('button', { type: 'button', class: 'tirar fav-tirar', 'data-id': f.id, 'aria-label': `Tirar dos favoritos: ${f.nome}` }, 'Tirar'))));
}

let timerStatus = 0;
export function avisar(texto) {
  const s = $('status');
  s.textContent = texto;
  clearTimeout(timerStatus);
  timerStatus = setTimeout(() => { s.textContent = ''; }, 3500);
}

export function piscar(botao) {
  botao.classList.remove('acabou-de-entrar');
  void botao.offsetWidth;
  botao.classList.add('acabou-de-entrar');
  setTimeout(() => botao.classList.remove('acabou-de-entrar'), 500);
}
