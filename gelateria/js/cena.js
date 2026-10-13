// Cena 3D: desenha o estado, não decide nada. Loop que dorme quando tudo assenta.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SABORES } from './dados.js';
import {
  criarGeometriaBola, criarPintas, criarCasquinha, criarCopinho, criarGranulado, criarCalda, criarSombra, semente,
} from './geometrias.js';

const PASSO_BOLA = 0.68;     // distância entre bolas empilhadas
const ACIMA_DO_TOPO = 0.24;  // centro da 1ª bola acima da borda
const QUEDA = 3.4;           // de onde a bola nova cai

const damp = (a, b, l, dt) => a + (b - a) * (1 - Math.exp(-l * dt));

function mola(s, alvo, k, c, dt) {
  let t = dt;
  while (t > 1e-6) {
    const h = Math.min(1 / 240, t);
    s.v += (k * (alvo - s.x) - c * s.v) * h;
    s.x += s.v * h;
    t -= h;
  }
}

export function webglDisponivel() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}

export function criarCena(container, { reduzido = false, movel = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, movel ? 1.5 : 2));
  renderer.toneMapping = THREE.NeutralToneMapping; // cor fiel de produto
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  container.appendChild(canvas);

  const cena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  cena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  cena.environmentIntensity = 0.75;
  pmrem.dispose();

  // Luz-chave quente de cima à esquerda + rebatida rosa do "chão" (sombra colorida, nunca cinza).
  const chave = new THREE.DirectionalLight('#fff0dc', 1.7);
  chave.position.set(-3, 5, 4);
  cena.add(chave, new THREE.HemisphereLight('#fff6ef', '#d77f8f', 0.6));
  const recorte = new THREE.DirectionalLight('#ffe3ea', 1.4);
  recorte.position.set(3, 2, -4);
  cena.add(recorte);

  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 60);
  const foco = new THREE.Vector3(0, 0.55, 0);

  const giro = new THREE.Group();
  cena.add(giro);

  // ---- Objetos criados uma vez ----
  const geoBola = criarGeometriaBola(movel ? 16 : 22);
  const materiais = {};
  const matPintas = {};
  for (const s of SABORES) {
    const cor = new THREE.Color(s.cor);
    materiais[s.id] = new THREE.MeshPhysicalMaterial({
      color: cor, roughness: 0.6, sheen: 0.35, sheenRoughness: 0.6, sheenColor: cor.clone().lerp(new THREE.Color('#ffffff'), 0.5),
    });
    if (s.pintas) matPintas[s.id] = new THREE.MeshStandardMaterial({ color: s.pintas, roughness: s.id === 'stracciatella' ? 0.35 : 0.7 });
  }
  const bases = { casquinha: criarCasquinha(), copinho: criarCopinho() };
  for (const b of Object.values(bases)) { b.escala = 0; b.malha.scale.setScalar(0); giro.add(b.malha); }
  const granulado = criarGranulado();
  const calda = criarCalda(geoBola);
  const cobertura = new THREE.Group();
  cobertura.add(granulado, calda);
  cobertura.scale.setScalar(0);
  giro.add(cobertura);
  const sombra = criarSombra();
  cena.add(sombra);

  // ---- Estado visual (rápido; nunca passa pelo reducer) ----
  let bolas = [];   // { sabor, grupo, y:{x,v}, escala, saindo }
  let baseAtual = null;
  let coberturaAtual = 'nenhuma';
  let topoCob = 0;   // escala atual da cobertura
  let angulo = 0.35, vel = 0, arrastando = false, girarAte = 0;
  const sombraS = { escala: 2.4, y: -1.8, opac: 1 };

  let criadas = 0;
  function novaBola(sabor) {
    criadas++;
    const grupo = new THREE.Group();
    grupo.add(new THREE.Mesh(geoBola, materiais[sabor]));
    if (matPintas[sabor]) grupo.add(criarPintas(SABORES.find((s) => s.id === sabor), matPintas[sabor]));
    const r = semente(sabor + bolas.length);
    grupo.rotation.set((r() - 0.5) * 0.25, r() * Math.PI * 2, (r() - 0.5) * 0.25);
    giro.add(grupo);
    return grupo;
  }

  // Tira da cena e libera o buffer de instâncias na GPU (geometria e material são compartilhados).
  function descartar(b) {
    giro.remove(b.grupo);
    for (const c of b.grupo.children) if (c.isInstancedMesh) c.dispose();
  }

  const alvoY = (i) => bases[baseAtual].topo + ACIMA_DO_TOPO + i * PASSO_BOLA;

  // Recebe o estado de decisão e ajusta os alvos; o loop anima até lá.
  function atualizar(estado, { instantaneo = false } = {}) {
    if (estado.base !== baseAtual) baseAtual = estado.base;
    // Casa as bolas antigas com as novas pela ordem dos sabores: tirar a 1ª faz as de cima
    // escorregarem para baixo (mola), em vez de sumirem e caírem de novo.
    const vivas = bolas.filter((b) => !b.saindo);
    const usadas = new Set();
    const novas = [];
    let j = 0, atraso = 0;
    estado.bolas.forEach((sabor, i) => {
      const k = vivas.findIndex((b, idx) => idx >= j && b.sabor === sabor);
      if (k >= 0) { usadas.add(vivas[k]); novas.push(vivas[k]); j = k + 1; return; }
      novas.push({ sabor, grupo: novaBola(sabor), y: { x: alvoY(i) + QUEDA + atraso, v: 0 }, escala: 1, saindo: false });
      atraso += 0.9; // a próxima cai um pouco depois (sequência na carga)
    });
    for (const b of vivas) if (!usadas.has(b)) b.saindo = true;
    bolas = [...novas, ...bolas.filter((b) => b.saindo)];
    coberturaAtual = estado.cobertura;
    granulado.visible = estado.cobertura === 'granulado';
    calda.visible = estado.cobertura === 'calda';
    if (!vista.altura) Object.assign(vista, alvoDaVista()); // primeira vez: já começa enquadrado
    if (instantaneo || reduzido) assentarTudo();
    if (!reduzido) girarAte = performance.now() + 3500;
    acordar();
  }

  function assentarTudo() {
    bolas = bolas.filter((b) => { if (b.saindo) descartar(b); return !b.saindo; });
    bolas.forEach((b, i) => { b.y.x = alvoY(i); b.y.v = 0; });
    for (const [id, b] of Object.entries(bases)) b.escala = id === baseAtual ? 1 : 0;
    topoCob = coberturaAtual !== 'nenhuma' && bolas.length ? 1 : 0;
    const base = bases[baseAtual];
    sombraS.y = base.chao; sombraS.escala = baseAtual === 'copinho' ? 1.9 : 1.5;
    Object.assign(vista, alvoDaVista());
  }

  // ---- Loop ----
  function passo(dt) {
    let anda = false;
    for (const [id, b] of Object.entries(bases)) {
      const alvo = id === baseAtual ? 1 : 0;
      b.escala = damp(b.escala, alvo, 9, dt);
      if (Math.abs(b.escala - alvo) > 1e-3) anda = true; else b.escala = alvo;
      b.malha.scale.setScalar(b.escala);
      b.malha.visible = b.escala > 0.001;
    }

    let i = 0;
    for (const b of bolas) {
      if (b.saindo) {
        b.escala = damp(b.escala, 0, 14, dt);
        b.grupo.scale.setScalar(b.escala);
        anda = true;
        continue;
      }
      const alvo = alvoY(i);
      mola(b.y, alvo, 140, 11, dt);
      const esticar = 1 + Math.min(Math.abs(b.y.v) * 0.035, 0.22);
      b.grupo.position.y = b.y.x;
      b.grupo.scale.set(1 / Math.sqrt(esticar), esticar, 1 / Math.sqrt(esticar));
      if (Math.abs(b.y.x - alvo) > 1e-3 || Math.abs(b.y.v) > 1e-3) anda = true;
      i++;
    }
    bolas = bolas.filter((b) => { if (b.saindo && b.escala < 0.01) { descartar(b); return false; } return true; });

    // Cobertura acompanha a bola de cima, e só aparece quando ela assentou.
    const vivas = bolas.filter((b) => !b.saindo);
    const topo = vivas.at(-1);
    const assentou = topo && Math.abs(topo.y.v) < 0.4 && Math.abs(topo.y.x - alvoY(vivas.length - 1)) < 0.05;
    const alvoCob = coberturaAtual !== 'nenhuma' && assentou ? 1 : 0;
    topoCob = damp(topoCob, alvoCob, alvoCob ? 10 : 22, dt);
    if (Math.abs(topoCob - alvoCob) > 1e-3) anda = true; else topoCob = alvoCob;
    if (topo) { cobertura.position.y = topo.grupo.position.y; cobertura.rotation.copy(topo.grupo.rotation); }
    cobertura.scale.setScalar(topoCob);
    cobertura.visible = topoCob > 0.001;

    // Sombra: mais larga e escura com o copinho (apoiado no chão).
    const base = bases[baseAtual];
    const alvoEsc = baseAtual === 'copinho' ? 1.9 : 1.5;
    sombraS.escala = damp(sombraS.escala, alvoEsc, 8, dt);
    sombraS.y = damp(sombraS.y, base.chao, 8, dt);
    if (Math.abs(sombraS.escala - alvoEsc) > 1e-3 || Math.abs(sombraS.y - base.chao) > 1e-3) anda = true;
    sombra.position.y = sombraS.y - 0.02;
    sombra.scale.set(sombraS.escala, sombraS.escala * 0.75, 1);

    // Giro: arrasto com inércia; depois de uma mudança, gira um pouco sozinho e para.
    if (!arrastando) {
      const girando = performance.now() < girarAte;
      if (girando) vel = damp(vel, 0.55, 3, dt);
      angulo += vel * dt;
      vel *= Math.exp(-(girando ? 0 : 2.5) * dt);
      if (Math.abs(vel) > 0.002 || girando) anda = true; else vel = 0;
    } else anda = true;
    giro.rotation.y = angulo;

    const alvoV = alvoDaVista();
    vista.altura = damp(vista.altura, alvoV.altura, reduzido ? 60 : 4, dt);
    vista.focoY = damp(vista.focoY, alvoV.focoY, reduzido ? 60 : 4, dt);
    if (Math.abs(vista.altura - alvoV.altura) > 1e-3 || Math.abs(vista.focoY - alvoV.focoY) > 1e-3) anda = true;
    enquadrar();

    return anda;
  }

  // ---- Enquadramento: a câmera acompanha a altura da pilha ----
  let largura = 1, altura = 1;
  const vista = { altura: 0, focoY: 0 };
  function alvoDaVista() {
    const base = bases[baseAtual];
    const n = bolas.filter((b) => !b.saindo).length;
    const topo = n ? alvoY(n - 1) + 0.66 : base.topo + 0.2;
    return { altura: Math.max((topo - base.chao) * 1.18 + 0.5, 4.4), focoY: (topo + base.chao) / 2 };
  }
  function enquadrar() {
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const dist = Math.max(vista.altura / (2 * tan), 2.6 / (2 * tan * camera.aspect));
    foco.set(0, vista.focoY, 0);
    camera.position.set(0, foco.y + dist * 0.2, dist);
    camera.lookAt(foco);
  }
  function redimensionar() {
    const r = container.getBoundingClientRect();
    largura = Math.max(1, r.width); altura = Math.max(1, r.height);
    renderer.setSize(largura, altura, false);
    camera.aspect = largura / altura;
    // No desktop o título ocupa a esquerda do palco: desloca a casquinha para a direita.
    const desloc = largura > 700 ? largura * 0.17 : 0;
    camera.setViewOffset(largura, altura, -desloc, 0, largura, altura);
    camera.updateProjectionMatrix();
    enquadrar();
    acordar();
  }

  // ---- Loop sob demanda ----
  let raf = 0, rodando = false, ultimo = 0, quadros = 0, visivel = true, pronto = false;
  function acordar() {
    if (raf || !visivel) return;
    if (!rodando) { rodando = true; ultimo = performance.now(); }
    raf = requestAnimationFrame(tick);
  }
  function tick(agora) {
    raf = 0;
    const dt = Math.min((agora - ultimo) / 1000, 1 / 30);
    ultimo = agora;
    const anda = passo(dt);
    renderer.render(cena, camera);
    quadros++;
    pronto = true;
    if (anda && visivel) acordar(); else rodando = false;
  }

  // ---- Arrastar e teclado ----
  let ultimoX = 0, ultimoT = 0;
  canvas.addEventListener('pointerdown', (e) => {
    arrastando = true; ultimoX = e.clientX; ultimoT = performance.now(); vel = 0; girarAte = 0;
    canvas.setPointerCapture(e.pointerId);
    acordar();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!arrastando) return;
    const agora = performance.now();
    const dx = e.clientX - ultimoX;
    const d = dx * 0.012;
    angulo += d;
    vel = reduzido ? 0 : d / Math.max((agora - ultimoT) / 1000, 1 / 120);
    ultimoX = e.clientX; ultimoT = agora;
    acordar();
  });
  const soltar = () => { arrastando = false; acordar(); };
  canvas.addEventListener('pointerup', soltar);
  canvas.addEventListener('pointercancel', soltar);
  canvas.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      girarAte = 0;
      if (reduzido) angulo += e.key === 'ArrowLeft' ? -0.3 : 0.3;
      else vel += e.key === 'ArrowLeft' ? -2.2 : 2.2;
      acordar();
    }
  });

  // ---- Pausar fora da tela e com a aba escondida ----
  const io = new IntersectionObserver(([e]) => { visivel = e.isIntersecting && !document.hidden; if (visivel) acordar(); });
  io.observe(container);
  const aoMudarAba = () => { visivel = !document.hidden; if (visivel) acordar(); };
  document.addEventListener('visibilitychange', aoMudarAba);
  const ro = new ResizeObserver(redimensionar);
  ro.observe(container);

  // Pré-compila todos os materiais: a primeira bola de cada sabor não engasga.
  const vitrine = new THREE.Group();
  for (const s of SABORES) {
    const m = new THREE.Mesh(geoBola, materiais[s.id]);
    vitrine.add(m);
    if (matPintas[s.id]) vitrine.add(criarPintas(s, matPintas[s.id]));
  }
  vitrine.position.y = -50;
  cena.add(vitrine);
  granulado.visible = calda.visible = true;
  redimensionar();
  renderer.compile(cena, camera);
  cena.remove(vitrine);

  return {
    canvas,
    atualizar,
    info: () => ({ pronto, quadros, rodando, criadas, chamadas: renderer.info.render.calls, triangulos: renderer.info.render.triangles }),
    destruir() { io.disconnect(); ro.disconnect(); document.removeEventListener('visibilitychange', aoMudarAba); cancelAnimationFrame(raf); renderer.dispose(); canvas.remove(); },
  };
}
