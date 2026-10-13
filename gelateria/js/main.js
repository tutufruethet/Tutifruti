// Composição: estado único, URL, storage, UI, cena e gancho de teste.

import { reduzir, deQuery, paraQuery, nomeDaMontagem, SABOR, podeAdicionar, lerFavoritos, salvarFavorito, removerFavorito } from './estado.js';
import { MAX_BOLAS } from './dados.js';
import { montarUI, renderizar, renderizarFavoritos, avisar, piscar } from './ui.js';
import { montarReserva } from './reserva.js';
import { criarFallback } from './fallback.js';

const storage = (() => { try { return window.localStorage; } catch { return null; } })();
const reduzido = matchMedia('(prefers-reduced-motion: reduce)').matches;
const movel = matchMedia('(pointer: coarse)').matches || innerWidth < 700;

let estado = deQuery(location.search);
let palco = null;
const container = document.getElementById('palco');

function descreverPalco() {
  const alvo = palco?.canvas ?? container;
  alvo.setAttribute('aria-label', `${nomeDaMontagem(estado)}.${palco?.canvas ? ' Use as setas para girar.' : ''}`);
}

function despachar(acao) {
  const novo = reduzir(estado, acao);
  if (novo === estado) return false;
  estado = novo;
  history.replaceState(null, '', `?${paraQuery(estado)}`);
  renderizar(estado);
  palco?.atualizar(estado);
  descreverPalco();
  return true;
}

const favoritos = () => lerFavoritos(storage);

montarUI({
  adicionar(sabor, botao) {
    if (!podeAdicionar(estado)) { avisar(`Já são ${MAX_BOLAS} bolas. Tire uma para trocar de sabor.`); return; }
    despachar({ tipo: 'adicionar', sabor });
    piscar(botao);
    avisar(`${SABOR[sabor].nome} na ${estado.bolas.length}ª bola.`);
  },
  remover(indice) {
    const sabor = estado.bolas[indice];
    if (despachar({ tipo: 'remover', indice })) {
      avisar(`${SABOR[sabor].nome} saiu.`);
      // O botão clicado sumiu: o foco vai para o próximo "Tirar" ou para a lista de sabores.
      (document.querySelector('#pilha .tirar') ?? document.querySelector('.sabor')).focus();
    }
  },
  base(valor) { if (despachar({ tipo: 'base', valor })) avisar(valor === 'copinho' ? 'Agora no copinho.' : 'Agora na casquinha.'); },
  cobertura(valor) {
    if (despachar({ tipo: 'cobertura', valor })) avisar({ nenhuma: 'Sem cobertura.', granulado: 'Com granulado.', calda: 'Com calda de chocolate.' }[valor]);
  },
  async copiar() {
    // Link canônico: sempre com a montagem, mesmo quando ela é a padrão.
    const link = `${location.origin}${location.pathname}?${paraQuery(estado)}`;
    try { await navigator.clipboard.writeText(link); avisar('Link copiado.'); }
    catch { avisar('Não deu para copiar. O link está na barra de endereço.'); }
  },
  salvar() {
    if (!estado.bolas.length) { avisar('Escolha pelo menos uma bola para salvar.'); return; }
    if (salvarFavorito(storage, estado)) { renderizarFavoritos(favoritos()); avisar('Salvo nos favoritos.'); }
    else avisar('Não deu para salvar: o navegador bloqueou o armazenamento.');
  },
  usarFavorito(id) {
    const f = favoritos().find((x) => x.id === id);
    if (!f) return;
    despachar({ tipo: 'carregar', estado: f.estado });
    avisar(`Montagem carregada: ${f.nome}.`);
    document.querySelector('.vitrine').scrollIntoView({ behavior: reduzido ? 'auto' : 'smooth' });
  },
  tirarFavorito(id) {
    removerFavorito(storage, id);
    renderizarFavoritos(favoritos());
    avisar('Tirado dos favoritos.');
    (document.querySelector('.fav-usar') ?? document.getElementById('t-fav')).focus();
  },
  reservar() { reserva.abrir(); },
});
const reserva = montarReserva({ obterEstado: () => estado });

renderizar(estado);
renderizarFavoritos(favoritos());
// O título revela já; não espera o three.js (é o maior elemento da primeira tela).
requestAnimationFrame(() => document.body.classList.add('pronto'));

// 3D só se houver WebGL; se não, a mesma montagem em SVG.
async function iniciarPalco() {
  try {
    const { criarCena, webglDisponivel } = await import('./cena.js');
    if (!webglDisponivel()) throw new Error('sem WebGL');
    palco = criarCena(container, { reduzido, movel });
    palco.canvas.tabIndex = 0;
    palco.canvas.setAttribute('role', 'img');
    palco.canvas.setAttribute('aria-roledescription', 'casquinha 3D');
  } catch (erro) {
    if (erro.message !== 'sem WebGL') console.warn('3D indisponível, usando a versão em SVG.', erro);
    container.classList.add('sem-3d');
    container.setAttribute('role', 'img');
    palco = criarFallback(container);
  }
  palco.atualizar(estado, { instantaneo: false });
  descreverPalco();
}
iniciarPalco();

// Gancho para os testes (fumaça, animação, repouso): só leitura.
window.__app = {
  get estado() { return estado; },
  get pronto() { return !!palco?.info().pronto; },
  info: () => palco?.info(),
};
