import * as THREE from 'three';

// Câmera orbital própria: tudo anda por amortecimento exponencial (curva expo-out), nunca colado no gesto.
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));

export class Orbit {
  constructor(camera, o = {}) {
    this.camera = camera;
    this.target = new THREE.Vector3();
    this.goalTarget = new THREE.Vector3();
    this.r = this.goalR = o.r ?? 60;
    this.th = this.goalTh = o.th ?? 0.6;
    this.ph = this.goalPh = o.ph ?? 1.1;
    this.min = o.min ?? 5; this.max = o.max ?? 200;
    this.phMin = 0.15; this.phMax = 2.9;
    this.speed = 3.2;     // rapidez com que alcança o alvo
    this.auto = 0;        // giro sozinho quando ninguém mexe
    this.follow = null;   // Object3D que o alvo persegue
    this.idle = 0;
    this._v = new THREE.Vector3();
  }
  set(o) { // pula direto para um estado (início de transição)
    if (o.target) { this.target.copy(o.target); this.goalTarget.copy(o.target); }
    if (o.r != null) this.r = this.goalR = o.r;
    if (o.th != null) this.th = this.goalTh = o.th;
    if (o.ph != null) this.ph = this.goalPh = o.ph;
  }
  rotate(dx, dy) {
    this.goalTh -= dx * 0.005;
    this.goalPh = THREE.MathUtils.clamp(this.goalPh - dy * 0.004, this.phMin, this.phMax);
    this.idle = 0;
  }
  zoom(f) { this.goalR = THREE.MathUtils.clamp(this.goalR * f, this.min, this.max); this.idle = 0; }
  snap() {
    this.target.copy(this.goalTarget); this.r = this.goalR; this.th = this.goalTh; this.ph = this.goalPh;
  }
  update(dt) {
    this.idle += dt;
    if (this.follow) this.follow.getWorldPosition(this.goalTarget);
    if (this.auto && this.idle > 2.5) this.goalTh += this.auto * dt;
    const k = this.speed;
    this.target.x = damp(this.target.x, this.goalTarget.x, k, dt);
    this.target.y = damp(this.target.y, this.goalTarget.y, k, dt);
    this.target.z = damp(this.target.z, this.goalTarget.z, k, dt);
    // raio em escala log: aproximar e afastar ficam com o mesmo ritmo
    this.r = Math.exp(damp(Math.log(this.r), Math.log(this.goalR), k, dt));
    this.th = damp(this.th, this.goalTh, k * 1.4, dt);
    this.ph = damp(this.ph, this.goalPh, k * 1.4, dt);
    this._v.setFromSphericalCoords(this.r, this.ph, this.th);
    this.camera.position.copy(this.target).add(this._v);
    this.camera.lookAt(this.target);
  }
}
