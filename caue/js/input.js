const BLOCK = new Set(['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ']);

export class Input {
  constructor() {
    this.keys = new Set();
    this.joy = { x: 0, y: 0 };
    this.touchBoost = false;
    this.enabled = false;
    this.handlers = {};
    addEventListener('keydown', e => {
      if (!this.enabled || e.target.closest?.('input,textarea')) return;
      const k = e.key.toLowerCase();
      if (BLOCK.has(k)) e.preventDefault();
      if (!e.repeat) this.emit(k);
      this.keys.add(k);
    });
    addEventListener('keyup', e => this.keys.delete(e.key.toLowerCase()));
    addEventListener('blur', () => this.keys.clear());
  }

  on(key, fn) { (this.handlers[key] ??= []).push(fn); }
  emit(key) { (this.handlers[key] || []).forEach(fn => fn()); }
  has(...k) { return this.enabled && k.some(x => this.keys.has(x)); }

  get throttle() {
    const t = (this.has('w', 'arrowup') ? 1 : 0) - (this.has('s', 'arrowdown') ? 1 : 0);
    return t || (this.enabled ? -this.joy.y : 0);
  }
  get steer() {
    const s = (this.has('a', 'arrowleft') ? 1 : 0) - (this.has('d', 'arrowright') ? 1 : 0);
    return s || (this.enabled ? -this.joy.x : 0);
  }
  get boost() { return this.has('shift') || (this.enabled && this.touchBoost); }

  // Virtual joystick: drag inside `base`, knob follows the finger.
  bindJoystick(base, knob) {
    let id = null, cx = 0, cy = 0;
    const R = 46;
    const move = e => {
      const dx = e.clientX - cx, dy = e.clientY - cy, d = Math.hypot(dx, dy), k = d > R ? R / d : 1;
      this.joy.x = (dx * k) / R;
      this.joy.y = (dy * k) / R;
      knob.style.transform = `translate(${dx * k}px,${dy * k}px)`;
    };
    base.addEventListener('pointerdown', e => {
      id = e.pointerId; base.setPointerCapture(id);
      const r = base.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2;
      move(e);
    });
    base.addEventListener('pointermove', e => { if (e.pointerId === id) move(e); });
    const end = e => {
      if (e.pointerId !== id) return;
      id = null; this.joy.x = this.joy.y = 0; knob.style.transform = '';
    };
    base.addEventListener('pointerup', end);
    base.addEventListener('pointercancel', end);
  }
}
