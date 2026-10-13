// Estado da loja guardado no navegador (localStorage).
// É uma demonstração: num site real, pedidos, contas e preços ficam num servidor.
import {
  BURGERS, ACOMPANHAMENTOS, BEBIDAS, ADICIONAIS, CUPONS_PADRAO, CONFIG_PADRAO,
  AVALIACOES_PADRAO, CARIMBOS_PARA_PREMIO, NOMES_CAMADA
} from "./dados.js";

const P = "brasa47:";
const ler = (k, padrao) => {
  try { const v = localStorage.getItem(P + k); return v ? JSON.parse(v) : structuredClone(padrao); }
  catch { return structuredClone(padrao); }
};
const gravar = (k, v) => {
  try { localStorage.setItem(P + k, JSON.stringify(v)); } catch { /* modo privado: segue só na memória */ }
  emitir(k);
};

// avisos entre partes da página e entre abas
const ouvintes = new Set();
export const ouvir = fn => (ouvintes.add(fn), () => ouvintes.delete(fn));
function emitir(k) { ouvintes.forEach(fn => fn(k)); }
addEventListener("storage", e => { if (e.key?.startsWith(P)) emitir(e.key.slice(P.length)); });

export const real = c => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(c / 100);
export const dataCurta = iso => new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" }).format(new Date(iso));
export const dataHora = iso => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// ---------- configuração e produtos (com ajustes do admin) ----------
export const config = () => ({ ...CONFIG_PADRAO, ...ler("config", {}) });
export const salvarConfig = parcial => gravar("config", { ...ler("config", {}), ...parcial });

const ajustes = () => ler("produtos", {}); // { id: { preco, indisponivel } }
export function salvarProduto(id, parcial) {
  const a = ajustes(); a[id] = { ...a[id], ...parcial }; gravar("produtos", a);
}
const aplicar = lista => lista.map(p => ({ ...p, ...ajustes()[p.id] }));
export const burgers = () => aplicar(BURGERS);
export const acompanhamentos = () => aplicar(ACOMPANHAMENTOS);
export const bebidas = () => aplicar(BEBIDAS);
export const adicionais = () => ADICIONAIS;
export const todosProdutos = () => [...burgers(), ...acompanhamentos(), ...bebidas()];
export const produto = id => todosProdutos().find(p => p.id === id);

// ---------- carrinho ----------
// item: { chave, id, qtd, ponto?, extras: [id], sem: [camada], obs }
export const carrinho = () => ler("carrinho", []);
const chaveItem = i => [i.id, i.ponto || "", [...(i.extras || [])].sort().join("+"), [...(i.sem || [])].sort().join("+"), i.obs || ""].join("|");

export function precoItem(i) {
  const p = produto(i.id); if (!p) return 0;
  const extras = (i.extras || []).reduce((s, e) => s + (ADICIONAIS.find(a => a.id === e)?.preco || 0), 0);
  return p.preco + extras;
}
export function descricaoItem(i) {
  const partes = [];
  if (i.ponto) partes.push(i.ponto.toLowerCase());
  (i.extras || []).forEach(e => partes.push("+ " + ADICIONAIS.find(a => a.id === e)?.nome.toLowerCase()));
  (i.sem || []).forEach(s => partes.push("sem " + (NOMES_CAMADA[s] || s)));
  if (i.obs) partes.push(`“${i.obs}”`);
  return partes.join(", ");
}
export function camadasItem(i) {
  const p = produto(i.id); if (!p?.camadas) return null;
  const base = p.camadas.filter(c => !(i.sem || []).includes(c));
  const topo = base.pop();
  (i.extras || []).forEach(e => base.push(ADICIONAIS.find(a => a.id === e).camada));
  return [...base, topo];
}

export function adicionar(item) {
  const c = carrinho();
  const novo = { ...item, qtd: item.qtd || 1 };
  novo.chave = chaveItem(novo);
  const igual = c.find(x => x.chave === novo.chave);
  if (igual) igual.qtd += novo.qtd; else c.push(novo);
  gravar("carrinho", c);
}
export function mudarQtd(chave, d) {
  const c = carrinho(); const i = c.find(x => x.chave === chave); if (!i) return;
  i.qtd = Math.max(0, i.qtd + d);
  gravar("carrinho", c.filter(x => x.qtd > 0));
}
export function remover(chave) {
  const c = carrinho(); const pos = c.findIndex(x => x.chave === chave);
  const [tirado] = c.splice(pos, 1); gravar("carrinho", c);
  return () => { const d = carrinho(); d.splice(pos, 0, tirado); gravar("carrinho", d); }; // desfazer
}
export const limparCarrinho = () => gravar("carrinho", []);
export const contagem = () => carrinho().reduce((s, i) => s + i.qtd, 0);
export const subtotal = (itens = carrinho()) => itens.reduce((s, i) => s + precoItem(i) * i.qtd, 0);

// ---------- cupons ----------
export const cupons = () => ler("cupons", CUPONS_PADRAO);
export const salvarCupons = l => gravar("cupons", l);
export function validarCupom(codigo, sub, usuario = sessao()) {
  const c = codigo.trim().toUpperCase(); if (!c) return { erro: null };
  const pessoal = usuario?.cupons?.find(x => x.codigo === c && !x.usado);
  const cupom = pessoal || cupons().find(x => x.codigo === c && x.ativo);
  if (!cupom) return { erro: "Cupom não encontrado. Confira as letras e tente de novo." };
  if (sub < (cupom.minimo || 0)) return { erro: `Este cupom vale para pedidos a partir de ${real(cupom.minimo)}.` };
  const desconto = cupom.tipo === "pct" ? Math.round(sub * cupom.valor / 100) : Math.min(cupom.valor, sub);
  return { cupom, desconto };
}

// ---------- contas (demonstração: hash da senha no navegador) ----------
async function hash(t) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("brasa47:" + t));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}
const usuarios = () => ler("usuarios", []);
export const sessao = () => {
  const email = ler("sessao", null); return email ? usuarios().find(u => u.email === email) || null : null;
};
export async function cadastrar({ nome, email, telefone, senha }) {
  email = email.trim().toLowerCase();
  const us = usuarios();
  if (us.some(u => u.email === email)) return { erro: "Já existe uma conta com este e-mail. Entre com a sua senha." };
  if (senha.length < 6) return { erro: "Use uma senha com pelo menos 6 caracteres.", campo: "senha" };
  us.push({ nome: nome.trim(), email, telefone: telefone.trim(), senha: await hash(senha), carimbos: 0, cupons: [], endereco: "", desde: new Date().toISOString() });
  gravar("usuarios", us); gravar("sessao", email);
  return { ok: true };
}
export async function entrar(email, senha) {
  email = email.trim().toLowerCase();
  const u = usuarios().find(x => x.email === email);
  if (!u || u.senha !== await hash(senha)) return { erro: "E-mail ou senha não conferem." };
  gravar("sessao", email); return { ok: true };
}
export const sair = () => gravar("sessao", null);
export function atualizarUsuario(email, fn) {
  const us = usuarios(); const u = us.find(x => x.email === email); if (!u) return;
  fn(u); gravar("usuarios", us);
}

// ---------- pedidos ----------
export const ETAPAS = ["Recebido", "Na chapa", "Saiu para entrega", "Entregue"];
export const ETAPAS_RETIRADA = ["Recebido", "Na chapa", "Pronto para retirar", "Retirado"];
export const etapas = p => p.tipo === "retirada" ? ETAPAS_RETIRADA : ETAPAS;
export const pedidos = () => ler("pedidos", []);
export const meusPedidos = (u = sessao()) => {
  const daqui = ler("meus", []);
  return pedidos().filter(p => daqui.includes(p.numero) || (u && p.email === u.email));
};

export function fecharPedido({ cliente, tipo, endereco, pagamento, troco, cupom, obs }) {
  const itens = carrinho(); const sub = subtotal(itens);
  const v = cupom ? validarCupom(cupom, sub) : { desconto: 0 };
  const taxa = tipo === "entrega" ? config().taxaEntrega : 0;
  const lista = pedidos();
  const numero = 4700 + lista.length + 1;
  const usuario = sessao();
  const pedido = {
    numero, criado: new Date().toISOString(), status: 0, tipo, endereco: tipo === "entrega" ? endereco : "",
    cliente, pagamento, troco, obs, email: usuario?.email || null,
    itens: itens.map(i => ({ ...i, nome: produto(i.id).nome, preco: precoItem(i), detalhe: descricaoItem(i) })),
    subtotal: sub, desconto: v.desconto || 0, cupom: v.cupom?.codigo || null, taxa,
    total: Math.max(0, sub - (v.desconto || 0)) + taxa
  };
  lista.unshift(pedido); gravar("pedidos", lista);
  gravar("meus", [numero, ...ler("meus", [])]); // pedidos feitos neste aparelho

  if (usuario) atualizarUsuario(usuario.email, u => {
    if (v.cupom) { const c = u.cupons.find(x => x.codigo === v.cupom.codigo); if (c) c.usado = true; }
    if (tipo === "entrega") u.endereco = endereco;
  });
  limparCarrinho();
  return pedido;
}

// o carimbo entra quando o pedido é entregue/retirado e tem hambúrguer
export function mudarStatus(numero, status) {
  const lista = pedidos(); const p = lista.find(x => x.numero === numero); if (!p) return;
  const final = etapas(p).length - 1;
  const ganhou = status === final && p.status !== final && !p.carimbado && p.email && p.itens.some(i => produto(i.id)?.camadas);
  p.status = status;
  if (ganhou) {
    p.carimbado = true;
    atualizarUsuario(p.email, u => {
      u.carimbos += 1;
      if (u.carimbos >= CARIMBOS_PARA_PREMIO) {
        u.carimbos -= CARIMBOS_PARA_PREMIO;
        u.cupons.push({ codigo: "BRASA-" + Math.random().toString(36).slice(2, 6).toUpperCase(), tipo: "fixo", valor: 3290, minimo: 0, desc: "Um 47 Original por nossa conta" });
      }
    });
  }
  gravar("pedidos", lista);
}

export function textoWhatsApp(p) {
  const linhas = [
    `*Pedido #${p.numero} — Brasa 47*`, "",
    ...p.itens.map(i => `${i.qtd}× ${i.nome} — ${real(i.preco * i.qtd)}${i.detalhe ? `\n   ${i.detalhe}` : ""}`), "",
    `Subtotal: ${real(p.subtotal)}`,
    p.desconto ? `Cupom ${p.cupom}: −${real(p.desconto)}` : null,
    p.tipo === "entrega" ? `Entrega: ${real(p.taxa)}` : "Retirada na loja",
    `*Total: ${real(p.total)}*`, "",
    `Nome: ${p.cliente.nome}`, `Telefone: ${p.cliente.telefone}`,
    p.tipo === "entrega" ? `Endereço: ${p.endereco}` : null,
    `Pagamento: ${p.pagamento}${p.troco ? ` (troco para ${p.troco})` : ""}`,
    p.obs ? `Obs.: ${p.obs}` : null
  ].filter(l => l !== null);
  return linhas.join("\n");
}
export function linkWhatsApp(texto) {
  const n = config().whatsapp.replace(/\D/g, "");
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`;
}

// ---------- avaliações ----------
export const avaliacoes = () => ler("avaliacoes", AVALIACOES_PADRAO);
export function avaliar({ nome, nota, texto }) {
  const l = avaliacoes(); l.unshift({ nome: nome.trim(), nota, texto: texto.trim(), data: new Date().toISOString().slice(0, 10) });
  gravar("avaliacoes", l);
}
