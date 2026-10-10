import * as THREE from 'three';

// A player in the house kit (black and gold), built from lathe shapes and posed by hand-written
// keyframes: bends to set the ball down, steps back, runs up, strikes, celebrates.
// He faces +x; his right side is +z.

export const RELEASE = 1.0;            // lets go of the ball
export const RUN_AT = 3.6;             // run-up starts
export const CONTACT = RUN_AT + 0.95;  // the strike
const GOLD = '#d9a441';

const ss = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
const mix = (a, b, k) => a + (b - a) * k;

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// the jersey wraps the lathe torso: u = 0 at +z (his right), .25 front, .5 left, .75 back
function jerseyTex() {
  return canvasTex(1024, 512, (g, w, h) => {
    g.fillStyle = '#131315'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 6) { g.fillStyle = x % 12 ? 'rgba(255,255,255,.025)' : 'rgba(0,0,0,.18)'; g.fillRect(x, 0, 3, h); }
    g.fillStyle = GOLD;
    for (const u of [0, 0.5, 1]) g.fillRect(u * w - 9, 0, 18, h);   // side panels
    g.fillRect(0, 0, w, 16);                                           // collar
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '700 190px "Instrument Sans", system-ui, sans-serif';
    g.fillText('10', w * 0.75, h * 0.5);                               // number on the back
    g.beginPath(); g.arc(w * 0.27, h * 0.3, 26, 0, Math.PI * 2); g.lineWidth = 6; g.strokeStyle = GOLD; g.stroke();
    g.font = '700 22px "Instrument Sans", system-ui, sans-serif'; g.fillText('VR', w * 0.27, h * 0.3 + 1);
  });
}

// a tapered limb hanging down from its joint
function limb(len, r0, r1, mat, parent, at) {
  const joint = new THREE.Group();
  joint.position.set(...at);
  const pts = [new THREE.Vector2(0.001, 0.01), new THREE.Vector2(r0 * 0.75, 0)];
  for (let i = 1; i <= 8; i++) {
    const k = i / 9;
    pts.push(new THREE.Vector2(mix(r0, r1, k) * (1 + Math.sin(k * Math.PI) * 0.12), -k * len));
  }
  pts.push(new THREE.Vector2(r1 * 0.8, -len), new THREE.Vector2(0.001, -len - 0.01));
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 16), mat);
  m.castShadow = true;
  joint.add(m);
  parent.add(joint);
  return joint;
}

const STAND = { lean: 0.02, hipY: 0.95, tL: 0.04, sL: -0.06, tR: -0.03, sR: -0.05, aLz: 0.08, aLx: 0.14, aRz: -0.06, aRx: -0.14, fL: 0.3, fR: 0.3, head: 0 };
// setting the ball down, as in the first reference photo
const BEND = { lean: -1.2, hipY: 0.9, tL: 0.22, sL: -0.12, tR: 0.12, sR: -0.1, aLz: 1.05, aLx: 0.12, aRz: 1.0, aRx: -0.12, fL: 0.25, fR: 0.3, head: 0.35 };
const BEND_LOW = { ...BEND, lean: -1.32, hipY: 0.84, tL: 0.4, sL: -0.45, tR: 0.3, sR: -0.4, aLz: 1.15, aRz: 1.1 };
function run(ph, amp = 1) {
  const s = Math.sin(ph);
  return {
    lean: -0.28 * amp, hipY: 0.95 - 0.03 * amp + Math.abs(Math.cos(ph)) * 0.05 * amp,
    tL: s * 0.8 * amp, sL: -0.06 - 1.1 * amp * Math.max(0, -Math.sin(ph - 0.6)),
    tR: -s * 0.8 * amp, sR: -0.06 - 1.1 * amp * Math.max(0, Math.sin(ph - 0.6)),
    aLz: -s * 0.7 * amp, aLx: 0.14, aRz: s * 0.7 * amp, aRx: -0.14, fL: 0.3 + amp, fR: 0.3 + amp, head: 0,
  };
}
// the second reference photo: arms out for balance, kicking leg cocked
const WIND = { lean: -0.1, hipY: 0.9, tL: 0.32, sL: -0.35, tR: -0.85, sR: -1.75, aLz: 0.25, aLx: 1.2, aRz: -0.4, aRx: -0.9, fL: 0.5, fR: 0.6, head: 0.15 };
const STRIKE = { lean: 0.1, hipY: 0.93, tL: 0.12, sL: -0.15, tR: 0.45, sR: -0.15, aLz: 0.3, aLx: 1.25, aRz: -0.7, aRx: -0.75, fL: 0.3, fR: 0.6, head: 0.2 };
const FOLLOW = { lean: 0.22, hipY: 0.97, tL: -0.05, sL: -0.1, tR: 1.45, sR: -0.25, aLz: 0.5, aLx: 1.0, aRz: -0.9, aRx: -0.55, fL: 0.3, fR: 0.6, head: 0 };
function cheer(t) {
  const j = Math.abs(Math.sin(t * 7));
  return { lean: 0.05, hipY: 0.95 + j * 0.16, tL: 0.15 * j, sL: -0.35 * j, tR: 0.15 * j, sR: -0.35 * j, aLz: 0.2, aLx: 2.7, aRz: 0.2, aRx: -2.7, fL: 0.25, fR: 0.25, head: -0.2 };
}

function blend(a, b, k) {
  const o = {};
  for (const key in a) o[key] = mix(a[key], b[key], k);
  return o;
}

export class Player {
  constructor() {
    this.root = new THREE.Group();
    const skin = new THREE.MeshStandardMaterial({ color: '#8a5634', roughness: 0.55 });
    const jersey = new THREE.MeshStandardMaterial({ map: jerseyTex(), roughness: 0.6 });
    const sleeve = new THREE.MeshStandardMaterial({ color: '#151517', roughness: 0.65 });
    const black = new THREE.MeshStandardMaterial({ color: '#0f0f11', roughness: 0.6 });
    const gold = new THREE.MeshStandardMaterial({ color: GOLD, roughness: 0.35, metalness: 0.6 });
    const glove = new THREE.MeshStandardMaterial({ color: '#0a0a0b', roughness: 0.8 });
    const boot = new THREE.MeshStandardMaterial({ color: '#e9edf2', roughness: 0.35 });
    const hair = new THREE.MeshStandardMaterial({ color: '#17110d', roughness: 1, flatShading: true });

    const hips = this.hips = new THREE.Group();
    this.root.add(hips);
    const shortsPts = [[0.001, 0.07], [0.15, 0.07], [0.168, -0.02], [0.18, -0.17], [0.001, -0.17]].map(([x, y]) => new THREE.Vector2(x, y));
    const shorts = new THREE.Mesh(new THREE.LatheGeometry(shortsPts, 24), black);
    shorts.scale.set(0.8, 1, 1.15);
    shorts.castShadow = true;
    hips.add(shorts);

    const spine = this.spine = new THREE.Group();
    spine.position.y = 0.04;
    hips.add(spine);
    // torso: waist → chest → shoulders
    const prof = [[0.001, 0], [0.135, 0], [0.14, 0.1], [0.165, 0.25], [0.18, 0.37], [0.165, 0.46], [0.09, 0.52], [0.05, 0.53]].map(([x, y]) => new THREE.Vector2(x, y));
    const torso = new THREE.Mesh(new THREE.LatheGeometry(prof, 32), jersey);
    torso.scale.set(0.72, 1, 1.18);
    torso.castShadow = true;
    spine.add(torso);
    spine.add(new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.056, 0.11, 12).translate(0, 0.57, 0), skin));

    const head = this.head = new THREE.Group();
    head.position.y = 0.6;
    spine.add(head);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.105, 24, 18).translate(0, 0.11, 0), skin);
    skull.scale.set(1, 1.12, 0.9);
    skull.castShadow = true;
    const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12).translate(0.02, 0.05, 0), skin);
    jaw.scale.set(1, 0.9, 1.05);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.045, 8).rotateZ(-Math.PI / 2).translate(0.1, 0.1, 0), skin);
    head.add(skull, jaw, nose);
    for (const z of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6).translate(0, 0.11, z * 0.095), skin);
      ear.scale.set(0.6, 1, 0.5);
      head.add(ear);
    }
    // curls: a lumpy cap, flat-shaded
    const curls = new THREE.IcosahedronGeometry(0.118, 3);
    const p = curls.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      v.multiplyScalar(1.05 + Math.sin(v.x * 140) * Math.sin(v.y * 150) * Math.sin(v.z * 130) * 0.12);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    curls.computeVertexNormals();
    const hairMesh = new THREE.Mesh(curls, hair);
    hairMesh.position.set(-0.015, 0.155, 0);
    hairMesh.scale.set(1.02, 0.75, 0.98);
    head.add(hairMesh);

    // legs: thigh → shin (sock with a gold band) → boot
    const leg = side => {
      const thigh = limb(0.44, 0.085, 0.06, skin, hips, [0, -0.04, side * 0.095]);
      thigh.add(new THREE.Mesh(new THREE.CylinderGeometry(0.096, 0.088, 0.17, 16).translate(0, -0.07, 0), black));
      const knee = new THREE.Mesh(new THREE.SphereGeometry(0.056, 12, 8), skin);
      knee.position.y = -0.44;
      thigh.add(knee);
      const shin = limb(0.42, 0.058, 0.04, black, thigh, [0, -0.44, 0]);
      shin.add(new THREE.Mesh(new THREE.CylinderGeometry(0.064, 0.061, 0.035, 16).translate(0, -0.05, 0), gold));
      const foot = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.17, 4, 10).rotateZ(Math.PI / 2).translate(0.06, -0.035, 0), boot);
      foot.position.y = -0.42;
      foot.scale.set(1, 0.8, 1.05);
      foot.castShadow = true;
      const sole = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.012, 0.08).translate(0.06, -0.068, 0), black);
      sole.position.y = -0.42;
      shin.add(foot, sole);
      return { thigh, shin };
    };
    this.L = leg(-1);
    this.R = leg(1);

    const arm = side => {
      const sh = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), sleeve);
      sh.position.set(0, 0.44, side * 0.2);
      sh.castShadow = true;
      spine.add(sh);
      const upper = limb(0.29, 0.058, 0.045, sleeve, spine, [0, 0.44, side * 0.215]);
      const fore = limb(0.26, 0.045, 0.036, sleeve, upper, [0, -0.29, 0]);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), glove);
      hand.position.y = -0.3;
      hand.scale.set(0.8, 1.15, 0.6);
      fore.add(hand);
      return { upper, fore, hand };
    };
    this.aL = arm(-1);
    this.aR = arm(1);
    this.apply(STAND);
  }

  apply(p) {
    this.hips.position.y = p.hipY;
    this.spine.rotation.z = p.lean;
    this.head.rotation.z = p.head;
    this.L.thigh.rotation.z = p.tL; this.L.shin.rotation.z = p.sL;
    this.R.thigh.rotation.z = p.tR; this.R.shin.rotation.z = p.sR;
    this.aL.upper.rotation.set(p.aLx, 0, p.aLz); this.aR.upper.rotation.set(p.aRx, 0, p.aRz);
    this.aL.fore.rotation.z = p.fL; this.aR.fore.rotation.z = p.fR;
  }

  // while he holds it, the ball sits between the gloves
  handsCenter(out) {
    this.root.updateMatrixWorld(true);
    const a = this.aL.hand.getWorldPosition(new THREE.Vector3());
    const b = this.aR.hand.getWorldPosition(new THREE.Vector3());
    return out.copy(a).add(b).multiplyScalar(0.5).add(new THREE.Vector3(0, -0.1, 0));
  }

  // s: seconds since the sequence started (null = standing around).
  // place → from → plant: where he sets the ball down, where he steps back to, where he plants to kick.
  update(s, t, { place, from, plant }) {
    if (s === null || s > CONTACT + 5) {
      const b = Math.sin(t * 1.6) * 0.012;
      this.apply({ ...STAND, hipY: STAND.hipY + b, aLz: STAND.aLz + b * 3, aRz: STAND.aRz - b * 3 });
      this.root.position.copy(plant);
      return;
    }
    const pos = this.root.position;
    let p;
    if (s < RUN_AT) {
      // set the ball down, straighten up, step back three paces, wait
      p = blend(BEND, BEND_LOW, ss(0.1, RELEASE, s));
      p = blend(p, STAND, ss(1.25, 1.9, s));
      const back = ss(1.9, 3.1, s);
      if (s > 1.9 && s < 3.15) p = blend(p, run(-(s - 1.9) * Math.PI * 2 * 1.3, 0.45), Math.min(Math.sin(Math.PI * back) * 3, 1));
      p = blend(p, { ...STAND, aLz: -0.1, aRz: 0.1, head: 0.1 }, ss(3.1, 3.4, s));
      pos.lerpVectors(place, from, back);
    } else {
      const r = s - RUN_AT;
      pos.lerpVectors(from, plant, 1 - Math.pow(1 - Math.min(r / 0.8, 1), 1.6));
      if (s > CONTACT) pos.x += Math.min(s - CONTACT, 0.4) * 0.6; // carried through by the swing
      p = blend(STAND, run(r * Math.PI * 2 * 1.75), ss(0, 0.12, r));
      p = blend(p, WIND, ss(0.62, 0.84, r));
      p = blend(p, STRIKE, ss(0.86, 0.95, r));
      p = blend(p, FOLLOW, ss(0.95, 1.2, r));
      p = blend(p, STAND, ss(1.35, 1.9, r));
      p = blend(p, cheer(r), ss(2.1, 2.4, r) * (1 - ss(4.2, 4.8, r)));
      p = blend(p, STAND, ss(4.6, 5.2, r));
    }
    this.apply(p);
  }
}
