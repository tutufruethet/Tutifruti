import * as THREE from 'three';

/* The bottle is a cut-out photo on a plane: "Concept perfume bottle" by Charlotte B. on Dribbble
   (dribbble.com/shots/23960344). A shader tints the liquid per essence and etches the name onto the
   left face through a homography, so the letters follow the face's perspective. */

export const ESSENCES = {
  ambar:   { name: 'Âmbar',   accent: '#f0a24a', hue: -0.24, sat: 1.0, val: 0.95, notes: ['Bergamota', 'Âmbar', 'Cedro'] },
  fumo:    { name: 'Fumo',    accent: '#e0795a', hue: -0.14, sat: 0.45, val: 0.6, notes: ['Pimenta-rosa', 'Incenso', 'Couro'] },
  orvalho: { name: 'Orvalho', accent: '#a6dcc6', hue: -2.3, sat: 0.6, val: 1.05, notes: ['Pera', 'Íris', 'Almíscar'] },
};

const IMG = new URL('../img/frasco.webp', import.meta.url).href;
const MASK = new URL('../img/frasco-mask.png', import.meta.url).href;
const ASPECT = 1100 / 1142;
// Left face of the glass in image uv (origin top-left): top-left, top-right, bottom-right, bottom-left.
const FACE = [[0.0313, 0.3517], [0.3277, 0.3981], [0.4194, 0.9404], [0.1933, 0.8433]];
const FOOT = 0.989; // image height (from the top) where the front corner touches the ground

// Unit square -> quad (Heckbert). Returned inverted: image uv -> face uv.
function faceHomography(q) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  const sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3;
  const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2;
  const den = dx1 * dy2 - dx2 * dy1;
  const g = (sx * dy2 - dx2 * sy) / den, h = (dx1 * sy - sx * dy1) / den;
  const m = new THREE.Matrix3().set(
    x1 - x0 + g * x1, x3 - x0 + h * x3, x0,
    y1 - y0 + g * y1, y3 - y0 + h * y3, y0,
    g, h, 1,
  );
  return m.invert();
}

export function engravingCanvas() {
  const c = document.createElement('canvas');
  c.width = 720; c.height = 1280;
  return c;
}

// Frosted letters for the face: brand, essence, recipient and edition number.
export function drawEngraving(canvas, { essence = 'ambar', name = '', number = 1 } = {}) {
  const g = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
  const e = ESSENCES[essence];
  g.clearRect(0, 0, w, h);
  g.fillStyle = '#fff'; g.strokeStyle = '#fff';
  g.textAlign = 'center'; g.textBaseline = 'alphabetic';

  g.font = 'italic 300 150px "Cormorant Garamond", Georgia, serif';
  g.fillText('Vilubre', w / 2, 300);
  g.font = 'italic 300 96px "Cormorant Garamond", Georgia, serif';
  g.fillText('ton de', w / 2, 400);

  g.globalAlpha = .7; g.lineWidth = 3;
  g.beginPath(); g.moveTo(w / 2 - 60, 470); g.lineTo(w / 2 + 60, 470); g.stroke();
  g.globalAlpha = 1;

  const spaced = (txt, y, size, track) => {
    g.font = `500 ${size}px "Geist", system-ui, sans-serif`;
    if ('letterSpacing' in g) { g.letterSpacing = `${track}px`; g.fillText(txt, w / 2 + track / 2, y); g.letterSpacing = '0px'; }
    else g.fillText(txt.split('').join(' '), w / 2, y);
  };
  spaced(e.name.toUpperCase(), 570, 52, 18);
  g.globalAlpha = .75;
  spaced('EXTRAIT · 50 ML', 635, 28, 8);
  g.globalAlpha = 1;

  const who = name.trim();
  g.globalAlpha = who ? 1 : .4;
  g.font = 'italic 300 64px "Cormorant Garamond", Georgia, serif';
  g.fillText('para', w / 2, 850);
  let size = 140;
  const label = who || 'seu nome';
  g.font = `italic 300 ${size}px "Cormorant Garamond", Georgia, serif`;
  while (g.measureText(label).width > w * 0.86 && size > 50) { size -= 6; g.font = `italic 300 ${size}px "Cormorant Garamond", Georgia, serif`; }
  g.fillText(label, w / 2, 980);
  g.globalAlpha = .75;
  spaced(`Nº ${String(number).padStart(3, '0')} / 500`, 1100, 28, 8);
  g.globalAlpha = 1;
}

const vert = /* glsl */`
  varying vec2 vUv;
  void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`;
const frag = /* glsl */`
  uniform sampler2D tImg; uniform sampler2D tMask; uniform sampler2D tEtch;
  uniform mat3 uFace; uniform float uHue; uniform float uSat; uniform float uVal; uniform float uLight; uniform float uEtchOn;
  varying vec2 vUv;
  void main(){
    vec4 c = texture2D(tImg, vUv);
    if (c.a < 0.01) discard;
    float body = texture2D(tMask, vUv).r;
    // hue/saturation turn in YIQ, only on the liquid-bearing glass
    mat3 toYIQ = mat3(.299, .596, .211, .587, -.274, -.523, .114, -.322, .312);
    mat3 toRGB = mat3(1., 1., 1., .956, -.272, -1.106, .621, -.647, 1.703);
    vec3 yiq = toYIQ * c.rgb;
    float cs = cos(uHue), sn = sin(uHue);
    yiq.yz = mat2(cs, sn, -sn, cs) * yiq.yz * uSat;
    vec3 tinted = max(toRGB * yiq, 0.) * uVal;
    vec3 col = mix(c.rgb, tinted, body);
    // frosted engraving on the left face
    vec3 q = uFace * vec3(vUv.x, 1. - vUv.y, 1.);
    vec2 f = q.xy / q.z;
    float inside = step(0., f.x) * step(f.x, 1.) * step(0., f.y) * step(f.y, 1.);
    float etch = texture2D(tEtch, vec2(f.x, 1. - f.y)).a * inside * body * uEtchOn;
    col = mix(col, vec3(1., .975, .94) * max(dot(col, vec3(.3,.59,.11)) * 1.3, .8), etch * .92);
    gl_FragColor = vec4(col * uLight, c.a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

export function createBottle({ essence = 'ambar', height = 1.6, billboard = true, onReady } = {}) {
  const group = new THREE.Group();
  const loader = new THREE.TextureLoader();
  const tImg = loader.load(IMG, () => onReady?.());
  tImg.colorSpace = THREE.SRGBColorSpace;
  tImg.anisotropy = 8;
  const tMask = loader.load(MASK);

  const canvas = engravingCanvas();
  drawEngraving(canvas, { essence });
  const tEtch = new THREE.CanvasTexture(canvas);
  tEtch.anisotropy = 8;

  const e = ESSENCES[essence];
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: {
      tImg: { value: tImg }, tMask: { value: tMask }, tEtch: { value: tEtch },
      uFace: { value: faceHomography(FACE) },
      uHue: { value: e.hue }, uSat: { value: e.sat }, uVal: { value: e.val }, uLight: { value: 1 }, uEtchOn: { value: 1 },
    },
    vertexShader: vert, fragmentShader: frag,
  });

  const width = height * ASPECT;
  const geo = new THREE.PlaneGeometry(width, height);
  geo.translate(0, height / 2 - height * (1 - FOOT) - 0.02, 0); // the front corner sits on y = 0
  const plane = new THREE.Mesh(geo, mat);
  plane.renderOrder = 2;
  group.add(plane);

  const faceUv = FACE.reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4], [0, 0]);
  const api = {
    group, plane, material: mat, height,
    labelCenter: new THREE.Vector3((faceUv[0] - 0.5) * width, height * (1 - faceUv[1]) - height * (1 - FOOT), 0),
    state: { essence, name: '', number: 1 },
    // Keep the photo facing the eye (turning only around the vertical axis).
    face(camera) { if (billboard) group.rotation.y = Math.atan2(camera.position.x - group.position.x, camera.position.z - group.position.z); },
    setEssence(id) {
      const n = ESSENCES[id];
      api.state.essence = id;
      mat.uniforms.uHue.value = n.hue; mat.uniforms.uSat.value = n.sat; mat.uniforms.uVal.value = n.val;
      api.redraw();
    },
    setName(name) { api.state.name = name; api.redraw(); },
    redraw() { drawEngraving(canvas, api.state); tEtch.needsUpdate = true; },
  };
  return api;
}

// A dark studio with warm softboxes, baked into a PMREM so stone and metal have something to reflect.
export function studioEnvironment(renderer, { warmth = '#ffd9a8', intensity = 1 } = {}) {
  const env = new THREE.Scene();
  env.background = new THREE.Color('#050403');
  env.add(new THREE.Mesh(new THREE.BoxGeometry(20, 12, 20), new THREE.MeshBasicMaterial({ color: '#0b0907', side: THREE.BackSide })));
  const panel = (w, h, color, strength, pos) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(strength * intensity), side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 0, 0); env.add(m);
  };
  panel(7, 3.2, warmth, 7, [-5.5, 3.5, 3]);
  panel(1.0, 9, '#ffffff', 5, [6.5, 1, -2]);
  panel(1.0, 9, warmth, 3.5, [-6.5, 1, -4]);
  panel(10, 10, '#ffffff', 0.9, [0, 6, 0]);
  panel(4, 1.2, warmth, 2.5, [3, -1, 6]);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(env, 0.03);
  pmrem.dispose();
  return rt.texture;
}
