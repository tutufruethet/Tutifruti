import * as L from "./loja.js";
import { CARIMBOS_PARA_PREMIO } from "./dados.js";
import { $, $$, avisar, iniciarTopo } from "./comum.js";

const { real, esc } = L;
iniciarTopo();
const raiz = $("#conteudo");
let aba = "entrar";

function cartaoPedido(p) {
  const et = L.etapas(p);
  return `<li class="pedido" id="pedido-${p.numero}">
    <div class="linha1">
      <span class="numero num">#${p.numero}</span>
      <span class="secundario" style="font-size:var(--t-14)">${L.dataHora(p.criado)}, ${real(p.total)}</span>
    </div>
    <ul>${p.itens.map(i => `<li>${i.qtd}× ${esc(i.nome)}${i.detalhe ? ` (${esc(i.detalhe)})` : ""}</li>`).join("")}</ul>
    <div class="etapas" role="img" aria-label="Situação: ${et[p.status]}">
      ${et.map((e, k) => `<span class="${k <= p.status ? "feita" : ""}${k === p.status ? " atual" : ""}">${e}</span>`).join("")}
    </div>
  </li>`;
}

function blocoPedidos(u) {
  const ps = L.meusPedidos(u);
  return `<section class="bloco" id="pedidos" aria-labelledby="t-pedidos">
    <h2 id="t-pedidos">${u ? "Seus pedidos" : "Pedidos feitos neste aparelho"}</h2>
    ${ps.length ? `<ul class="pedidos-lista" aria-live="polite">${ps.map(cartaoPedido).join("")}</ul>`
      : `<p class="secundario">Nenhum pedido ainda. <a href="./#cardapio">Ver o cardápio</a></p>`}
  </section>`;
}

function deslogado() {
  raiz.innerHTML = `<div class="grid" style="padding:0">
    <div class="coluna-form">
      <div class="abas" role="tablist" aria-label="Entrar ou criar conta">
        <button role="tab" type="button" aria-selected="${aba === "entrar"}" aria-controls="f-conta" data-aba="entrar">Entrar</button>
        <button role="tab" type="button" aria-selected="${aba === "criar"}" aria-controls="f-conta" data-aba="criar">Criar conta</button>
      </div>
      <form id="f-conta" role="tabpanel" class="coluna-form" style="grid-column:auto" novalidate>
        ${aba === "criar" ? `
          <label class="campo"><span>Nome</span><input name="nome" autocomplete="name" required placeholder="Seu nome…"></label>
          <label class="campo"><span>Telefone com DDD</span><input name="telefone" type="tel" inputmode="tel" autocomplete="tel" required placeholder="(81) 9 0000-0000…"></label>` : ""}
        <label class="campo"><span>E-mail</span><input name="email" type="email" autocomplete="email" spellcheck="false" required placeholder="voce@email.com…"></label>
        <label class="campo"><span>Senha</span><input name="senha" type="password" autocomplete="${aba === "criar" ? "new-password" : "current-password"}" required minlength="6" placeholder="${aba === "criar" ? "Pelo menos 6 caracteres…" : "Sua senha…"}"></label>
        <p class="erro" id="erro-conta" aria-live="polite"></p>
        <div><button class="btn fogo" type="submit">${aba === "criar" ? "Criar conta" : "Entrar"}</button></div>
        <p class="secundario" style="font-size:var(--t-14);margin:0">${aba === "criar" ? "Com a conta você ganha um carimbo por pedido com hambúrguer. São 10 para um 47 Original de presente." : "Ainda não tem conta? Use a aba “Criar conta”."}</p>
      </form>
    </div>
    <div class="coluna-lado">${blocoPedidos(null)}</div>
  </div>`;

  $$("[data-aba]", raiz).forEach(b => b.onclick = () => { aba = b.dataset.aba; deslogado(); $(`[data-aba="${aba}"]`).focus(); });
  // setas entre as abas
  $("[role=tablist]", raiz).addEventListener("keydown", e => {
    if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
    aba = aba === "entrar" ? "criar" : "entrar"; deslogado(); $(`[data-aba="${aba}"]`).focus();
  });
  const f = $("#f-conta");
  f.addEventListener("submit", async e => {
    e.preventDefault();
    const campos = $$("input", f); campos.forEach(c => c.removeAttribute("aria-invalid"));
    const vazio = campos.find(c => !c.value.trim());
    const erro = $("#erro-conta");
    if (vazio) { vazio.setAttribute("aria-invalid", "true"); erro.textContent = `Preencha ${vazio.closest("label").querySelector("span").textContent.toLowerCase()}.`; vazio.focus(); return; }
    if (!f.email.checkValidity()) { f.email.setAttribute("aria-invalid", "true"); erro.textContent = "Confira o e-mail: falta o @ ou o domínio."; f.email.focus(); return; }
    const d = Object.fromEntries(new FormData(f));
    const r = aba === "criar" ? await L.cadastrar(d) : await L.entrar(d.email, d.senha);
    if (r.erro) { erro.textContent = r.erro; (r.campo ? f[r.campo] : f.email).focus(); return; }
    avisar(aba === "criar" ? "Conta criada. Bem-vindo à Brasa!" : "Você entrou.");
  });
}

function logado(u) {
  const loja = L.cupons().filter(c => c.ativo);
  const pessoais = u.cupons.filter(c => !c.usado);
  raiz.innerHTML = `<div class="grid" style="padding:0">
    <div class="coluna-form" style="grid-column:1/6;display:block">
      <section class="bloco" aria-labelledby="t-cartao">
        <h2 id="t-cartao">Cartão Brasa</h2>
        <div class="cartao" style="margin:0">
          <div class="topo-cartao"><strong>${esc(u.nome.split(" ")[0])}</strong><span class="secundario">${u.carimbos} de ${CARIMBOS_PARA_PREMIO}</span></div>
          <div class="carimbos">${Array.from({ length: CARIMBOS_PARA_PREMIO }, (_, i) =>
            `<span class="carimbo${i < u.carimbos ? " feito" : ""}" style="--r:${((i * 37) % 24) - 12}deg"></span>`).join("")}</div>
        </div>
        <p class="secundario" style="font-size:var(--t-14)">O carimbo entra quando um pedido com hambúrguer é entregue ou retirado.</p>
      </section>
      <section class="bloco" aria-labelledby="t-cupons">
        <h2 id="t-cupons">Cupons</h2>
        <ul class="cupons">
          ${pessoais.map(c => `<li><div><code>${esc(c.codigo)}</code><div class="desc">${esc(c.desc)}. Só seu.</div></div><button class="btn pequeno" type="button" data-copiar="${esc(c.codigo)}">Copiar</button></li>`).join("")}
          ${loja.map(c => `<li><div><code>${esc(c.codigo)}</code><div class="desc">${esc(c.desc)}</div></div><button class="btn pequeno" type="button" data-copiar="${esc(c.codigo)}">Copiar</button></li>`).join("")}
        </ul>
      </section>
      <section class="bloco" aria-labelledby="t-dados">
        <h2 id="t-dados">Seus dados</h2>
        <form id="f-dados" class="coluna-form" style="grid-column:auto" novalidate>
          <label class="campo"><span>Nome</span><input name="nome" autocomplete="name" value="${esc(u.nome)}" required></label>
          <label class="campo"><span>Telefone</span><input name="telefone" type="tel" autocomplete="tel" value="${esc(u.telefone)}" required></label>
          <label class="campo"><span>Endereço de entrega</span><textarea name="endereco" autocomplete="street-address" placeholder="Rua, número, bairro…">${esc(u.endereco || "")}</textarea></label>
          <p class="secundario" style="font-size:var(--t-14);margin:0">E-mail: ${esc(u.email)}</p>
          <div style="display:flex;gap:.75rem;flex-wrap:wrap"><button class="btn" type="submit">Salvar dados</button><button class="btn" type="button" id="sair">Sair da conta</button></div>
        </form>
      </section>
    </div>
    <div class="coluna-lado">${blocoPedidos(u)}</div>
  </div>`;

  $("#f-dados").addEventListener("submit", e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    if (!d.nome.trim()) { e.target.nome.focus(); return; }
    L.atualizarUsuario(u.email, x => { x.nome = d.nome.trim(); x.telefone = d.telefone.trim(); x.endereco = d.endereco.trim(); });
    avisar("Dados salvos.");
  });
  $("#sair").onclick = () => { L.sair(); avisar("Você saiu da conta."); };
  $$("[data-copiar]").forEach(b => b.onclick = async () => {
    try { await navigator.clipboard.writeText(b.dataset.copiar); avisar(`Cupom ${b.dataset.copiar} copiado.`); }
    catch { avisar(`Use o cupom ${b.dataset.copiar} no pedido.`); }
  });
}

let ultimo;
function desenhar() {
  const u = L.sessao();
  const trocou = (u?.email || null) !== ultimo; ultimo = u?.email || null;
  $("#titulo").textContent = u ? `Olá, ${u.nome.split(" ")[0]}` : "Minha conta";
  document.title = (u ? "Sua conta" : "Entrar") + " — Brasa 47";
  // não redesenha um formulário enquanto a pessoa digita
  if (!trocou && raiz.contains(document.activeElement) && document.activeElement.matches("input, textarea")) {
    const lado = $(".coluna-lado"); if (lado) lado.innerHTML = blocoPedidos(u);
    return;
  }
  u ? logado(u) : deslogado();
  if (location.hash.startsWith("#pedido")) $("#pedidos")?.scrollIntoView();
}
desenhar();
L.ouvir(k => { if (["sessao", "usuarios", "pedidos", "cupons"].includes(k)) desenhar(); });
