// Regras da gelateria. Funções puras: recebem dados (inclusive o tempo) e devolvem dados.
// Nada aqui toca DOM, rede ou GPU; os testes rodam no Node.

import { SABORES, BASES, COBERTURAS, PRECO_BOLAS, ADICIONAL_PREMIUM, MAX_BOLAS, HORARIO } from './dados.js';

const porId = (lista) => Object.fromEntries(lista.map((x) => [x.id, x]));
export const SABOR = porId(SABORES);
export const BASE = porId(BASES);
export const COBERTURA = porId(COBERTURAS);

export const estadoInicial = Object.freeze({ base: 'casquinha', bolas: Object.freeze(['pistache', 'morango']), cobertura: 'nenhuma' });

// Defesa em profundidade: todo estado que entra (URL, storage, favorito) passa por aqui.
export function sanear(bruto) {
  const e = bruto && typeof bruto === 'object' ? bruto : {};
  return {
    base: BASE[e.base] ? e.base : estadoInicial.base,
    bolas: Array.isArray(e.bolas) ? e.bolas.filter((s) => SABOR[s]).slice(0, MAX_BOLAS) : [...estadoInicial.bolas],
    cobertura: COBERTURA[e.cobertura] ? e.cobertura : estadoInicial.cobertura,
  };
}

export const podeAdicionar = (estado) => estado.bolas.length < MAX_BOLAS;

export function reduzir(estado, acao) {
  switch (acao.tipo) {
    case 'adicionar':
      if (!SABOR[acao.sabor] || !podeAdicionar(estado)) return estado;
      return { ...estado, bolas: [...estado.bolas, acao.sabor] };
    case 'remover':
      if (!(acao.indice >= 0 && acao.indice < estado.bolas.length)) return estado;
      return { ...estado, bolas: estado.bolas.filter((_, i) => i !== acao.indice) };
    case 'base':
      return BASE[acao.valor] && acao.valor !== estado.base ? { ...estado, base: acao.valor } : estado;
    case 'cobertura':
      return COBERTURA[acao.valor] && acao.valor !== estado.cobertura ? { ...estado, cobertura: acao.valor } : estado;
    case 'carregar':
      return sanear(acao.estado);
    default:
      return estado;
  }
}

export function preco(estado) {
  const n = estado.bolas.length;
  if (n === 0) return 0;
  const premium = estado.bolas.filter((s) => SABOR[s].premium).length * ADICIONAL_PREMIUM;
  return PRECO_BOLAS[n] + premium + BASE[estado.base].preco + COBERTURA[estado.cobertura].preco;
}

// A conta em linhas, na ordem do quadro de preços. A soma é sempre igual a preco().
export function itensDaConta(estado) {
  const n = estado.bolas.length;
  if (n === 0) return [];
  const itens = [{ rotulo: n === 1 ? '1 bola' : `${n} bolas`, valor: PRECO_BOLAS[n] }];
  for (const s of SABORES.filter((x) => x.premium)) {
    const qtd = estado.bolas.filter((b) => b === s.id).length;
    if (qtd) itens.push({ rotulo: qtd > 1 ? `${s.nome} (${qtd}×)` : s.nome, valor: qtd * ADICIONAL_PREMIUM });
  }
  if (BASE[estado.base].preco) itens.push({ rotulo: BASE[estado.base].nome, valor: BASE[estado.base].preco });
  if (COBERTURA[estado.cobertura].preco) itens.push({ rotulo: COBERTURA[estado.cobertura].nome, valor: COBERTURA[estado.cobertura].preco });
  return itens;
}

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatarPreco = (centavos) => moeda.format(centavos / 100);

export const paraQuery = (e) => `base=${e.base}&bolas=${e.bolas.join(',')}&cob=${e.cobertura}`;

export function deQuery(search) {
  const p = new URLSearchParams(search);
  if (!p.has('base') && !p.has('bolas') && !p.has('cob')) return estadoInicial;
  return sanear({
    base: p.get('base') ?? undefined,
    bolas: p.has('bolas') ? p.get('bolas').split(',').filter(Boolean) : undefined,
    cobertura: p.get('cob') ?? undefined,
  });
}

const juntar = (nomes) => (nomes.length < 2 ? nomes.join('') : `${nomes.slice(0, -1).join(', ')} e ${nomes.at(-1)}`);

export function nomeDaMontagem(e) {
  if (e.bolas.length === 0) return e.base === 'copinho' ? 'Copinho vazio' : 'Casquinha vazia';
  const onde = e.base === 'copinho' ? 'no copinho' : 'na casquinha';
  const cob = { nenhuma: '', granulado: ', com granulado', calda: ', com calda de chocolate' }[e.cobertura];
  return `${juntar(e.bolas.map((s) => SABOR[s].nome))} ${onde}${cob}`;
}

// ---- Retirada -------------------------------------------------------------

const dois = (n) => String(n).padStart(2, '0');
const valorLocal = (d) => `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}T${dois(d.getHours())}:${dois(d.getMinutes())}`;

function deValor(valor) {
  const [data, hora] = valor.split('T');
  const [a, m, d] = data.split('-').map(Number);
  const [h, mi] = hora.split(':').map(Number);
  return new Date(a, m - 1, d, h, mi);
}

// Horários de 15 em 15 min, com 20 min de antecedência; se hoje acabou, amanhã.
export function horariosDeRetirada(agora, cfg = HORARIO) {
  const minAgora = agora.getHours() * 60 + agora.getMinutes() + (agora.getSeconds() > 0 ? 1 : 0);
  let inicio = Math.max(cfg.abre, Math.ceil((minAgora + cfg.antecedencia) / cfg.passo) * cfg.passo);
  let dia = 0;
  if (inicio > cfg.fecha) { inicio = cfg.abre; dia = 1; }
  const lista = [];
  for (let m = inicio; m <= cfg.fecha; m += cfg.passo) {
    const d = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + dia, 0, m);
    lista.push({ valor: valorLocal(d), rotulo: `${dia ? 'Amanhã' : 'Hoje'}, ${dois(d.getHours())}:${dois(d.getMinutes())}` });
  }
  return lista;
}

export function validarReserva({ nome, horario }, horariosValidos, estado) {
  const erros = {};
  if ((nome ?? '').trim().length < 2) erros.nome = 'Escreva seu nome para chamarmos no balcão.';
  if (!horariosValidos.includes(horario)) erros.horario = 'Escolha um dos horários da lista.';
  if (estado.bolas.length === 0) erros.bolas = 'Escolha pelo menos uma bola antes de reservar.';
  return erros;
}

// Hash FNV-1a: mesmo pedido, mesmo código (nada de Math.random, para o teste ser reprodutível).
function fnv1a(texto) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) h = Math.imul(h ^ texto.charCodeAt(i), 16777619);
  return h >>> 0;
}
const ALFABETO = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // sem 0/O e 1/I

export function codigoDaReserva(estado, horario, nome) {
  let h = fnv1a(`${paraQuery(estado)}|${horario}|${nome.trim().toLowerCase()}`);
  let s = '';
  for (let i = 0; i < 4; i++) { s += ALFABETO[h & 31]; h >>>= 5; }
  return `TF-${s}`;
}

// ---- Agenda (.ics, RFC 5545) ----------------------------------------------

const escaparICS = (t) => String(t).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const dataICS = (d) => `${d.getFullYear()}${dois(d.getMonth() + 1)}${dois(d.getDate())}T${dois(d.getHours())}${dois(d.getMinutes())}00`;
const dataUTC = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

// Linhas com mais de 75 octetos continuam na linha seguinte, começando com espaço.
function dobrar(linha) {
  const enc = new TextEncoder();
  const partes = [];
  let atual = '';
  let bytes = 0;
  for (const ch of linha) {
    const n = enc.encode(ch).length;
    const limite = partes.length ? 74 : 75;
    if (bytes + n > limite) { partes.push(atual); atual = ''; bytes = 0; }
    atual += ch; bytes += n;
  }
  partes.push(atual);
  return partes.map((p, i) => (i ? ' ' + p : p)).join('\r\n');
}

export function gerarICS({ codigo, inicio, resumo, descricao, agora }) {
  const ini = deValor(inicio);
  const fim = new Date(ini.getFullYear(), ini.getMonth(), ini.getDate(), ini.getHours(), ini.getMinutes() + HORARIO.duracao);
  const linhas = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Tutifruti//Gelateria//PT', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${codigo}@tutifruti.gelateria`,
    `DTSTAMP:${dataUTC(agora)}`,
    `DTSTART:${dataICS(ini)}`,
    `DTEND:${dataICS(fim)}`,
    `SUMMARY:${escaparICS(resumo)}`,
    `DESCRIPTION:${escaparICS(descricao)}`,
    'END:VEVENT', 'END:VCALENDAR',
  ];
  return linhas.map(dobrar).join('\r\n') + '\r\n';
}

// ---- Favoritos (localStorage com rede de segurança) -----------------------

const CHAVE = 'tutifruti:favoritos:v1';
const MAX_FAVORITOS = 8;

export function lerFavoritos(storage) {
  let bruto;
  try { bruto = JSON.parse(storage?.getItem(CHAVE) ?? '[]'); } catch { return []; }
  if (!Array.isArray(bruto)) return [];
  const vistos = new Set();
  const lista = [];
  for (const item of bruto) {
    if (!item || typeof item !== 'object') continue;
    const estado = sanear(item.estado);
    const id = paraQuery(estado);
    if (estado.bolas.length === 0 || vistos.has(id)) continue;
    vistos.add(id);
    lista.push({ id, estado, nome: nomeDaMontagem(estado) });
  }
  return lista.slice(0, MAX_FAVORITOS);
}

function gravar(storage, lista) {
  try { storage.setItem(CHAVE, JSON.stringify(lista.map(({ id, estado }) => ({ id, estado })))); return true; } catch { return false; }
}

export function salvarFavorito(storage, estado) {
  const e = sanear(estado);
  if (e.bolas.length === 0) return false;
  const id = paraQuery(e);
  const lista = [{ id, estado: e }, ...lerFavoritos(storage).filter((f) => f.id !== id)].slice(0, MAX_FAVORITOS);
  return gravar(storage, lista);
}

export function removerFavorito(storage, id) {
  return gravar(storage, lerFavoritos(storage).filter((f) => f.id !== id));
}
