import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FONT } from './logo-font.js';
import { createBall, BALL_R } from './ball.js';

// The VR Arena badge in 3D: a black disc with a lit gold rim, "VR" in brushed gold, the swoosh,
// the gold ball, ARENA in chrome and JANGA in gold. It assembles in the air, a light sweeps the
// metal, then it dissolves into gold dust and lets the ball go.

const GOLD = '#e2aa3c';
const sat = x => Math.min(Math.max(x, 0), 1);
const expo = x => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * Math.max(x, 0)));
const ss = (a, b, x) => { const t = sat((x - a) / (b - a)); return t * t * (3 - 2 * t); };

export const BALL_AT = new THREE.Vector3(0.42, 2.2, 0.15); // ball centre, badge space
export const BALL_SIZE = 0.42;
export const DISSOLVE = 4.4; // seconds into the opening

// a dark studio with a few hard strip lights: crisp highlights on the metal
function studioEnv(renderer) {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.BoxGeometry(20, 12, 20), new THREE.MeshBasicMaterial({ color: '#060504', side: THREE.BackSide })));
  const strip = (w, h, pos, c) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 0, 0); s.add(m);
  };
  strip(9, 0.6, [0, 4.5, 6], new THREE.Color(14, 13, 11));
  strip(0.7, 8, [-8, 0, 3], new THREE.Color(9, 8, 6.5));
  strip(0.5, 7, [7, 1, -2], new THREE.Color(5, 5.5, 7));
  strip(6, 3, [2, -5, 4], new THREE.Color(1.6, 1.2, 0.7));
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(s, 0.02).texture;
  pm.dispose();
  return tex;
}

// fine horizontal streaks for a brushed finish
function brushed() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#5a5a5a'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) {
    const v = 60 + Math.random() * 90;
    g.fillStyle = `rgba(${v},${v},${v},.5)`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 20 + Math.random() * 90, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1.5, 1.5);
  return t;
}

export class Logo {
  constructor(renderer) {
    this.group = new THREE.Group();
    this.tilt = new THREE.Group();
    this.group.add(this.tilt);
    const env = this.env = studioEnv(renderer);
    const rough = brushed();
    this.gold = new THREE.MeshPhysicalMaterial({ color: GOLD, metalness: 1, roughness: 0.3, roughnessMap: rough, envMap: env, envMapIntensity: 2.2, clearcoat: 0.4, clearcoatRoughness: 0.2 });
    this.chrome = new THREE.MeshPhysicalMaterial({ color: '#e4e7ec', metalness: 1, roughness: 0.16, envMap: env, envMapIntensity: 1.8 });
    this.stone = new THREE.MeshStandardMaterial({ color: '#0d0c0b', roughness: 0.7, metalness: 0.2, envMap: env, envMapIntensity: 0.25 });
    this.neon = new THREE.MeshBasicMaterial({ color: new THREE.Color(GOLD).multiplyScalar(1.5) });
    this.mats = [this.gold, this.chrome, this.stone, this.neon];
    this.pieces = [];

    const font = new FontLoader().parse(FONT);
    const text = (str, size, depth, bevel) => {
      const g = new TextGeometry(str, { font, size, depth, curveSegments: 10, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 4 });
      g.computeBoundingBox();
      return g;
    };
    const piece = (mesh, from) => {
      const pivot = new THREE.Group();
      pivot.position.copy(mesh.position);
      mesh.position.set(0, 0, 0);
      pivot.add(mesh);
      this.tilt.add(pivot);
      this.pieces.push({ pivot, ...from, home: pivot.position.clone() });
      return pivot;
    };

    // the disc and its rims
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.1, 0.22, 128).rotateX(Math.PI / 2), this.stone);
    disc.position.z = -0.2;
    piece(disc, { at: 0.15, dur: 1.0, rise: 0, spin: 0, grow: true });
    const ring = (r, tube, mat, a0, a1, segs = 220) => {
      const curve = new THREE.Curve();
      curve.getPoint = (u, out = new THREE.Vector3()) => { const a = a0 + (a1 - a0) * u; return out.set(Math.cos(a) * r, Math.sin(a) * r, 0); };
      const geo = new THREE.TubeGeometry(curve, segs, tube, 12, false);
      const m = new THREE.Mesh(geo, mat);
      this.tilt.add(m);
      return m;
    };
    const deg = Math.PI / 180;
    this.rims = [
      { mesh: ring(3.13, 0.028, this.neon, 90 * deg, 450 * deg), at: 0.3, dur: 1.3 },
      { mesh: ring(3.02, 0.06, this.gold, 90 * deg, 450 * deg), at: 0.35, dur: 1.3 },
      { mesh: ring(2.2, 0.09, this.gold, 101 * deg, 384 * deg), at: 0.7, dur: 1.2 }, // the inner arc, open where the ball sits
    ];
    for (const r of this.rims) r.mesh.geometry.setDrawRange(0, 0);

    // V and R, each its own piece so they can rise one after the other
    const V = text('V', 1.85, 0.42, 0.05), R = text('R', 1.85, 0.42, 0.05);
    const wv = V.boundingBox.max.x - V.boundingBox.min.x, wr = R.boundingBox.max.x - R.boundingBox.min.x;
    const gap = -0.1, total = wv + gap + wr, x0 = -total / 2 + 0.05;
    const vm = new THREE.Mesh(V, this.gold); vm.position.set(x0 - V.boundingBox.min.x, -0.42, -0.1);
    const rm = new THREE.Mesh(R, this.gold); rm.position.set(x0 + wv + gap - R.boundingBox.min.x, -0.42, -0.1);
    piece(vm, { at: 0.9, dur: 1.1, rise: -1.2, spin: -1.4 });
    piece(rm, { at: 1.05, dur: 1.1, rise: -1.2, spin: -1.4 });

    // the swoosh under the letters
    const sw = new THREE.Shape();
    sw.moveTo(-2.05, -0.62);
    sw.quadraticCurveTo(-0.2, -1.32, 2.1, -0.5);
    sw.lineTo(2.12, -0.42);
    sw.quadraticCurveTo(-0.2, -1.05, -2.05, -0.62);
    const swoosh = new THREE.Mesh(new THREE.ExtrudeGeometry(sw, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.015, bevelSegments: 3, curveSegments: 40 }), this.gold);
    piece(swoosh, { at: 1.5, dur: 0.9, rise: 0, spin: 0, sweep: true });

    const arena = text('ARENA', 0.66, 0.2, 0.03);
    const aw = arena.boundingBox.max.x - arena.boundingBox.min.x;
    const am = new THREE.Mesh(arena, this.chrome); am.position.set(-aw / 2 - arena.boundingBox.min.x, -1.82, 0.05);
    piece(am, { at: 2.3, dur: 1.0, rise: -0.5, spin: 0 });
    const janga = text('JANGA', 0.36, 0.09, 0.014);
    const jw = janga.boundingBox.max.x - janga.boundingBox.min.x;
    const jm = new THREE.Mesh(janga, this.gold); jm.position.set(-jw / 2 - janga.boundingBox.min.x, -2.5, 0.05);
    piece(jm, { at: 2.75, dur: 0.9, rise: -0.3, spin: 0 });
    for (const s of [-1, 1]) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.035, 0.04), this.gold);
      line.position.set(s * (jw / 2 + 0.6), -2.32, 0.05);
      piece(line, { at: 2.85, dur: 0.9, rise: 0, spin: 0, sweep: true });
    }

    // the ball: gold panels, black pentagons
    this.ball = createBall({ hex: [0.95, 0.66, 0.24], pent: [0.02, 0.018, 0.015], metalness: 1, roughness: 0.28, envMap: env });
    this.ball.scale.setScalar(BALL_SIZE / BALL_R);
    this.ball.material.envMapIntensity = 2.6;

    // dust: gold motes around the badge, and the cloud it dissolves into
    this.dust = this.makeDust();
    this.tilt.add(this.dust);
    this.burst = this.makeBurst([vm, rm, am, jm, swoosh, ...this.rims.map(r => r.mesh)]);
    this.tilt.add(this.burst);
  }

  makeDust() {
    const n = 260, pos = new Float32Array(n * 3), seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 5;
      pos.set([Math.cos(a) * r, (Math.random() - 0.5) * 7, (Math.random() - 0.5) * 4], i * 3);
      seed[i] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    this.dustMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uA: { value: 0 }, uPr: { value: 1 } },
      vertexShader: `
        attribute float aSeed; uniform float uTime, uPr; varying float vA;
        void main(){
          vec3 p = position;
          p.y = mod(p.y + uTime * (.15 + aSeed * .3) + 3.5, 7.) - 3.5;
          p.x += sin(uTime * .5 + aSeed * 20.) * .2;
          vA = .4 + .6 * sin(uTime * 2. + aSeed * 40.);
          vec4 mv = modelViewMatrix * vec4(p, 1.);
          gl_PointSize = uPr * (2. + aSeed * 3.) * 12. / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `uniform float uA; varying float vA; void main(){ float d = length(gl_PointCoord - .5); gl_FragColor = vec4(vec3(1., .7, .3) * 2. * smoothstep(.5, 0., d) * vA * uA, 1.); }`,
    });
    const p = new THREE.Points(g, this.dustMat);
    p.frustumCulled = false;
    return p;
  }

  // sample the badge's surfaces; each sample becomes a mote that drifts away
  makeBurst(meshes) {
    const pts = [], v = new THREE.Vector3();
    this.tilt.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(this.tilt.matrixWorld).invert();
    for (const m of meshes) {
      const p = m.geometry.attributes.position;
      const toLocal = new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld);
      const step = Math.max(1, Math.floor(p.count / 700));
      for (let i = 0; i < p.count; i += step) pts.push(v.fromBufferAttribute(p, i).applyMatrix4(toLocal).clone());
    }
    const n = pts.length, pos = new Float32Array(n * 3), vel = new Float32Array(n * 3);
    pts.forEach((p, i) => {
      pos.set([p.x, p.y, p.z], i * 3);
      const out = new THREE.Vector3(p.x, p.y, 0).normalize().multiplyScalar(0.6 + Math.random() * 1.4);
      vel.set([out.x + (Math.random() - 0.5), out.y + Math.random() * 1.2, 0.8 + Math.random() * 2.5], i * 3);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aVel', new THREE.BufferAttribute(vel, 3));
    this.burstMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uT: { value: 0 }, uPr: { value: 1 } },
      vertexShader: `
        attribute vec3 aVel; uniform float uT, uPr; varying float vA;
        void main(){
          vec3 p = position + aVel * uT * (1. + uT * .8) + vec3(sin(uT * 3. + position.y * 4.), cos(uT * 2.5 + position.x * 3.), 0.) * .15 * uT;
          vA = smoothstep(0., .08, uT) * (1. - smoothstep(.5, 1.6, uT));
          vec4 mv = modelViewMatrix * vec4(p, 1.);
          gl_PointSize = uPr * 36. / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - .5); gl_FragColor = vec4(vec3(1., .72, .32) * 2.4 * smoothstep(.5, 0., d) * vA, 1.); }`,
    });
    const b = new THREE.Points(g, this.burstMat);
    b.frustumCulled = false;
    b.visible = false;
    return b;
  }

  setPixelRatio(pr) { this.dustMat.uniforms.uPr.value = pr; this.burstMat.uniforms.uPr.value = pr; }

  // t: seconds into the opening; returns the ball's resting spot on the badge in world space
  update(t, pointer, out) {
    // pieces arrive: rise, unspin, scale in, each on its own beat
    for (const p of this.pieces) {
      const k = expo((t - p.at) / p.dur);
      p.pivot.position.copy(p.home);
      p.pivot.position.y += (1 - k) * p.rise;
      p.pivot.rotation.x = (1 - k) * p.spin;
      if (p.grow) p.pivot.scale.setScalar(Math.max(k, 0.001));
      else if (p.sweep) p.pivot.scale.set(Math.max(k, 0.001), 1, 1);
      else p.pivot.scale.setScalar(0.6 + 0.4 * k);
      p.pivot.visible = t > p.at;
    }
    // rims draw themselves round the badge
    for (const r of this.rims) {
      const g = r.mesh.geometry, total = g.index.count;
      g.setDrawRange(0, Math.floor(expo((t - r.at) / r.dur) * total / 6) * 6);
    }
    // a light sweeps across the metal, then settles
    const sweep = -1.2 + 2.6 * ss(1.4, 4.2, t);
    for (const m of [this.gold, this.chrome]) m.envMapRotation.set(0.15, sweep, 0);
    this.ball.material.envMapRotation.set(0.15, sweep, 0);
    // the badge leans toward the cursor
    this.tilt.rotation.y += (pointer.x * 0.25 - this.tilt.rotation.y) * 0.06;
    this.tilt.rotation.x += (-pointer.y * 0.18 - this.tilt.rotation.x) * 0.06;
    this.group.position.y = this.baseY + Math.sin(t * 1.2) * 0.06;

    // dissolve into gold dust
    const d = t - DISSOLVE;
    const fade = 1 - ss(0, 0.45, d);
    for (const m of this.mats) {
      m.opacity = fade;
      if (m.transparent !== fade < 1) { m.transparent = fade < 1; m.needsUpdate = true; } // opaque ↔ blended needs a new program
    }
    this.dustMat.uniforms.uTime.value = t;
    this.dustMat.uniforms.uA.value = ss(0, 1, t) * (1 - ss(0.5, 2, d));
    this.burst.visible = d > 0 && d < 2;
    this.burstMat.uniforms.uT.value = Math.max(d, 0);
    this.tilt.visible = d < 2.2;

    // the ball drops onto the top of the arc and bounces to rest
    const bt = t - 1.9;
    const local = BALL_AT.clone();
    if (bt < 0) local.y += 6;
    else {
      // fall from 6 units, then two small bounces
      const T = Math.sqrt(12 / 9.8);
      if (bt < T) local.y += 6 - 4.9 * bt * bt;
      else { const b = bt - T; local.y += Math.abs(Math.sin(b * 6)) * 0.35 * Math.exp(-b * 4); }
    }
    this.tilt.updateMatrixWorld(true);
    return out.copy(local).applyMatrix4(this.tilt.matrixWorld);
  }

  place(pos, facing) {
    this.baseY = pos.y;
    this.group.position.copy(pos);
    this.group.lookAt(facing);
  }
}
