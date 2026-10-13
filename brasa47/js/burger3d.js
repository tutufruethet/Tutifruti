// Hambúrguer 3D procedural. As camadas vêm de dados.js (de baixo para cima).
// Sem modelos externos: cada ingrediente é geometria simples deformada.
import * as THREE from "three";

export function suportaWebGL() {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); }
  catch { return false; }
}

// ruído barato e determinístico
function semente(s) { return () => (s = (s * 16807) % 2147483647) / 2147483647; }
const ruido = (x, y) => Math.sin(x * 12.9898 + y * 78.233) * 0.5 + Math.sin(x * 3.1 - y * 5.7) * 0.5;

const COR = {
  brioche: 0x8c4c1e, artesanal: 0x7e4e2c, batata: 0xb98538, miolo: 0xf0d6a2,
  carne: 0x4a2a1a, crosta: 0x24130b,
  cheddar: 0xf2961c, pepperjack: 0xf0dfb0, mucarela: 0xf4ecd6,
  baconCarne: 0x8e2a1a, baconGordura: 0xe5b48f,
  alface: 0x6fae3a, tomate: 0xd2321e, jalapeno: 0x3f7d2a,
  crispy: 0xb9772f, caramelizada: 0x7a3f15, gema: 0xf5a316, clara: 0xf6f1e6
};
const MOLHO = {
  "molho-especial": 0xe7955a, "maionese": 0xf2e6c4, "maionese-picante": 0xe5612f,
  "barbecue": 0x5a1f0e, "molho-secreto": 0xc8552a
};

const mat = (cor, o = {}) => new THREE.MeshStandardMaterial({ color: cor, roughness: 0.6, metalness: 0, ...o });

// ---------- ingredientes ----------
function pao(tipo, topo) {
  const g = new THREE.Group();
  const cor = COR[tipo];
  const brilho = tipo === "brioche" ? 0.42 : tipo === "batata" ? 0.5 : 0.85;
  const pts = [];
  if (topo) {
    // aba de baixo + domo
    pts.push(new THREE.Vector2(0.97, 0));
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI / 2;
      const r = 1.0 * Math.pow(Math.cos(a), 0.55);
      const y = 0.1 + 0.68 * Math.pow(Math.sin(a), 0.9);
      pts.push(new THREE.Vector2(Math.max(r, 0.001), y));
    }
  } else {
    for (let i = 0; i <= 10; i++) {
      const a = (i / 10) * Math.PI / 2;
      pts.push(new THREE.Vector2(0.86 + 0.13 * Math.sin(a), 0.14 - 0.14 * Math.cos(a)));
    }
    pts.unshift(new THREE.Vector2(0.001, 0));
    pts.push(new THREE.Vector2(0.99, 0.24), new THREE.Vector2(0.96, 0.3));
  }
  const geo = new THREE.LatheGeometry(pts, 96);
  // farinha no artesanal / variação de tostado
  const cores = []; const c = new THREE.Color(cor); const tmp = new THREE.Color();
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i), x = p.getX(i), z = p.getZ(i);
    tmp.copy(c);
    const tost = topo ? THREE.MathUtils.smoothstep(y, 0.2, 0.75) : 0.3;
    tmp.offsetHSL(0, -0.05 * tost, -0.07 * tost + 0.012 * ruido(x * 3, z * 3));
    if (tipo === "artesanal" && topo) tmp.lerp(new THREE.Color(0xe9dcc6), THREE.MathUtils.smoothstep(y, 0.35, 0.78) * (0.25 + 0.12 * ruido(x * 4, z * 4)));
    cores.push(tmp.r, tmp.g, tmp.b);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(cores, 3));
  g.add(new THREE.Mesh(geo, mat(0xffffff, { vertexColors: true, roughness: brilho })));
  // face cortada (miolo)
  const miolo = new THREE.Mesh(new THREE.CircleGeometry(topo ? 0.97 : 0.96, 64), mat(COR.miolo, { roughness: 0.95 }));
  miolo.rotation.x = topo ? Math.PI / 2 : -Math.PI / 2;
  miolo.position.y = topo ? 0.002 : 0.3;
  g.add(miolo);
  // gergelim no brioche
  if (topo && tipo === "brioche") {
    const n = 70, rnd = semente(47);
    const sem = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 8, 6), mat(0xf6e8c8, { roughness: 0.5 }), n);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * 0.86;
      const ang = Math.acos(Math.pow(rr, 1 / 0.55));          // ponto do domo com esse raio
      const yy = 0.1 + 0.68 * Math.pow(Math.sin(ang), 0.9);
      e.set((rnd() - 0.5) * 0.5, rnd() * Math.PI, (rnd() - 0.5) * 0.5 - rr * 0.6); q.setFromEuler(e);
      m.compose(new THREE.Vector3(Math.cos(a) * rr, yy - 0.004, Math.sin(a) * rr), q, new THREE.Vector3(1, 0.45, 0.6));
      sem.setMatrixAt(i, m);
    }
    g.add(sem);
  }
  return { obj: g, altura: topo ? 0.78 : 0.3 };
}

function blend(gramas, s) {
  const h = 0.12 + gramas / 900;
  const geo = new THREE.CylinderGeometry(1.06, 1.08, h, 72, 4);
  const p = geo.attributes.position, rnd = semente(s);
  const fase = rnd() * 10;
  const cores = []; const tmp = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(z, x), r = Math.hypot(x, z);
    const borda = r > 0.9;
    const k = 1 + 0.045 * Math.sin(a * 7 + fase) + 0.03 * Math.sin(a * 17 + fase * 2) + 0.02 * ruido(a * 5, y * 9);
    p.setX(i, x * k); p.setZ(i, z * k);
    if (!borda && y > 0) p.setY(i, y - 0.012 * Math.abs(ruido(x * 6, z * 6)));
    tmp.set(COR.carne).lerp(new THREE.Color(COR.crosta), THREE.MathUtils.clamp(0.4 + 0.5 * ruido(x * 8 + fase, z * 8), 0, 1));
    if (Math.abs(y) < h / 2 - 0.01 && borda) tmp.lerp(new THREE.Color(0x6b3a22), 0.35);
    cores.push(tmp.r, tmp.g, tmp.b);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(cores, 3));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat(0xffffff, { vertexColors: true, roughness: 0.92 }));
  m.position.y = h / 2;
  return { obj: m, altura: h };
}

function queijo(cor, s) {
  const geo = new THREE.PlaneGeometry(2.0, 2.0, 36, 36);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position, rnd = semente(s);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const d = Math.hypot(x, z);
    const cai = Math.max(0, d - 0.95);
    // a ponta derretida cai e encosta na lateral do blend, sem passar da altura dele
    p.setY(i, -Math.min(0.24, cai * 0.8 + cai * cai * 2) + 0.004 * ruido(x * 4, z * 4));
    if (cai > 0) { const nd = Math.min(d, 1.1 + (d - 1.1) * 0.15); p.setX(i, x * nd / d); p.setZ(i, z * nd / d); }
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat(cor, { roughness: 0.38, side: THREE.DoubleSide }));
  m.rotation.y = rnd() * Math.PI;
  m.position.y = 0.03;
  return { obj: m, altura: 0.04 };
}

function bacon(s) {
  const g = new THREE.Group(), rnd = semente(s);
  for (let k = 0; k < 2; k++) {
    const geo = new THREE.PlaneGeometry(2.1, 0.34, 48, 12);
    geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position; const cores = []; const tmp = new THREE.Color();
    const fase = rnd() * 6;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      p.setY(i, Math.sin(x * 5.5 + fase) * 0.045 + Math.sin(x * 13) * 0.01);
      // faixas de gordura correndo ao longo da tira
      const faixa = 0.5 + 0.5 * Math.sin((z / 0.34) * Math.PI * 3 + Math.sin(x * 2) * 0.6);
      tmp.set(COR.baconCarne).lerp(new THREE.Color(COR.baconGordura), THREE.MathUtils.smoothstep(faixa, 0.55, 0.85) * 0.75);
      tmp.offsetHSL(0, 0, -0.08 * Math.max(0, ruido(x * 7, z * 7)));
      cores.push(tmp.r, tmp.g, tmp.b);
    }
    geo.setAttribute("color", new THREE.Float32BufferAttribute(cores, 3));
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat(0xffffff, { vertexColors: true, roughness: 0.55, side: THREE.DoubleSide }));
    m.rotation.y = k * 1.4 + rnd() * 0.5; m.position.set((k - 0.5) * 0.25, 0.045 + k * 0.03, (rnd() - 0.5) * 0.3);
    g.add(m);
  }
  return { obj: g, altura: 0.09 };
}

function alface() {
  const seg = 96, anel = 6;
  // anel com borda franzida
  const g2 = new THREE.RingGeometry(0.01, 1.2, seg, anel);
  g2.rotateX(-Math.PI / 2);
  const p = g2.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z), a = Math.atan2(z, x);
    const f = THREE.MathUtils.smoothstep(r, 0.8, 1.2);
    p.setY(i, f * (Math.sin(a * 16) * 0.07 + Math.sin(a * 37) * 0.025) - f * 0.06);
    const k = 1 + f * 0.06 * Math.sin(a * 9);
    p.setX(i, x * k); p.setZ(i, z * k);
  }
  g2.computeVertexNormals();
  const m = new THREE.Mesh(g2, mat(COR.alface, { roughness: 0.5, side: THREE.DoubleSide }));
  m.position.y = 0.05;
  return { obj: m, altura: 0.08 };
}

function tomate() {
  const g = new THREE.Group();
  for (let k = 0; k < 3; k++) {
    const a = k / 3 * Math.PI * 2 + 0.3;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.07, 40), mat(COR.tomate, { roughness: 0.3 }));
    m.position.set(Math.cos(a) * 0.45, 0.035 + k * 0.004, Math.sin(a) * 0.45);
    const miolo = new THREE.Mesh(new THREE.CircleGeometry(0.38, 30), mat(0xe8573a, { roughness: 0.4 }));
    miolo.rotation.x = -Math.PI / 2; miolo.position.y = 0.036;
    m.add(miolo); g.add(m);
  }
  return { obj: g, altura: 0.08 };
}

function espalhar(geo, material, n, raio, altura, s, escala = 1) {
  const im = new THREE.InstancedMesh(geo, material, n), rnd = semente(s);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * raio;
    e.set(rnd() * 3, rnd() * 3, rnd() * 3); q.setFromEuler(e);
    const k = escala * (0.7 + rnd() * 0.6);
    m.compose(new THREE.Vector3(Math.cos(a) * r, rnd() * altura, Math.sin(a) * r), q, new THREE.Vector3(k, k, k));
    im.setMatrixAt(i, m);
  }
  return im;
}

function jalapeno(s) {
  const g = new THREE.Group();
  const im = espalhar(new THREE.TorusGeometry(0.14, 0.04, 8, 20), mat(COR.jalapeno, { roughness: 0.35 }), 9, 0.8, 0.02, s);
  // anéis deitados
  const m = new THREE.Matrix4(), rnd = semente(s + 3), pos = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  for (let i = 0; i < im.count; i++) {
    im.getMatrixAt(i, m); m.decompose(pos, q, sc);
    q.setFromEuler(new THREE.Euler(Math.PI / 2 + (rnd() - 0.5) * 0.4, 0, (rnd() - 0.5) * 0.4));
    m.compose(pos.setY(0.04), q, sc); im.setMatrixAt(i, m);
  }
  g.add(im);
  return { obj: g, altura: 0.07 };
}

function crispy(s) {
  const im = espalhar(new THREE.IcosahedronGeometry(0.07, 0), mat(COR.crispy, { roughness: 0.8, flatShading: true }), 90, 0.95, 0.08, s);
  im.position.y = 0.03;
  return { obj: im, altura: 0.1 };
}

function caramelizada(s) {
  const im = espalhar(new THREE.TorusGeometry(0.2, 0.025, 6, 18, Math.PI * 1.3), mat(COR.caramelizada, { roughness: 0.3 }), 22, 0.75, 0.04, s);
  im.position.y = 0.03;
  return { obj: im, altura: 0.06 };
}

function molho(cor, s) {
  const g = new THREE.Group(), rnd = semente(s);
  const disco = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.03, 64), mat(cor, { roughness: 0.18 }));
  disco.position.y = 0.015; g.add(disco);
  for (let i = 0; i < 6; i++) {          // pingos na borda
    const a = rnd() * Math.PI * 2;
    const gota = new THREE.Mesh(new THREE.SphereGeometry(0.04 + rnd() * 0.03, 12, 10), disco.material);
    gota.scale.set(1, 1.5 + rnd() * 0.6, 0.8);
    gota.position.set(Math.cos(a) * 0.99, -0.01 - rnd() * 0.03, Math.sin(a) * 0.99);
    g.add(gota);
  }
  return { obj: g, altura: 0.03 };
}

function ovo() {
  const g = new THREE.Group();
  const geo = new THREE.CylinderGeometry(1.0, 1.0, 0.05, 64, 1);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x);
    const k = 1 + 0.08 * Math.sin(a * 3) + 0.05 * Math.sin(a * 7);
    p.setX(i, x * k); p.setZ(i, z * k);
  }
  geo.computeVertexNormals();
  const clara = new THREE.Mesh(geo, mat(COR.clara, { roughness: 0.4 })); clara.position.y = 0.025;
  const gema = new THREE.Mesh(new THREE.SphereGeometry(0.33, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat(COR.gema, { roughness: 0.15 }));
  gema.scale.y = 0.55; gema.position.set(0.15, 0.05, -0.1);
  g.add(clara, gema);
  return { obj: g, altura: 0.08 };
}

let contador = 1;
function camada(nome) {
  const s = 1 + (contador++ * 97) % 9973;
  const [tipo, parte] = nome.split("-");
  if (["brioche", "artesanal", "batata"].includes(tipo)) return pao(tipo, parte === "topo");
  if (tipo === "blend") return blend(+parte, s);
  if (nome === "cheddar") return queijo(COR.cheddar, s);
  if (nome === "pepperjack") return queijo(COR.pepperjack, s);
  if (nome === "mucarela") return queijo(COR.mucarela, s);
  if (nome === "bacon") return bacon(s);
  if (nome === "alface") return alface();
  if (nome === "tomate") return tomate();
  if (nome === "jalapeno") return jalapeno(s);
  if (nome === "cebola-crispy") return crispy(s);
  if (nome === "cebola-caramelizada") return caramelizada(s);
  if (nome === "ovo") return ovo();
  if (MOLHO[nome]) return molho(MOLHO[nome], s);
  return { obj: new THREE.Group(), altura: 0 };
}

function luzes(cena) {
  // sombra nunca preta: o chão devolve vermelho queimado
  cena.add(new THREE.HemisphereLight(0xfff0e0, 0x4a1810, 0.9));
  const chave = new THREE.DirectionalLight(0xfff1e0, 2.4); chave.position.set(-3, 5, 4); cena.add(chave);
  const recorte = new THREE.DirectionalLight(0xff7a2a, 2.2); recorte.position.set(3, 1.5, -4); cena.add(recorte);
  const brasa = new THREE.PointLight(0xff5a14, 3, 7, 1.8); brasa.position.set(0, -1.4, 1.4); cena.add(brasa);
  return brasa;
}

function montarPilha(lista) {
  contador = 1;
  const g = new THREE.Group(); let y = 0; const itens = [];
  for (const nome of lista) {
    const { obj, altura } = camada(nome);
    obj.userData.y = y; obj.position.y = y + (obj.position.y || 0);
    obj.userData.base = obj.position.y;
    g.add(obj); itens.push(obj); y += altura * 0.97;
  }
  return { grupo: g, altura: y, itens };
}

function descartar(obj) {
  obj.traverse(o => { o.geometry?.dispose(); [].concat(o.material || []).forEach(m => m.dispose()); });
}

// ---------- brasas subindo ----------
function brasas(n) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3), dados = new Float32Array(n * 4);
  const rnd = semente(4747);
  for (let i = 0; i < n; i++) {
    dados[i * 4] = rnd() * Math.PI * 2;   // ângulo
    dados[i * 4 + 1] = 0.6 + rnd() * 2.4; // raio
    dados[i * 4 + 2] = rnd();             // fase
    dados[i * 4 + 3] = 0.4 + rnd() * 0.8; // velocidade
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("dados", new THREE.BufferAttribute(dados, 4));
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { t: { value: 0 }, dpr: { value: 1 } },
    vertexShader: `
      attribute vec4 dados; uniform float t; uniform float dpr; varying float vida;
      void main(){
        float v = fract(dados.z + t * 0.07 * dados.w);
        vida = v;
        float a = dados.x + sin(t * 0.6 + dados.z * 20.0) * 0.4;
        vec3 p = vec3(cos(a) * dados.y, -2.2 + v * 6.0, sin(a) * dados.y * 0.6 - 0.6);
        p.x += sin(t * 1.3 + dados.z * 40.0) * 0.15 * v;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (2.0 + 5.0 * (1.0 - v)) * dpr * (6.0 / -mv.z);
      }`,
    fragmentShader: `
      varying float vida; uniform float t;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        vec3 c = mix(vec3(1.0, 0.75, 0.35), vec3(0.9, 0.18, 0.04), vida);
        float pisca = 0.7 + 0.3 * sin(t * 9.0 + vida * 50.0);
        gl_FragColor = vec4(c * pisca, a * (1.0 - vida) * smoothstep(0.0, 0.08, vida));
      }`
  });
  return new THREE.Points(geo, material);
}

// ---------- cena interativa ----------
const expo = t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

export class Cena {
  constructor(canvas, { comBrasas = true, arrastar = false } = {}) {
    this.canvas = canvas;
    this.reduz = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.toque = matchMedia("(hover: none)").matches;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    r.setPixelRatio(Math.min(devicePixelRatio, this.toque ? 1.5 : 2));
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
    r.outputColorSpace = THREE.SRGBColorSpace;
    this.cena = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    this.brasaLuz = luzes(this.cena);
    this.giro = new THREE.Group(); this.cena.add(this.giro);
    this.pilha = null; this.alvoAltura = 1; this.altura = 1;
    if (comBrasas) {
      this.brasas = brasas(this.toque ? 90 : 180);
      this.brasas.material.uniforms.dpr.value = r.getPixelRatio();
      this.cena.add(this.brasas);
    }
    this.mouse = { x: 0, y: 0, ax: 0, ay: 0 };
    this.rotY = -0.5; this.vel = 0;
    this.t0 = performance.now(); this.visivel = true;

    addEventListener("pointermove", e => {
      if (this.segurando) return;
      this.mouse.x = e.clientX / innerWidth * 2 - 1; this.mouse.y = e.clientY / innerHeight * 2 - 1;
    }, { passive: true });
    if (arrastar) {
      canvas.style.touchAction = "pan-y";
      canvas.addEventListener("pointerdown", e => { this.segurando = e.clientX; canvas.setPointerCapture(e.pointerId); });
      canvas.addEventListener("pointermove", e => {
        if (this.segurando == null) return;
        this.vel = (e.clientX - this.segurando) * 0.01; this.rotY += this.vel; this.segurando = e.clientX; this.pedir();
      });
      const solta = () => { this.segurando = null; };
      canvas.addEventListener("pointerup", solta); canvas.addEventListener("pointercancel", solta);
    }
    this.ro = new ResizeObserver(() => this.redimensionar()); this.ro.observe(canvas);
    this.io = new IntersectionObserver(([e]) => { this.visivel = e.isIntersecting; this.pedir(); });
    this.io.observe(canvas);
    document.addEventListener("visibilitychange", () => this.pedir());
    this.quadro = this.quadro.bind(this);
  }

  redimensionar() {
    const { clientWidth: w, clientHeight: h } = this.canvas;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.pedir();
  }

  montar(lista, animar = true) {
    const antiga = this.pilha;
    const nova = montarPilha(lista);
    nova.grupo.position.y = 0;
    this.giro.add(nova.grupo);
    this.pilha = nova; this.alvoAltura = nova.altura;
    const agora = performance.now();
    nova.itens.forEach((o, i) => {
      o.userData.inicio = animar && !this.reduz ? agora + i * 70 : 0;
      if (o.userData.inicio) o.position.y = o.userData.base + 4 + i * 0.25;
    });
    if (antiga) { this.giro.remove(antiga.grupo); descartar(antiga.grupo); }
    if (!animar || this.reduz) this.altura = this.alvoAltura;
    this.pedir();
  }

  pedir() {
    if (this.rodando || !this.visivel || document.hidden) return;
    this.rodando = true; requestAnimationFrame(this.quadro);
  }

  quadro(agora) {
    this.rodando = false;
    const t = (agora - this.t0) / 1000;
    let ocupado = false;
    if (this.pilha) for (const o of this.pilha.itens) {
      if (!o.userData.inicio) continue;
      const k = Math.min(1, Math.max(0, (agora - o.userData.inicio) / 900));
      const de = o.userData.base + 4 + 0.25 * this.pilha.itens.indexOf(o);
      o.position.y = de + (o.userData.base - de) * expo(k);
      if (k < 1) ocupado = true; else o.userData.inicio = 0;
    }
    this.altura += (this.alvoAltura - this.altura) * 0.08;
    if (Math.abs(this.alvoAltura - this.altura) > 0.001) ocupado = true;

    // enquadra a pilha inteira
    const h = this.altura, alvo = new THREE.Vector3(0, h * 0.45, 0);
    const dist = Math.max(8, (h + 1.4) / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2))) * 1.15 / Math.min(1, this.camera.aspect * 1.1));
    this.mouse.ax += (this.mouse.x - this.mouse.ax) * 0.06;
    this.mouse.ay += (this.mouse.y - this.mouse.ay) * 0.06;
    this.camera.position.set(this.mouse.ax * 0.8, h * 0.45 + 2.6 + this.mouse.ay * 0.6, dist);
    this.camera.lookAt(alvo);

    if (!this.reduz) {
      if (this.segurando == null) { this.vel *= 0.94; this.rotY += 0.0025 + this.vel; }
      this.brasaLuz.intensity = 3 + Math.sin(t * 7) * 0.4 + Math.sin(t * 13.3) * 0.3;
      if (this.brasas) this.brasas.material.uniforms.t.value = t;
      ocupado = true;
    }
    this.giro.rotation.y = this.rotY;
    this.giro.rotation.x = this.mouse.ay * 0.06;
    if (this.brasas) this.brasas.position.y = h * 0.3;
    this.renderer.render(this.cena, this.camera);
    if (ocupado) this.pedir();
  }
}

// ---------- fotos do cardápio (renderiza cada hambúrguer uma vez) ----------
export async function fotografar(lista, tamanho = 560) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = tamanho;
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.toneMapping = THREE.ACESFilmicToneMapping; r.outputColorSpace = THREE.SRGBColorSpace;
  r.setSize(tamanho, tamanho, false);
  const cena = new THREE.Scene(); luzes(cena);
  const cam = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  const fotos = {};
  for (const { id, camadas } of lista) {
    const p = montarPilha(camadas);
    p.grupo.rotation.y = -0.6;
    cena.add(p.grupo);
    const h = p.altura;
    cam.position.set(0, h * 0.5 + 1.8, (h + 2.2) * 1.62);
    cam.lookAt(0, h * 0.42, 0);
    r.render(cena, cam);
    fotos[id] = await new Promise(ok => canvas.toBlob(b => ok(URL.createObjectURL(b)), "image/webp", 0.9));
    cena.remove(p.grupo); descartar(p.grupo);
    await new Promise(requestAnimationFrame);
  }
  r.dispose(); r.forceContextLoss?.();
  return fotos;
}
