// Cena da abertura: livro aberto, lápis que escreve na folha, letras e números flutuando.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { COR, livro, lapis, letra, amostrarTraco, pontoNoTraco, ESCRITA } from './models.js';

const expo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * Math.max(0, t)));
const suave = (t) => t * t * (3 - 2 * t);
const lerp = THREE.MathUtils.lerp;

// ---------- Folhas (texturas desenhadas em canvas) ----------
const CW = 600, CH = 828;

function papel(ctx) {
  ctx.fillStyle = COR.papel;
  ctx.fillRect(0, 0, CW, CH);
  const g = ctx.createLinearGradient(0, 0, CW, 0);
  g.addColorStop(0, 'rgba(120,96,170,0.10)');
  g.addColorStop(0.12, 'rgba(120,96,170,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CW, CH);
}

function folhaEsquerda() {
  const c = document.createElement('canvas');
  c.width = CW; c.height = CH;
  const x = c.getContext('2d');
  papel(x);
  // Na folha da esquerda o "vinco" fica à direita: espelha o sombreado.
  x.save(); x.translate(CW, 0); x.scale(-1, 1); papel(x); x.restore();
  x.fillStyle = COR.lilasForte;
  x.font = '600 230px Fraunces, Georgia, serif';
  x.fillText('Aa', 80, 300);
  x.fillStyle = COR.amarelo;
  x.beginPath(); x.arc(470, 150, 46, 0, Math.PI * 2); x.fill();
  x.fillStyle = 'rgba(42,35,56,0.16)';
  const linhas = [380, 360, 400, 330, 390, 250];
  linhas.forEach((w, i) => { x.beginPath(); x.roundRect(84, 400 + i * 58, w, 16, 8); x.fill(); });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.center.set(0.5, 0.5);
  t.rotation = Math.PI;
  t.anisotropy = 4;
  return t;
}

function folhaDireita() {
  const c = document.createElement('canvas');
  c.width = CW; c.height = CH;
  const x = c.getContext('2d');
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  const limpar = () => {
    papel(x);
    x.strokeStyle = 'rgba(132,103,214,0.42)';
    x.lineWidth = 3;
    for (let y = 64; y < CH - 20; y += 58) { x.beginPath(); x.moveTo(40, y); x.lineTo(CW - 30, y); x.stroke(); }
    x.strokeStyle = 'rgba(246,211,106,0.9)';
    x.lineWidth = 3;
    x.beginPath(); x.moveTo(96, 20); x.lineTo(96, CH - 20); x.stroke();
    t.needsUpdate = true;
  };
  limpar();
  return { textura: t, ctx: x, limpar };
}

// Onde cada palavra fica na folha (pixels da textura).
const TRACOS = [
  { d: ESCRITA.abc, ox: 92, oy: 70, s: 4.8 },
  { d: ESCRITA.um, ox: 104, oy: 384, s: 4.4 },
  { d: ESCRITA.dois, ox: 104, oy: 384, s: 4.4 },
  { d: ESCRITA.tres, ox: 104, oy: 384, s: 4.4 },
].map((t) => {
  const tr = amostrarTraco(t.d);
  tr.pts = tr.pts.map(([px, py]) => [t.ox + px * t.s, t.oy + py * t.s]);
  tr.comp = tr.comp.map((v) => v * t.s);
  tr.total *= t.s;
  return tr;
});

export function iniciarCena(caixa, { reduzido = false, pularIntro = false, captura = false } = {}) {
  const celular = matchMedia('(pointer: coarse)').matches || innerWidth < 760;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: captura });
  renderer.setPixelRatio(Math.min(devicePixelRatio, celular ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  caixa.appendChild(canvas);

  const cena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  cena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  cena.environmentIntensity = 0.55;
  pmrem.dispose();

  cena.add(new THREE.HemisphereLight('#fff6e6', '#c7b5f2', 1.1));
  const sol = new THREE.DirectionalLight('#fff0d8', 2.1);
  sol.position.set(-2.6, 7, 3.4);
  sol.castShadow = true;
  sol.shadow.mapSize.set(1024, 1024);
  Object.assign(sol.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 16 });
  sol.shadow.bias = -0.0006;
  sol.shadow.normalBias = 0.02;
  sol.shadow.radius = 4;
  cena.add(sol);
  const contra = new THREE.DirectionalLight('#d9cbff', 0.7);
  contra.position.set(4, 2, -3);
  cena.add(contra);

  // Chão invisível que só recebe a sombra, em lilás (nunca preta).
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ color: '#5b40a8', opacity: 0.12 }));
  chao.rotation.x = -Math.PI / 2;
  chao.position.y = -0.9;
  chao.receiveShadow = true;
  cena.add(chao);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  const alvo = new THREE.Vector3(0, 0.75, 0);

  // ---------- Palco ----------
  const palco = new THREE.Group();
  palco.rotation.set(0.02, -0.2, 0);
  cena.add(palco);

  const folhaDir = folhaDireita();
  const book = livro({ esquerda: folhaEsquerda(), direita: folhaDir.textura });
  palco.add(book.grupo);

  const pencil = lapis();
  pencil.scale.setScalar(0.82);
  palco.add(pencil);

  const curvas = celular ? 5 : 8;
  const letras = [
    ['A', COR.lilas, [-1.75, 1.5, -0.7], 0.95, [0.1, 0.5, -0.12]],
    ['b', COR.amarelo, [-0.75, 2.05, -1.25], 0.85, [0.05, 0.2, 0.1]],
    ['c', COR.lilasForte, [0.85, 1.75, -1.15], 0.85, [0, -0.25, -0.08]],
    ['1', COR.amarelo, [2.2, 1.25, -0.45], 0.8, [0.05, -0.45, 0.14]],
    ['2', COR.lilasForte, [-1.95, 0.1, 0.55], 0.8, [0.1, 0.55, 0.12]],
    ['3', COR.lilas, [2.25, -0.3, -0.75], 0.8, [0.05, -0.4, -0.1]],
  ].map(([ch, cor, p, s, r], i) => {
    const m = letra(ch, cor, { tamanho: s, curvas });
    const base = new THREE.Vector3(...p);
    m.position.copy(base);
    m.rotation.set(...r);
    palco.add(m);
    return { m, base, rot: new THREE.Euler(...r), fase: i * 1.37, atraso: 0.35 + i * 0.12 };
  });

  // ---------- Roteiro do lápis ----------
  const VEL = 520; // px de textura por segundo
  const roteiro = [];
  let t0 = 1.5;
  roteiro.push({ tipo: 'chega', ini: t0, dur: 0.8, para: TRACOS[0].pts[0] });
  t0 += 0.8;
  TRACOS.forEach((tr, i) => {
    if (i > 0) {
      roteiro.push({ tipo: 'ar', ini: t0, dur: i === 1 ? 0.55 : 0.3, de: TRACOS[i - 1].pts.at(-1), para: tr.pts[0] });
      t0 += roteiro.at(-1).dur;
    }
    const dur = tr.total / VEL;
    roteiro.push({ tipo: 'traco', ini: t0, dur, tr });
    t0 += dur;
  });
  roteiro.push({ tipo: 'descansa', ini: t0, dur: 1.3, de: TRACOS.at(-1).pts.at(-1) });
  const FIM_ESCRITA = t0 + 1.3;

  const eixoEscrita = new THREE.Vector3(0.5, 1, 0.62).normalize();
  const Y = new THREE.Vector3(0, 1, 0);
  const qEscrita = new THREE.Quaternion().setFromUnitVectors(Y, eixoEscrita);
  // Depois de escrever, o lápis fica deitado, flutuando sobre a folha.
  const qDescanso = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0.95, 0.1, 0.32).normalize());
  const DESCANSO = [235, 705];
  const posFora = new THREE.Vector3(3.6, 2.6, 1.2);
  const qGiro = new THREE.Quaternion();
  const qTmp = new THREE.Quaternion();
  const vTmp = new THREE.Vector3();
  const vTmp2 = new THREE.Vector3();

  function pontaNaFolha(px, py, sobe, alvoV) {
    book.pontoNaFolha(px, py, CW, CH, sobe, alvoV);
    return palco.worldToLocal(alvoV);
  }

  // Desenha o traço até a distância d, a partir do que já foi desenhado.
  const desenhado = TRACOS.map(() => 0);
  function tinta(i, ate) {
    const tr = TRACOS[i];
    const de = desenhado[i];
    if (ate <= de) return;
    const x = folhaDir.ctx;
    x.strokeStyle = COR.grafite;
    x.lineWidth = 13;
    x.lineCap = 'round';
    x.lineJoin = 'round';
    x.globalAlpha = 0.92;
    x.beginPath();
    const p0 = pontoNoTraco(tr, de);
    x.moveTo(p0[0], p0[1]);
    for (let k = 0; k < tr.pts.length; k++) {
      if (tr.comp[k] > de && tr.comp[k] < ate) x.lineTo(tr.pts[k][0], tr.pts[k][1]);
    }
    const p1 = pontoNoTraco(tr, ate);
    x.lineTo(p1[0], p1[1]);
    x.stroke();
    x.globalAlpha = 1;
    desenhado[i] = ate;
    folhaDir.textura.needsUpdate = true;
  }

  function poseEscrevendo(px, py, sobe, dx, dy, t) {
    pontaNaFolha(px, py, sobe, pencil.position);
    // Leve balanço do lápis acompanhando a direção do traço.
    const ang = Math.atan2(dy, dx);
    qGiro.setFromAxisAngle(Y, t * 0.6);
    qTmp.setFromEuler(new THREE.Euler(Math.sin(ang) * 0.06, 0, -Math.cos(ang) * 0.06));
    pencil.quaternion.copy(qEscrita).multiply(qTmp).multiply(qGiro);
  }

  let tempoEscrita = pularIntro || reduzido ? 1e6 : 0;
  let ultimo = [0, 0];

  function atualizarLapis(tl, t) {
    if (tl >= FIM_ESCRITA) {
      TRACOS.forEach((tr, i) => tinta(i, tr.total));
      pontaNaFolha(DESCANSO[0], DESCANSO[1], 0.12 + (reduzido ? 0 : Math.sin(t * 1.1) * 0.05), pencil.position);
      qGiro.setFromAxisAngle(new THREE.Vector3(0, 0, 1), reduzido ? 0 : Math.sin(t * 0.8) * 0.05);
      pencil.quaternion.copy(qDescanso).multiply(qGiro);
      pencil.visible = true;
      return;
    }
    const seg = roteiro.find((s) => tl < s.ini + s.dur) || roteiro.at(-1);
    pencil.visible = tl >= roteiro[0].ini;
    const f = Math.min(1, Math.max(0, (tl - seg.ini) / seg.dur));
    if (seg.tipo === 'chega') {
      const e = expo(f);
      pontaNaFolha(seg.para[0], seg.para[1], 0.35 * (1 - e) + 0.004, vTmp);
      pencil.position.lerpVectors(posFora, vTmp, e);
      pencil.quaternion.slerpQuaternions(qDescanso, qEscrita, e);
    } else if (seg.tipo === 'ar') {
      const e = suave(f);
      const px = lerp(seg.de[0], seg.para[0], e), py = lerp(seg.de[1], seg.para[1], e);
      poseEscrevendo(px, py, Math.sin(Math.PI * f) * 0.16, seg.para[0] - seg.de[0], seg.para[1] - seg.de[1], t);
    } else if (seg.tipo === 'traco') {
      const i = TRACOS.indexOf(seg.tr);
      for (let k = 0; k < i; k++) tinta(k, TRACOS[k].total);
      const d = seg.tr.total * f;
      tinta(i, d);
      const p = pontoNoTraco(seg.tr, d);
      poseEscrevendo(p[0], p[1], 0, p[0] - ultimo[0], p[1] - ultimo[1], t);
      ultimo = p;
    } else if (seg.tipo === 'descansa') {
      TRACOS.forEach((tr, i) => tinta(i, tr.total));
      const e = expo(f);
      pontaNaFolha(seg.de[0], seg.de[1], 0.004, vTmp);
      pontaNaFolha(DESCANSO[0], DESCANSO[1], 0.12, vTmp2);
      pencil.position.lerpVectors(vTmp, vTmp2, e);
      pencil.position.y += Math.sin(Math.PI * e) * 0.25;
      pencil.quaternion.slerpQuaternions(qEscrita, qDescanso, e);
    }
  }

  // ---------- Ponteiro e enquadramento ----------
  const ponteiro = { x: 0, y: 0, tx: 0, ty: 0 };
  const comMouse = matchMedia('(hover: hover) and (pointer: fine)').matches;
  function aoMover(e) {
    ponteiro.tx = (e.clientX / innerWidth) * 2 - 1;
    ponteiro.ty = (e.clientY / innerHeight) * 2 - 1;
  }
  if (comMouse && !reduzido) addEventListener('pointermove', aoMover, { passive: true });

  function ajustar() {
    const w = caixa.clientWidth, h = caixa.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Afasta a câmera quando o quadro fica estreito, para nenhuma letra sair de cena.
    const a = camera.aspect;
    const dist = a < 1.05 ? 10.4 * Math.pow(0.95 / a, 0.8) : Math.max(7.4, 10 * (1.136 / a));
    camera.position.copy(new THREE.Vector3(0, 0.5, 1).normalize().multiplyScalar(dist)).add(alvo);
    camera.lookAt(alvo);
    camera.updateProjectionMatrix();
    if (!rodando) desenhar(performance.now() / 1000);
  }
  const ro = new ResizeObserver(ajustar);

  // ---------- Loop ----------
  const inicio = performance.now() / 1000;
  let ultimoQuadro = inicio;
  let rodando = false, visivel = true, raf = 0;

  function desenhar(agora) {
    const t = agora - inicio;
    const dt = Math.min(0.05, agora - ultimoQuadro);
    ultimoQuadro = agora;
    const intro = pularIntro || reduzido ? 10 : t;

    book.abrir(expo((intro - 0.15) / 1.3));
    const sBook = lerp(0.86, 1, expo(intro / 1.4));
    book.grupo.scale.setScalar(sBook);

    ponteiro.x += (ponteiro.tx - ponteiro.x) * 0.06;
    ponteiro.y += (ponteiro.ty - ponteiro.y) * 0.06;
    const mov = reduzido ? 0 : 1;
    palco.rotation.y = -0.2 + ponteiro.x * 0.22;
    palco.rotation.x = 0.02 + ponteiro.y * 0.07;
    palco.position.y = Math.sin(t * 0.8) * 0.05 * mov;

    for (const l of letras) {
      const s = expo((intro - l.atraso) / 1.1);
      l.m.visible = s > 0.001;
      l.m.scale.setScalar(Math.max(0.001, s));
      l.m.position.set(
        l.base.x + ponteiro.x * 0.12 * mov,
        l.base.y + Math.sin(t * 0.9 + l.fase) * 0.09 * mov + (1 - s) * -0.4,
        l.base.z,
      );
      l.m.rotation.set(
        l.rot.x + Math.sin(t * 0.7 + l.fase) * 0.06 * mov,
        l.rot.y + Math.sin(t * 0.5 + l.fase) * 0.18 * mov + (1 - s) * 1.2,
        l.rot.z,
      );
    }

    if (!reduzido) tempoEscrita += dt;
    atualizarLapis(tempoEscrita, t);

    renderer.render(cena, camera);
  }

  function quadro() {
    raf = 0;
    if (!rodando) return;
    desenhar(performance.now() / 1000);
    raf = requestAnimationFrame(quadro);
  }
  function play() {
    if (reduzido || rodando || !visivel) return;
    rodando = true;
    ultimoQuadro = performance.now() / 1000;
    raf = requestAnimationFrame(quadro);
  }
  function pause() { rodando = false; cancelAnimationFrame(raf); raf = 0; }

  const io = new IntersectionObserver(([e]) => { visivel = e.isIntersecting; visivel ? play() : pause(); });

  // Tocar no livro faz o lápis escrever de novo.
  function reescrever() {
    if (reduzido || tempoEscrita < FIM_ESCRITA) return;
    folhaDir.limpar();
    desenhado.fill(0);
    tempoEscrita = roteiro[0].ini;
  }
  canvas.addEventListener('pointerdown', reescrever);

  ajustar();
  ro.observe(caixa);
  io.observe(caixa);
  desenhar(performance.now() / 1000);
  play();

  return {
    canvas, renderer,
    // Para gerar a imagem estática: congela na cena final.
    capturar() { pularIntro = true; tempoEscrita = 1e6; ponteiro.x = ponteiro.tx = ponteiro.y = ponteiro.ty = 0; desenhar(performance.now() / 1000); return canvas; },
    destruir() { pause(); ro.disconnect(); io.disconnect(); removeEventListener('pointermove', aoMover); renderer.dispose(); canvas.remove(); },
  };
}
