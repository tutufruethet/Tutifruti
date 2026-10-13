// Partes usadas em todas as páginas: topo, contador do pedido, aviso, horário.
import { contagem, sessao, ouvir, config } from "./loja.js";

export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const reduz = matchMedia("(prefers-reduced-motion: reduce)").matches;

// aviso curto no rodapé da tela, com "desfazer" opcional
let tempo;
export function avisar(texto, desfazer) {
  const el = $("#aviso"); if (!el) return;
  $("#aviso-texto").textContent = texto;
  const b = $("#aviso-acao");
  b.hidden = !desfazer;
  b.onclick = () => { desfazer?.(); el.classList.remove("ver"); };
  el.classList.add("ver");
  clearTimeout(tempo); tempo = setTimeout(() => el.classList.remove("ver"), desfazer ? 6000 : 3200);
}

export function iniciarTopo() {
  const topo = $("#topo"); if (!topo) return;
  // o topo fica sempre visível: o botão do pedido não pode sumir
  const solido = () => topo.classList.toggle("solido", scrollY > 40);
  addEventListener("scroll", solido, { passive: true }); solido();

  const atualizar = () => {
    const n = contagem(), c = $("#contador");
    if (c && c.textContent !== String(n)) {
      c.textContent = n; c.setAttribute("aria-label", `${n} ${n === 1 ? "item" : "itens"} no pedido`);
      if (!reduz) { c.classList.remove("pulsa"); void c.offsetWidth; c.classList.add("pulsa"); }
    }
    const u = sessao(), l = $("#link-conta");
    if (l) l.textContent = u ? u.nome.split(" ")[0] : "Entrar";
  };
  atualizar();
  ouvir(atualizar);
}

// "aberto agora" a partir do horário da configuração (terça a domingo, 18h–23h30)
export function lojaAberta(agora = new Date()) {
  const cfg = config();
  if (!cfg.aberto) return false;
  const dia = agora.getDay(), min = agora.getHours() * 60 + agora.getMinutes();
  return dia !== 1 && min >= 18 * 60 && min < 23 * 60 + 30;
}

// a marca do rodapé ocupa a largura toda: uma leitura e uma escrita
export function ajustarMarca() {
  const el = $("#wordmark"); if (!el) return;
  const p = el.parentElement, caixa = p.parentElement;
  const larg = caixa.clientWidth - parseFloat(getComputedStyle(caixa).paddingLeft) * 2;
  p.style.fontSize = "100px";
  p.style.fontSize = (100 * larg / el.getBoundingClientRect().width).toFixed(1) + "px";
}
let espera;
addEventListener("resize", () => { clearTimeout(espera); espera = setTimeout(ajustarMarca, 150); });
document.fonts?.ready.then(ajustarMarca);
