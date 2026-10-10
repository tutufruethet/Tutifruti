import * as THREE from 'three';
import { ACC } from './holodeck.js';

// The real world: a VR headset on paper. Its visor is a screen-space portal into the arena,
// so when the camera reaches it the visor already is the arena and the cut is seamless.

const PAPER = new THREE.Color('#ebe8e1');
const VISOR = { w: 1.7, h: 0.92, r: 0.34 };
const FRONT = 0.35; // z of the body's front face

function rounded(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

// a tiny softbox room for reflections, so the satin body reads as a product
function studioEnv(renderer) {
  const env = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(12, 8, 12), new THREE.MeshBasicMaterial({ color: '#5d5a63', side: THREE.BackSide }));
  env.add(room);
  const box = (w, h, pos, c) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 0, 0); env.add(m);
  };
  box(6, 2.5, [-3, 3.5, 3], new THREE.Color(6, 5.8, 5.4));
  box(3, 5, [5.5, 0.5, -1], new THREE.Color(2.4, 2.6, 4));
  box(8, 1.2, [0, -3.8, 2], new THREE.Color(1.4, 1.35, 1.3));
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(env, 0.04).texture;
  pm.dispose();
  return tex;
}

export class Headset {
  constructor(renderer) {
    this.scene = new THREE.Scene();
    this.scene.background = PAPER.clone();
    this.scene.environment = studioEnv(renderer);
    this.scene.environmentIntensity = 0.55;
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.02, 60);
    this.shift = new THREE.Vector2();
    this.mouse = new THREE.Vector2();

    this.scene.add(new THREE.HemisphereLight('#fff8ee', '#3d3772', 1.4)); // violet ground bounce, not black
    const key = new THREE.DirectionalLight('#fff3e2', 2.4);
    key.position.set(-3, 4, 5);
    const rim = new THREE.DirectionalLight('#c9d0ff', 2);
    rim.position.set(4, 1.5, -4);
    this.scene.add(key, rim);

    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.build();
    this.buildShadow();
  }

  build() {
    const g = this.group;
    const body = new THREE.Mesh(
      new THREE.ExtrudeGeometry(rounded(1.9, 1.1, 0.42), { depth: 0.5, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.08, bevelSegments: 8, curveSegments: 24 }).translate(0, 0, -0.25),
      new THREE.MeshStandardMaterial({ color: '#1b1b20', roughness: 0.36, metalness: 0.1 }),
    );
    g.add(body);

    // visor: screen-space window into the arena + a little glass
    this.visorMat = new THREE.ShaderMaterial({
      uniforms: { tView: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uSize: { value: new THREE.Vector2(VISOR.w, VISOR.h) }, uGlass: { value: 1 } },
      vertexShader: `
        uniform vec2 uSize; varying vec2 vUv; varying vec3 vN, vV;
        void main(){
          vUv = position.xy / uSize + .5;
          vec4 w = modelMatrix * vec4(position, 1.);
          vN = normalize(mat3(modelMatrix) * normal); vV = cameraPosition - w.xyz;
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: `
        uniform sampler2D tView; uniform vec2 uRes; uniform float uGlass; varying vec2 vUv; varying vec3 vN, vV;
        void main(){
          vec3 c = texture2D(tView, gl_FragCoord.xy / uRes).rgb;
          float fr = pow(1. - max(dot(normalize(vN), normalize(vV)), 0.), 3.);
          float diag = vUv.x * .9 + vUv.y * .55;
          float streak = smoothstep(.07, 0., abs(diag - .66)) * .1 + smoothstep(.015, 0., abs(diag - .79)) * .1;
          float e = min(min(vUv.x, 1. - vUv.x), min(vUv.y, 1. - vUv.y));
          c *= mix(1., smoothstep(0., .1, e) * .55 + .45, uGlass);
          c += (streak + fr * .3) * uGlass;
          gl_FragColor = vec4(c, 1.);
        }`,
    });
    const visor = new THREE.Mesh(new THREE.ShapeGeometry(rounded(VISOR.w, VISOR.h, VISOR.r), 24), this.visorMat);
    visor.position.z = FRONT + 0.002;
    g.add(visor);

    // face cushion
    const ring = rounded(1.78, 0.98, 0.38);
    ring.holes.push(rounded(1.4, 0.66, 0.26));
    const cushion = new THREE.Mesh(
      new THREE.ExtrudeGeometry(ring, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 4, curveSegments: 20 }).translate(0, 0, -0.55),
      new THREE.MeshStandardMaterial({ color: '#4a4850', roughness: 1 }),
    );
    g.add(cushion);

    // straps
    const strapMat = new THREE.MeshStandardMaterial({ color: '#26252c', roughness: 0.75 });
    const band = new THREE.Mesh(new THREE.TorusGeometry(1, 0.075, 12, 80), strapMat);
    band.rotation.x = Math.PI / 2;
    band.scale.set(1.02, 1.25, 0.7);
    band.position.z = -1.3;
    const top = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.06, 10, 48, Math.PI), strapMat);
    top.rotation.y = Math.PI / 2;
    top.scale.set(1, 0.3, 1);
    top.position.set(0, 0.38, -1.45);
    g.add(band, top);

    // tracking cameras and one status light: the only accent in the real world
    const lensMat = new THREE.MeshStandardMaterial({ color: '#08080a', roughness: 0.15, metalness: 0.4 });
    [[-0.78, -0.36], [0.78, -0.36], [-0.82, 0.38], [0.82, 0.38]].forEach(([x, y]) => {
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 20).rotateX(Math.PI / 2), lensMat);
      l.position.set(x, y, FRONT + 0.01);
      g.add(l);
    });
    const led = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.12, 4, 10).rotateZ(Math.PI / 2), new THREE.MeshBasicMaterial({ color: ACC.clone().multiplyScalar(1.3) }));
    led.position.set(0.6, 0.53, FRONT - 0.02);
    g.add(led);
    const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 20), strapMat);
    btn.position.set(-0.55, -0.64, 0);
    g.add(btn);
  }

  buildShadow() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d');
    const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr;
    x.fillRect(0, 0, 128, 128);
    this.shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 2.4).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: '#2c2752', alphaMap: new THREE.CanvasTexture(c), transparent: true, opacity: 0.2, depthWrite: false }),
    );
    this.shadow.position.set(0, -1.05, -0.7);
    this.scene.add(this.shadow);
  }

  resize(w, h) {
    const aspect = w / h;
    this.camera.aspect = aspect;
    this.narrow = aspect < 0.9;
    // keep the whole headset in frame, and end close enough that the visor covers the screen
    const tanH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    this.startDist = Math.max(7.4, (this.narrow ? 2.7 : 3.3) / (2 * tanH * aspect));
    const fit = Math.min(VISOR.h / (2 * tanH), VISOR.w / (2 * tanH * aspect));
    this.endDist = fit * 0.55;
    this.startShift = this.narrow ? new THREE.Vector2(0, -0.16) : new THREE.Vector2(-0.3, -0.12);
  }

  // p: 0 = on the table, 1 = inside the visor
  update(dt, t, p, pointer, viewTex, res) {
    const k = 1 - Math.exp(-3 * dt);
    this.mouse.lerp(pointer, k);
    const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    const idle = 1 - e;

    const g = this.group;
    g.rotation.set(
      (0.16 + Math.sin(t * 0.6) * 0.03 - this.mouse.y * 0.18) * idle,
      (-0.62 + Math.sin(t * 0.4) * 0.08 + this.mouse.x * 0.35) * idle,
      (Math.sin(t * 0.5) * 0.03) * idle,
    );
    g.position.y = Math.sin(t * 0.9) * 0.05 * idle;

    const cam = this.camera;
    const dist = THREE.MathUtils.lerp(this.startDist, FRONT + this.endDist, e);
    cam.position.set(0, 0.35 * idle, dist);
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
    // shift the projection so the headset sits off-center, then glide to center as we dive
    this.shift.copy(this.startShift).multiplyScalar(idle);
    cam.projectionMatrix.elements[8] = this.shift.x;
    cam.projectionMatrix.elements[9] = this.shift.y;
    cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();

    this.shadow.material.opacity = 0.2 * idle;
    const u = this.visorMat.uniforms;
    u.tView.value = viewTex;
    u.uRes.value.copy(res);
    u.uGlass.value = 1 - Math.min(Math.max((p - 0.6) / 0.35, 0), 1);
  }
}
