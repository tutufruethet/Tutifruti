import * as L from "./loja.js";
import { ADICIONAIS, PONTOS, NOMES_CAMADA, CARIMBOS_PARA_PREMIO } from "./dados.js";
import { $, $$, avisar, iniciarTopo, lojaAberta, reduz } from "./comum.js";

const { real, esc } = L;
const temGL = await import("./burger3d.js").then(m => (m.suportaWebGL() ? m : null)).catch(() => null);
let fotos = {};

iniciarTopo();

// ---------- herói ----------
const cfg = L.config();
$("#horario").textContent = cfg.horario;
$("#horario-rodape").textContent = cfg.horario;
function statusLoja() {
  const aberto = lojaAberta(), el = $("#status-loja");
  el.textContent = !L.config().aberto ? "Pedidos pausados" : aberto ? "Aberto agora" : "Fechado agora";
  el.classList.toggle("fechado", !aberto);
}
statusLoja();
$("#whats-rodape").href = L.linkWhatsApp("Olá, Brasa 47!");
$("#whats-rodape").target = "_blank"; $("#whats-rodape").rel = "noopener";

let cenaHeroi = null;
if (temGL) {
  cenaHeroi = new temGL.Cena($("#cena-heroi"));
  await document.fonts.ready;
  cenaHeroi.montar(L.burgers()[0].camadas, true);
} else {
  $("#cena-heroi").remove(); $(".arraste")?.remove();
}
requestAnimationFrame(() => document.documentElement.classList.add("pronto"));
if (matchMedia("(hover: none)").matches) $(".arraste")?.remove();

// ---------- cardápio ----------
function botaoAdd(p, rotulo = "Adicionar") {
  return p.indisponivel
    ? `<span class="esgotado">Acabou por hoje</span>`
    : `<button class="btn pequeno" type="button" data-add="${p.id}" aria-label="${rotulo}: ${esc(p.nome)}">${rotulo}</button>`;
}
function desenharCardapio() {
  $("#lista-burgers").innerHTML = L.burgers().map(b => `
    <li class="burger grid${b.indisponivel ? " indisponivel" : ""}" id="b-${b.id}">
      <div class="foto">${fotos[b.id] ? `<img src="${fotos[b.id]}" alt="${esc(b.nome)} em corte lateral" width="560" height="560" loading="lazy">` : ""}</div>
      <div class="info">
        <h3 class="display">${esc(b.nome)}</h3>
        <p class="nota">${esc(b.nota)}</p>
        <p class="desc">${esc(b.desc)}</p>
      </div>
      <div class="compra">
        <span class="preco num">${real(b.preco)}</span>
        <div class="botoes">
          ${b.indisponivel ? "" : `<button class="btn pequeno" type="button" data-montar="${b.id}">Personalizar</button>`}
          ${b.indisponivel ? botaoAdd(b) : `<button class="btn pequeno fogo" type="button" data-add="${b.id}" aria-label="Adicionar ${esc(b.nome)} ao pedido">Adicionar</button>`}
        </div>
      </div>
    </li>`).join("");
  const linha = p => `<li class="${p.indisponivel ? "indisponivel" : ""}">
      <span class="n">${esc(p.nome)}</span>
      <span class="preco num">${real(p.preco)}</span>
      ${p.indisponivel ? `<span class="esgotado">Acabou</span>` : `<button class="icone" type="button" data-add="${p.id}" aria-label="Adicionar ${esc(p.nome)}">+</button>`}
    </li>`;
  $("#lista-acompanhamentos").innerHTML = L.acompanhamentos().map(linha).join("");
  $("#lista-bebidas").innerHTML = L.bebidas().map(linha).join("");
}
desenharCardapio();

// fotos do cardápio: renderiza cada hambúrguer uma vez, quando o cardápio chega perto
if (temGL) {
  const io = new IntersectionObserver(async ([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    fotos = await temGL.fotografar(L.burgers().map(b => ({ id: b.id, camadas: b.camadas })), 560);
    desenharCardapio(); desenharCarrinho();
  }, { rootMargin: "600px" });
  io.observe($("#cardapio"));
}

document.addEventListener("click", e => {
  const add = e.target.closest("[data-add]");
  if (add) {
    const p = L.produto(add.dataset.add);
    L.adicionar({ id: p.id, ponto: p.camadas ? "Ao ponto" : undefined });
    avisar(`${p.nome} no pedido.`);
    return;
  }
  const m = e.target.closest("[data-montar]");
  if (m) abrirMontar(m.dataset.montar);
  if (e.target.closest("[data-fechar]")) e.target.closest("dialog").close();
});

// ---------- monte o seu ----------
const dlgMontar = $("#montar"), formM = $("#form-montar");
let cenaMontar = null, qtd = 1;

function abrirMontar(id) {
  const base = L.burgers().filter(b => !b.indisponivel);
  $("#m-base").innerHTML = `<legend>Escolha a base</legend>` + base.map(b =>
    `<label><input type="radio" name="base" value="${b.id}"${b.id === id ? " checked" : ""}><span>${esc(b.nome)} <small>${real(b.preco)}</small></span></label>`).join("");
  $("#m-ponto").innerHTML = `<legend>Ponto da carne</legend>` + PONTOS.map(p =>
    `<label><input type="radio" name="ponto" value="${p}"${p === "Ao ponto" ? " checked" : ""}><span>${p}</span></label>`).join("");
  $("#m-extras").innerHTML = `<legend>Adicionais</legend>` + ADICIONAIS.map(a =>
    `<label><input type="checkbox" name="extra" value="${a.id}"><span>${esc(a.nome)} <small>+ ${real(a.preco)}</small></span></label>`).join("");
  formM.obs.value = ""; qtd = 1;
  desenharSem(id);
  document.body.classList.add("travado");
  dlgMontar.showModal();
  if (temGL && !cenaMontar) cenaMontar = new temGL.Cena($("#cena-montar"), { comBrasas: true, arrastar: true });
  atualizarMontar(true);
}
function desenharSem(id) {
  const b = L.produto(id);
  $("#m-desc").textContent = b.desc;
  $("#m-sem").hidden = !b.tiraveis.length;
  $("#m-sem").innerHTML = `<legend>Tirar</legend>` + b.tiraveis.map(t =>
    `<label><input type="checkbox" name="sem" value="${t}"><span>Sem ${esc(NOMES_CAMADA[t] || t)}</span></label>`).join("");
}
function itemMontado() {
  const f = new FormData(formM);
  return {
    id: f.get("base"), ponto: f.get("ponto"), extras: f.getAll("extra"), sem: f.getAll("sem"),
    obs: (f.get("obs") || "").trim(), qtd
  };
}
let ultimaPilha = "";
function atualizarMontar(animar) {
  const item = itemMontado();
  $("#m-preco").textContent = real(L.precoItem(item) * qtd);
  $("#m-qtd").textContent = qtd;
  $("#m-adicionar").textContent = `Adicionar ${qtd > 1 ? qtd + " " : ""}ao pedido`;
  const pilha = L.camadasItem(item);
  if (cenaMontar && pilha.join() !== ultimaPilha) { cenaMontar.montar(pilha, animar !== false); ultimaPilha = pilha.join(); }
}
formM.addEventListener("change", e => {
  if (e.target.name === "base") desenharSem(e.target.value);
  atualizarMontar(true);
});
$("#m-menos").onclick = () => { qtd = Math.max(1, qtd - 1); atualizarMontar(); };
$("#m-mais").onclick = () => { qtd = Math.min(20, qtd + 1); atualizarMontar(); };
formM.addEventListener("submit", e => {
  e.preventDefault();
  const item = itemMontado();
  L.adicionar(item);
  dlgMontar.close();
  avisar(`${qtd > 1 ? qtd + "× " : ""}${L.produto(item.id).nome} no pedido.`);
});
dlgMontar.addEventListener("close", () => { document.body.classList.remove("travado"); ultimaPilha = ""; });

// ---------- carrinho e finalização ----------
const dlgCarrinho = $("#carrinho");
let etapa = "itens", cupomAplicado = "", ultimoPedido = null;
const dadosForm = {}; // guarda o que a pessoa digitou ao voltar uma etapa

$("#abrir-carrinho").onclick = () => { if (etapa === "feito") etapa = "itens"; desenharCarrinho(); document.body.classList.add("travado"); dlgCarrinho.showModal(); };
dlgCarrinho.addEventListener("close", () => { document.body.classList.remove("travado"); if (etapa === "feito") etapa = "itens"; });
dlgCarrinho.addEventListener("click", e => { if (e.target === dlgCarrinho) dlgCarrinho.close(); });
dlgMontar.addEventListener("click", e => { if (e.target === dlgMontar) dlgMontar.close(); });

function contas(tipo) {
  const sub = L.subtotal();
  const v = cupomAplicado ? L.validarCupom(cupomAplicado, sub) : {};
  const desconto = v.desconto || 0;
  const taxa = tipo === "entrega" ? L.config().taxaEntrega : 0;
  return { sub, desconto, taxa, total: Math.max(0, sub - desconto) + taxa, erroCupom: v.erro };
}
function blocoContas(tipo) {
  const c = contas(tipo);
  return `<div class="contas">
    <div><span>Subtotal</span><span>${real(c.sub)}</span></div>
    ${c.desconto ? `<div><span>Cupom ${esc(cupomAplicado)}</span><span>−${real(c.desconto)}</span></div>` : ""}
    ${tipo ? `<div><span>${tipo === "entrega" ? "Entrega" : "Retirada na loja"}</span><span>${tipo === "entrega" ? real(c.taxa) : "grátis"}</span></div>` : ""}
    <div class="total"><span>Total</span><span>${real(tipo ? c.total : c.sub - c.desconto)}</span></div>
  </div>`;
}

function desenharCarrinho() {
  const corpo = $("#carrinho-corpo"), rodape = $("#carrinho-rodape");
  const itens = L.carrinho();
  if (etapa === "feito") return desenharFeito();
  if (!itens.length) {
    etapa = "itens";
    corpo.innerHTML = `<div class="vazio"><p>Seu pedido está vazio. Escolha um hambúrguer para começar.</p><a class="btn fogo" href="#cardapio" data-fechar>Ver o cardápio</a></div>`;
    rodape.innerHTML = ""; return;
  }
  if (etapa === "itens") {
    corpo.innerHTML = `<ul class="itens">${itens.map(i => {
      const p = L.produto(i.id); const det = L.descricaoItem(i);
      return `<li>
        <div class="mini">${fotos[i.id] ? `<img src="${fotos[i.id]}" alt="" width="64" height="64">` : esc(p.nome.slice(0, 2))}</div>
        <div><strong>${esc(p.nome)}</strong>${det ? `<p class="det">${esc(det)}</p>` : `<p class="det"></p>`}
          <div class="qtd">
            <button class="icone" type="button" data-qtd="-1" data-chave="${esc(i.chave)}" aria-label="Diminuir ${esc(p.nome)}">−</button>
            <output>${i.qtd}</output>
            <button class="icone" type="button" data-qtd="1" data-chave="${esc(i.chave)}" aria-label="Aumentar ${esc(p.nome)}">+</button>
          </div></div>
        <div class="valor"><span>${real(L.precoItem(i) * i.qtd)}</span><button class="link" type="button" data-remover="${esc(i.chave)}">Remover</button></div>
      </li>`;
    }).join("")}</ul>`;
    rodape.innerHTML = `${blocoContas()}<button class="btn fogo" type="button" id="ir-dados">Continuar</button>`;
    $("#ir-dados").onclick = () => { etapa = "dados"; desenharCarrinho(); $("#carrinho-corpo").scrollTop = 0; $("#f-tipo-entrega")?.focus(); };
    return;
  }
  // etapa "dados"
  const u = L.sessao(), d = dadosForm;
  const tipo = d.tipo || "entrega", pag = d.pagamento || "Pix";
  const aberto = lojaAberta(), pausado = !L.config().aberto;
  corpo.innerHTML = `<form class="passos" id="form-pedido" novalidate>
    ${!aberto && !pausado ? `<p class="secundario" style="margin:0;font-size:var(--t-14)">Estamos fechados agora (${esc(L.config().horario.toLowerCase())}). O pedido entra na fila e sai da chapa quando a loja abrir.</p>` : ""}
    <fieldset class="escolha"><legend>Como você quer receber?</legend>
      <label><input type="radio" name="tipo" value="entrega" id="f-tipo-entrega"${tipo === "entrega" ? " checked" : ""}><span>Entrega <small>${real(L.config().taxaEntrega)}</small></span></label>
      <label><input type="radio" name="tipo" value="retirada"${tipo === "retirada" ? " checked" : ""}><span>Retirar na loja <small>grátis</small></span></label>
    </fieldset>
    <label class="campo"><span>Nome</span><input name="nome" autocomplete="name" required value="${esc(d.nome ?? u?.nome ?? "")}" placeholder="Seu nome…"></label>
    <label class="campo"><span>Telefone com DDD</span><input name="telefone" type="tel" inputmode="tel" autocomplete="tel" required value="${esc(d.telefone ?? u?.telefone ?? "")}" placeholder="(81) 9 0000-0000…"></label>
    ${tipo === "entrega" ? `<label class="campo"><span>Endereço de entrega</span><textarea name="endereco" autocomplete="street-address" required placeholder="Rua, número, bairro e um ponto de referência…">${esc(d.endereco ?? u?.endereco ?? "")}</textarea></label>` : `<p class="secundario" style="margin:0">Retire no balcão da loja, em Recife. Avisamos pelo WhatsApp quando estiver pronto.</p>`}
    <fieldset class="escolha"><legend>Pagamento ${tipo === "entrega" ? "na entrega" : "na retirada"}</legend>
      ${["Pix", "Cartão", "Dinheiro"].map(x => `<label><input type="radio" name="pagamento" value="${x}"${pag === x ? " checked" : ""}><span>${x}</span></label>`).join("")}
    </fieldset>
    ${pag === "Dinheiro" ? `<label class="campo"><span>Troco para quanto? (opcional)</span><input name="troco" inputmode="decimal" autocomplete="off" value="${esc(d.troco || "")}" placeholder="Ex.: R$ 100…"></label>` : ""}
    <div class="cupom">
      <label class="campo"><span>Cupom</span><input name="cupom" autocomplete="off" spellcheck="false" value="${esc(cupomAplicado)}" placeholder="Ex.: BRASA10…" style="text-transform:uppercase"></label>
      <button class="btn pequeno" type="button" id="aplicar-cupom" style="min-height:3.1rem">Aplicar</button>
    </div>
    <p class="${contas(tipo).erroCupom ? "erro" : "ok"}" id="msg-cupom" aria-live="polite">${contas(tipo).erroCupom ? esc(contas(tipo).erroCupom) : cupomAplicado ? "Cupom aplicado." : ""}</p>
    <label class="campo"><span>Observação (opcional)</span><textarea name="obs" maxlength="200" placeholder="Ex.: interfone quebrado, ligar ao chegar…">${esc(d.obs || "")}</textarea></label>
    ${!u ? `<p class="secundario" style="margin:0;font-size:var(--t-14)"><a href="conta.html">Entre ou crie uma conta</a> para ganhar carimbos do cartão fidelidade.</p>` : ""}
  </form>`;
  rodape.innerHTML = `${blocoContas(tipo)}
    ${pausado ? `<p class="erro">Pausamos os pedidos por alguns minutos. Tente de novo daqui a pouco.</p>` : ""}
    <p class="erro" id="erro-pedido" aria-live="polite"></p>
    <button class="btn fogo" type="submit" form="form-pedido"${pausado ? " disabled" : ""}>Enviar pedido pelo WhatsApp</button>
    <button class="link" type="button" id="voltar-itens" style="justify-self:start">Voltar para os itens</button>`;

  const f = $("#form-pedido");
  const guardar = () => Object.assign(dadosForm, Object.fromEntries(new FormData(f)));
  f.addEventListener("change", e => {
    if (["tipo", "pagamento"].includes(e.target.name)) {
      guardar(); const foco = e.target.name + e.target.value; desenharCarrinho();
      $(`#form-pedido [name="${foco.startsWith("tipo") ? "tipo" : "pagamento"}"][value="${e.target.value}"]`)?.focus();
    }
  });
  f.addEventListener("input", guardar);
  $("#voltar-itens").onclick = () => { guardar(); etapa = "itens"; desenharCarrinho(); };
  $("#aplicar-cupom").onclick = () => {
    guardar();
    const codigo = (f.cupom.value || "").trim().toUpperCase();
    const v = L.validarCupom(codigo, L.subtotal());
    cupomAplicado = v.erro ? "" : codigo;
    desenharCarrinho();
    const msg = $("#msg-cupom");
    msg.className = v.erro ? "erro" : "ok";
    msg.textContent = v.erro || (codigo ? `Cupom ${codigo} aplicado: −${real(v.desconto)}.` : "");
    if (v.erro) { const i = $("#form-pedido [name=cupom]"); i.value = codigo; i.focus(); }
  };
  f.addEventListener("submit", e => { e.preventDefault(); enviar(f); });
}

function enviar(f) {
  const campos = ["nome", "telefone", "endereco"].map(n => f[n]).filter(Boolean);
  campos.forEach(c => c.removeAttribute("aria-invalid"));
  const ruins = campos.filter(c => !c.value.trim() || (c.name === "telefone" && c.value.replace(/\D/g, "").length < 10));
  if (ruins.length) {
    ruins.forEach(c => c.setAttribute("aria-invalid", "true"));
    const nomes = { nome: "seu nome", telefone: "um telefone com DDD", endereco: "o endereço de entrega" };
    $("#erro-pedido").textContent = "Falta " + ruins.map(c => nomes[c.name]).join(", ") + ".";
    ruins[0].focus(); return;
  }
  const d = Object.fromEntries(new FormData(f));
  const pedido = L.fecharPedido({
    cliente: { nome: d.nome.trim(), telefone: d.telefone.trim() }, tipo: d.tipo,
    endereco: (d.endereco || "").trim(), pagamento: d.pagamento, troco: (d.troco || "").trim(),
    cupom: cupomAplicado, obs: (d.obs || "").trim()
  });
  ultimoPedido = pedido; cupomAplicado = ""; etapa = "feito";
  Object.keys(dadosForm).forEach(k => delete dadosForm[k]);
  window.open(L.linkWhatsApp(L.textoWhatsApp(pedido)), "_blank", "noopener");
  desenharCarrinho();
}

function desenharFeito() {
  const p = ultimoPedido;
  $("#carrinho-corpo").innerHTML = `<div class="confirmado">
    <p class="secundario" style="margin:0">Pedido</p>
    <p class="num-pedido num" style="margin:0">#${p.numero}</p>
    <p style="margin:0">Abrimos o WhatsApp com o pedido pronto. É só tocar em enviar para a cozinha confirmar.</p>
    <p class="secundario" style="margin:0">Total de ${real(p.total)}, ${p.tipo === "entrega" ? "com entrega" : "para retirar na loja"}, pagamento em ${p.pagamento.toLowerCase()}.</p>
  </div>`;
  $("#carrinho-rodape").innerHTML = `
    <a class="btn fogo" href="${L.linkWhatsApp(L.textoWhatsApp(p))}" target="_blank" rel="noopener">Abrir o WhatsApp de novo</a>
    <a class="btn" href="conta.html#pedidos">Acompanhar o pedido</a>`;
}

$("#carrinho-corpo").addEventListener("click", e => {
  const q = e.target.closest("[data-qtd]");
  if (q) { L.mudarQtd(q.dataset.chave, +q.dataset.qtd); return; }
  const r = e.target.closest("[data-remover]");
  if (r) {
    const nome = L.produto(L.carrinho().find(i => i.chave === r.dataset.remover).id).nome;
    const desfazer = L.remover(r.dataset.remover);
    avisar(`${nome} removido.`, desfazer);
  }
  if (e.target.closest("a[data-fechar]")) dlgCarrinho.close();
});

L.ouvir(k => {
  if (k === "carrinho" && etapa !== "dados" && etapa !== "feito") desenharCarrinho();
  if (k === "produtos") desenharCardapio();
  if (k === "config") statusLoja();
  if (k === "avaliacoes") desenharAvaliacoes();
  if (k === "usuarios" || k === "sessao") desenharCartao();
});
desenharCarrinho();

// ---------- fidelidade ----------
function desenharCartao() {
  const u = L.sessao();
  const n = u ? u.carimbos : 3;
  $("#carimbos").innerHTML = Array.from({ length: CARIMBOS_PARA_PREMIO }, (_, i) =>
    `<span class="carimbo${i < n ? " feito" : ""}" style="--r:${((i * 37) % 24) - 12}deg"></span>`).join("");
  $("#cartao-legenda").textContent = `${n} de ${CARIMBOS_PARA_PREMIO}`;
  $(".cartao").setAttribute("aria-label", u ? `Seu cartão: ${n} de ${CARIMBOS_PARA_PREMIO} carimbos` : "Exemplo de cartão com 3 de 10 carimbos");
  $("#cta-fidelidade").textContent = u ? "Ver meu cartão" : "Criar minha conta";
}
desenharCartao();

// ---------- avaliações ----------
const estrelas = n => "★".repeat(n) + "☆".repeat(5 - n);
function desenharAvaliacoes() {
  const l = L.avaliacoes();
  const media = l.reduce((s, a) => s + a.nota, 0) / l.length;
  $("#media").textContent = media.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  $("#media-estrelas").textContent = estrelas(Math.round(media));
  $("#total-aval").textContent = `${l.length} avaliações`;
  $("#lista-aval").innerHTML = l.slice(0, 6).map(a => `<li>
    <span class="estrelas" role="img" aria-label="Nota ${a.nota} de 5">${estrelas(a.nota)}</span>
    <blockquote>${esc(a.texto)}</blockquote>
    <span class="quem">${esc(a.nome)}, ${L.dataCurta(a.data + "T12:00")}</span>
  </li>`).join("");
}
desenharAvaliacoes();

const notas = $("#notas"); let nota = 0;
notas.innerHTML = [1, 2, 3, 4, 5].map(n =>
  `<input type="radio" name="nota" id="nota-${n}" value="${n}"><label for="nota-${n}" aria-label="${n} de 5">★</label>`).join("");
const acender = n => $$("label", notas).forEach((l, i) => l.classList.toggle("acesa", i < n));
notas.addEventListener("change", e => { nota = +e.target.value; acender(nota); });
notas.addEventListener("mouseover", e => { const l = e.target.closest("label"); if (l) acender(+l.htmlFor.split("-")[1]); });
notas.addEventListener("mouseleave", () => acender(nota));
const fa = $("#form-aval");
if (L.sessao()) fa.nome.value = L.sessao().nome;
fa.addEventListener("submit", e => {
  e.preventDefault();
  const erro = !nota ? "Escolha uma nota de 1 a 5." : !fa.nome.value.trim() ? "Escreva seu nome." : fa.texto.value.trim().length < 10 ? "Conte um pouco mais (pelo menos 10 letras)." : "";
  $("#erro-aval").textContent = erro;
  if (erro) { (!nota ? $("#nota-5") : !fa.nome.value.trim() ? fa.nome : fa.texto).focus(); return; }
  L.avaliar({ nome: fa.nome.value, nota, texto: fa.texto.value });
  fa.texto.value = ""; nota = 0; acender(0); $$("input", notas).forEach(i => (i.checked = false));
  avisar("Avaliação publicada. Obrigado!");
});

// abrir carrinho direto por link (#pedido)
if (location.hash === "#pedido") $("#abrir-carrinho").click();
