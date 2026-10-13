import * as L from "./loja.js";
import { $, $$, avisar } from "./comum.js";

const { real, esc } = L;
const raiz = $("#conteudo");
// PIN de demonstração. Num site real, a área da loja fica atrás de login no servidor.
const PIN = "4747";
const liberado = () => { try { return sessionStorage.getItem("brasa47:admin") === "1"; } catch { return false; } };
let aba = "pedidos", filtro = "andamento";

const centavos = txt => {
  const n = Number(String(txt).replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3})/g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
};
const paraCampo = c => (c / 100).toFixed(2).replace(".", ",");

function portao() {
  $("#sair-admin").hidden = true;
  raiz.innerHTML = `<form id="f-pin" class="coluna-form" style="max-width:24rem" novalidate>
    <label class="campo"><span>PIN da equipe</span><input name="pin" type="password" inputmode="numeric" autocomplete="off" required placeholder="4 dígitos…"></label>
    <p class="erro" id="erro-pin" aria-live="polite"></p>
    <div><button class="btn fogo" type="submit">Entrar na área da loja</button></div>
    <p class="secundario" style="font-size:var(--t-14);margin:0">Demonstração: o PIN é 4747. Tudo o que você muda aqui vale só neste navegador.</p>
  </form>`;
  const f = $("#f-pin"); f.pin.focus();
  f.addEventListener("submit", e => {
    e.preventDefault();
    if (f.pin.value !== PIN) { $("#erro-pin").textContent = "PIN incorreto. Tente de novo."; f.pin.select(); return; }
    try { sessionStorage.setItem("brasa47:admin", "1"); } catch {}
    desenhar();
  });
}

function abas() {
  const nomes = { pedidos: "Pedidos", produtos: "Produtos e preços", cupons: "Cupons", loja: "Loja" };
  return `<div class="abas" role="tablist" aria-label="Seções da área da loja">${Object.entries(nomes).map(([k, v]) =>
    `<button role="tab" type="button" id="tab-${k}" aria-selected="${aba === k}" aria-controls="painel" data-aba="${k}">${v}${k === "pedidos" ? ` <span class="contador" style="margin-left:.3rem">${L.pedidos().filter(p => p.status < L.etapas(p).length - 1).length}</span>` : ""}</button>`).join("")}</div>`;
}

function painelPedidos() {
  const todos = L.pedidos();
  const hoje = new Date().toDateString();
  const deHoje = todos.filter(p => new Date(p.criado).toDateString() === hoje);
  const fat = deHoje.reduce((s, p) => s + p.total, 0);
  const andamento = todos.filter(p => p.status < L.etapas(p).length - 1);
  const lista = filtro === "andamento" ? andamento : todos;
  return `<div class="resumo">
      <div><strong>${deHoje.length}</strong><span>pedidos hoje</span></div>
      <div><strong>${real(fat)}</strong><span>vendido hoje</span></div>
      <div><strong>${deHoje.length ? real(Math.round(fat / deHoje.length)) : "—"}</strong><span>ticket médio</span></div>
      <div><strong>${andamento.length}</strong><span>em andamento</span></div>
    </div>
    <fieldset class="escolha" style="margin-bottom:1.5rem"><legend>Mostrar</legend>
      <label><input type="radio" name="filtro" value="andamento"${filtro === "andamento" ? " checked" : ""}><span>Em andamento</span></label>
      <label><input type="radio" name="filtro" value="todos"${filtro === "todos" ? " checked" : ""}><span>Todos</span></label>
    </fieldset>
    ${lista.length ? `<ul class="pedidos-admin">${lista.map(p => `<li class="pedido">
      <div class="linha1"><span class="numero num">#${p.numero}</span><span class="secundario" style="font-size:var(--t-14)">${L.dataHora(p.criado)}</span></div>
      <p style="margin:.5rem 0 0;font-weight:600">${esc(p.cliente.nome)}, ${esc(p.cliente.telefone)}</p>
      <p class="secundario" style="margin:.2rem 0 0;font-size:var(--t-14)">${p.tipo === "entrega" ? "Entrega: " + esc(p.endereco) : "Retirada na loja"}</p>
      <ul>${p.itens.map(i => `<li>${i.qtd}× ${esc(i.nome)}${i.detalhe ? ` (${esc(i.detalhe)})` : ""}</li>`).join("")}</ul>
      <p style="margin:0;font-size:var(--t-14)">${real(p.total)} em ${esc(p.pagamento.toLowerCase())}${p.troco ? `, troco para ${esc(p.troco)}` : ""}${p.cupom ? `, cupom ${esc(p.cupom)}` : ""}</p>
      ${p.obs ? `<p class="secundario" style="margin:.3rem 0 0;font-size:var(--t-14)">Obs.: ${esc(p.obs)}</p>` : ""}
      <label class="so-leitor" for="st-${p.numero}">Situação do pedido ${p.numero}</label>
      <select id="st-${p.numero}" data-status="${p.numero}">${L.etapas(p).map((e, k) => `<option value="${k}"${k === p.status ? " selected" : ""}>${e}</option>`).join("")}</select>
    </li>`).join("")}</ul>`
    : `<p class="secundario">${filtro === "andamento" ? "Nenhum pedido em andamento. Os novos aparecem aqui na hora." : "Nenhum pedido ainda. Faça um pelo site para testar."}</p>`}`;
}

function painelProdutos() {
  const grupos = [["Hambúrgueres", L.burgers()], ["Acompanhamentos", L.acompanhamentos()], ["Bebidas", L.bebidas()]];
  return `<div class="rolar"><table class="tabela">
    <thead><tr><th scope="col">Produto</th><th scope="col">Preço (R$)</th><th scope="col">Disponível</th></tr></thead>
    <tbody>${grupos.map(([g, ps]) => `<tr><th colspan="3" scope="rowgroup" style="padding-top:1.5rem;color:var(--osso)">${g}</th></tr>` + ps.map(p => `<tr>
      <td>${esc(p.nome)}</td>
      <td><input type="text" inputmode="decimal" autocomplete="off" aria-label="Preço de ${esc(p.nome)}" data-preco="${p.id}" value="${paraCampo(p.preco)}"></td>
      <td><label class="chave"><input type="checkbox" data-disp="${p.id}"${p.indisponivel ? "" : " checked"}><span>${p.indisponivel ? "Acabou" : "Sim"}</span></label></td>
    </tr>`).join("")).join("")}</tbody></table></div>
    <p class="secundario" style="font-size:var(--t-14)">O preço é salvo quando você sai do campo. O site atualiza na hora, inclusive em outras abas.</p>`;
}

function painelCupons() {
  return `<div class="grid" style="padding:0">
    <div class="coluna-form" style="grid-column:1/7;display:block">
      <ul class="cupons">${L.cupons().map((c, i) => `<li>
        <div><code>${esc(c.codigo)}</code><div class="desc">${esc(c.desc)}</div></div>
        <label class="chave"><input type="checkbox" data-cupom="${i}"${c.ativo ? " checked" : ""}><span>${c.ativo ? "Ativo" : "Pausado"}</span></label>
      </li>`).join("")}</ul>
    </div>
    <form class="coluna-lado coluna-form" id="f-cupom" style="grid-column:8/13" novalidate>
      <h2 style="font:600 var(--t-24)/1.2 var(--sans);margin:0">Novo cupom</h2>
      <label class="campo"><span>Código</span><input name="codigo" autocomplete="off" spellcheck="false" required placeholder="Ex.: SEXTA47…" style="text-transform:uppercase"></label>
      <fieldset class="escolha"><legend>Tipo de desconto</legend>
        <label><input type="radio" name="tipo" value="pct" checked><span>Porcentagem</span></label>
        <label><input type="radio" name="tipo" value="fixo"><span>Valor em reais</span></label>
      </fieldset>
      <div class="dupla">
        <label class="campo"><span>Desconto</span><input name="valor" inputmode="decimal" autocomplete="off" required placeholder="Ex.: 15…"></label>
        <label class="campo"><span>Pedido mínimo (R$)</span><input name="minimo" inputmode="decimal" autocomplete="off" placeholder="Ex.: 50…"></label>
      </div>
      <label class="campo"><span>Descrição para o cliente</span><input name="desc" autocomplete="off" required placeholder="Ex.: 15% às sextas…"></label>
      <p class="erro" id="erro-cupom" aria-live="polite"></p>
      <div><button class="btn fogo" type="submit">Criar cupom</button></div>
    </form>
  </div>`;
}

function painelLoja() {
  const c = L.config();
  return `<form id="f-loja" class="coluna-form" style="max-width:34rem" novalidate>
    <label class="chave"><input type="checkbox" name="aberto"${c.aberto ? " checked" : ""}><span>Recebendo pedidos pelo site</span></label>
    <label class="campo"><span>Número do WhatsApp da loja (com DDI e DDD)</span><input name="whatsapp" type="tel" inputmode="tel" autocomplete="off" value="${esc(c.whatsapp)}" placeholder="Ex.: 55 81 9 0000-0000…"></label>
    <p class="secundario" style="font-size:var(--t-14);margin:-.5rem 0 0">Vazio: o WhatsApp abre e o cliente escolhe para quem enviar.</p>
    <label class="campo"><span>Taxa de entrega (R$)</span><input name="taxa" inputmode="decimal" autocomplete="off" value="${paraCampo(c.taxaEntrega)}"></label>
    <label class="campo"><span>Horário mostrado no site</span><input name="horario" autocomplete="off" value="${esc(c.horario)}"></label>
    <p class="erro" id="erro-loja" aria-live="polite"></p>
    <div><button class="btn fogo" type="submit">Salvar</button></div>
  </form>
  <section class="bloco" style="margin-top:4rem;max-width:34rem">
    <h2>Dados de demonstração</h2>
    <p class="secundario">Apaga pedidos, contas, avaliações, cupons e preços alterados neste navegador.</p>
    <button class="btn" type="button" id="zerar">Apagar dados de demonstração</button>
  </section>`;
}

function desenhar() {
  if (!liberado()) return portao();
  $("#sair-admin").hidden = false;
  const foco = document.activeElement?.id;
  const paineis = { pedidos: painelPedidos, produtos: painelProdutos, cupons: painelCupons, loja: painelLoja };
  raiz.innerHTML = abas() + `<div id="painel" role="tabpanel" aria-labelledby="tab-${aba}">${paineis[aba]()}</div>`;
  if (foco && document.getElementById(foco)) document.getElementById(foco).focus();
  ligar();
}

function ligar() {
  $$("[data-aba]").forEach(b => b.onclick = () => { aba = b.dataset.aba; desenhar(); $(`#tab-${aba}`).focus(); });
  $(".abas")?.addEventListener("keydown", e => {
    const ordem = ["pedidos", "produtos", "cupons", "loja"], d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!d) return;
    aba = ordem[(ordem.indexOf(aba) + d + 4) % 4]; desenhar(); $(`#tab-${aba}`).focus();
  });
  $$("[name=filtro]").forEach(r => r.onchange = () => { filtro = r.value; desenhar(); });
  $$("[data-status]").forEach(s => s.onchange = () => {
    const n = +s.dataset.status; L.mudarStatus(n, +s.value);
    avisar(`Pedido #${n}: ${s.selectedOptions[0].text.toLowerCase()}.`);
  });
  $$("[data-preco]").forEach(i => i.onchange = () => {
    const c = centavos(i.value), p = L.produto(i.dataset.preco);
    if (c === null || c === 0) { avisar("Preço inválido. Use números, como 32,90."); i.value = paraCampo(p.preco); return; }
    L.salvarProduto(p.id, { preco: c }); avisar(`${p.nome}: ${real(c)}.`);
  });
  $$("[data-disp]").forEach(i => i.onchange = () => {
    const p = L.produto(i.dataset.disp);
    L.salvarProduto(p.id, { indisponivel: !i.checked });
    avisar(i.checked ? `${p.nome} voltou ao cardápio.` : `${p.nome} marcado como “acabou”.`);
  });
  $$("[data-cupom]").forEach(i => i.onchange = () => {
    const l = L.cupons(); l[+i.dataset.cupom].ativo = i.checked; L.salvarCupons(l);
  });
  const fc = $("#f-cupom");
  fc?.addEventListener("submit", e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(fc));
    const codigo = d.codigo.trim().toUpperCase().replace(/\s+/g, "");
    const valor = d.tipo === "pct" ? Math.round(Number(d.valor.replace(",", "."))) : centavos(d.valor);
    const erro = !codigo ? "Escreva um código." : L.cupons().some(c => c.codigo === codigo) ? "Já existe um cupom com esse código."
      : !valor || valor <= 0 || (d.tipo === "pct" && valor > 90) ? "Desconto inválido. Use de 1% a 90%, ou um valor em reais." : !d.desc.trim() ? "Escreva a descrição para o cliente." : "";
    $("#erro-cupom").textContent = erro;
    if (erro) return;
    L.salvarCupons([...L.cupons(), { codigo, tipo: d.tipo, valor, minimo: centavos(d.minimo || "0") || 0, ativo: true, desc: d.desc.trim() }]);
    avisar(`Cupom ${codigo} criado.`);
  });
  const fl = $("#f-loja");
  fl?.addEventListener("submit", e => {
    e.preventDefault();
    const taxa = centavos(fl.taxa.value);
    if (taxa === null) { $("#erro-loja").textContent = "Taxa inválida. Use números, como 7,90."; fl.taxa.focus(); return; }
    L.salvarConfig({ aberto: fl.aberto.checked, whatsapp: fl.whatsapp.value.trim(), taxaEntrega: taxa, horario: fl.horario.value.trim() || L.config().horario });
    avisar("Configurações salvas.");
  });
  $("#zerar")?.addEventListener("click", () => {
    if (!confirm("Apagar todos os dados de demonstração deste navegador? Não dá para desfazer.")) return;
    Object.keys(localStorage).filter(k => k.startsWith("brasa47:")).forEach(k => localStorage.removeItem(k));
    avisar("Dados apagados."); desenhar();
  });
}

$("#sair-admin").onclick = () => { try { sessionStorage.removeItem("brasa47:admin"); } catch {} desenhar(); };

// novos pedidos chegam de outra aba (o site aberto ao lado)
let total = L.pedidos().length;
L.ouvir(k => {
  if (k === "pedidos" && L.pedidos().length > total) avisar(`Novo pedido #${L.pedidos()[0].numero}.`);
  total = L.pedidos().length;
  // não redesenha enquanto alguém digita num campo
  if (document.activeElement?.matches("input[type=text], input[inputmode], textarea") ) return;
  desenhar();
});
desenhar();
