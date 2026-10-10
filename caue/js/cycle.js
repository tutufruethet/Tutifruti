import * as THREE from 'three';

// Atmosphere presets, interpolated by keyframes (technique read in Bruno Simon's DayCycles).
// Shadows are never black: the hemisphere "ground" color is what fills them.
const PRESETS = {
  day:   { sun: '#fff0d6', sunI: 2.6, sky: '#c4e9ff', ground: '#6a4fd6', hemiI: 1.15, fogA: '#8fdcff', fogB: '#d2bdff', lamp: 0.2, night: 0 },
  dusk:  { sun: '#ff8f6b', sunI: 1.9, sky: '#ffa3d2', ground: '#4a2a9c', hemiI: 1.0, fogA: '#6a72ff', fogB: '#ff86c8', lamp: 1.6, night: 0.35 },
  night: { sun: '#7f8cff', sunI: 0.6, sky: '#2c3480', ground: '#1e1356', hemiI: 0.9, fogA: '#0e1642', fogB: '#3d1656', lamp: 3.4, night: 1 },
  dawn:  { sun: '#ffb089', sunI: 1.8, sky: '#ffc8ab', ground: '#62308f', hemiI: 1.0, fogA: '#ff9fd6', fogB: '#ffb86e', lamp: 1.1, night: 0.3 },
};
const KEYS = [[0, 'day'], [0.2, 'day'], [0.3, 'dusk'], [0.4, 'night'], [0.6, 'night'], [0.72, 'dawn'], [0.82, 'day'], [1, 'day']];
const STOPS = [['Dia', 0.05], ['Entardecer', 0.29], ['Noite', 0.45], ['Amanhecer', 0.71]];
const COLORS = ['sun', 'sky', 'ground', 'fogA', 'fogB'];
const NUMBERS = ['sunI', 'hemiI', 'lamp', 'night'];

for (const p of Object.values(PRESETS)) for (const c of COLORS) p[c] = new THREE.Color(p[c]);

export class DayCycle {
  constructor(duration = 240) {
    this.duration = duration;
    this.t = 0.06;
    this.skipTo = null;
    this.state = {};
    for (const c of COLORS) this.state[c] = new THREE.Color();
    this.sample();
  }

  get phase() {
    const t = this.t;
    if (t < 0.25 || t >= 0.8) return 'Dia';
    if (t < 0.37) return 'Entardecer';
    if (t < 0.66) return 'Noite';
    return 'Amanhecer';
  }

  next() {
    const i = STOPS.findIndex(([name]) => name === this.phase);
    this.skipTo = STOPS[(i + 1) % STOPS.length][1];
  }

  update(dt) {
    if (this.skipTo !== null) {
      const dist = (this.skipTo - this.t + 1) % 1;
      const stepT = Math.min(dist, dt * 0.22);
      this.t = (this.t + stepT) % 1;
      if (dist < 0.002) this.skipTo = null;
    } else {
      this.t = (this.t + dt / this.duration) % 1;
    }
    this.sample();
  }

  sample() {
    let i = 0;
    while (KEYS[i + 1][0] <= this.t) i++;
    const [ta, a] = KEYS[i], [tb, b] = KEYS[i + 1];
    let k = (this.t - ta) / (tb - ta);
    k = k * k * (3 - 2 * k);
    const A = PRESETS[a], B = PRESETS[b];
    for (const c of COLORS) this.state[c].copy(A[c]).lerp(B[c], k);
    for (const n of NUMBERS) this.state[n] = A[n] + (B[n] - A[n]) * k;
  }
}
