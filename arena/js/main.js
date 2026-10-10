import { reduce, fine, setLoad, finishLoad, onXp } from './ui.js';

const $ = s => document.querySelector(s);
const touch = !fine;
const high = !touch && !/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
if (reduce) document.body.classList.add('reduce');

const fonts = Promise.race([
  Promise.all(['500 40px "Instrument Sans"', 'italic 40px "Instrument Serif"'].map(f => document.fonts.load(f))),
  new Promise(r => setTimeout(r, 2500)),
]);
setLoad(0.25);

let gl = null;
try { gl = document.createElement('canvas').getContext('webgl2'); } catch { /* no WebGL */ }
if (!gl) {
  // the page still works: paper hero, dark arena colors, no canvas
  document.body.classList.add('nogl', 'virtual');
  await fonts;
  await finishLoad();
} else {
  await start();
}

async function start() {
  const THREE = await import('three');
  const { EffectComposer } = await import('three/addons/postprocessing/EffectComposer.js');
  const { RenderPass } = await import('three/addons/postprocessing/RenderPass.js');
  const { UnrealBloomPass } = await import('three/addons/postprocessing/UnrealBloomPass.js');
  const { Holodeck } = await import('./holodeck.js');
  const { Headset } = await import('./headset.js');
  setLoad(0.6);

  const canvas = $('#gl');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: high, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, high ? 1.75 : 1.5));
  renderer.toneMapping = THREE.NeutralToneMapping;

  const holo = new Holodeck({ high });
  const real = new Headset(renderer);

  // arena → composer (bloom only on HDR lines); headset → its own target; final pass mixes and grades
  const composer = new EffectComposer(renderer);
  composer.renderToScreen = false;
  composer.addPass(new RenderPass(holo.scene, holo.camera));
  if (high) composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.55, 0.35, 1));
  const realRT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: high ? 4 : 0 });

  const final = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false,
    uniforms: { tSrc: { value: null }, uRes: { value: new THREE.Vector2() }, uTime: { value: 0 }, uKick: { value: 0 }, uVirtual: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
    fragmentShader: `
      uniform sampler2D tSrc; uniform vec2 uRes; uniform float uTime, uKick, uVirtual; varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){
        vec2 d = vUv - .5;
        float k = uKick * .035;
        vec3 c = vec3(texture2D(tSrc, vUv + d * k).r, texture2D(tSrc, vUv).g, texture2D(tSrc, vUv - d * k).b);
        float v = smoothstep(.95, .2, length(d * vec2(1., .85)));
        c *= mix(1., mix(.5, 1., v), uVirtual);
        gl_FragColor = vec4(c, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        gl_FragColor.rgb += (hash(vUv * uRes + fract(uTime) * 91.) - .5) * .04;
      }`,
  }));
  final.frustumCulled = false;
  const finalScene = new THREE.Scene();
  finalScene.add(final);
  const finalCam = new THREE.Camera();

  const res = new THREE.Vector2();
  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(w, h);
    renderer.getDrawingBufferSize(res);
    realRT.setSize(res.x, res.y);
    final.material.uniforms.uRes.value.copy(res);
    holo.resize(w, h);
    real.resize(w, h);
    dirty = true;
  }

  /* ---------- input ---------- */
  const pointer = new THREE.Vector2();
  addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    pointer.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    dirty = true;
  }, { passive: true });
  onXp(i => { holo.setShape(i); dirty = true; });

  const xpSec = $('#experiencias');
  const dive = $('.dive'), pctEl = $('[data-pct]'), hud = $('.hud');
  let p = 0, scrollV = 0, lastScroll = scrollY, virtual = false, kick = 0, dirty = true;
  function readScroll() {
    const max = dive.offsetHeight - innerHeight;
    p = reduce ? (scrollY > innerHeight * 0.5 ? 1 : 0) : Math.min(Math.max(scrollY / max, 0), 1);
    dive.style.setProperty('--p', p.toFixed(4));
    pctEl.textContent = String(Math.round(p * 100)).padStart(3, '0');
    hud.classList.toggle('on', p > 0.08 && p < 0.97);
    const v = p >= 0.97;
    if (v !== virtual) { virtual = v; kick = 1; document.body.classList.toggle('virtual', v); }
    dirty = true;
  }
  addEventListener('scroll', readScroll, { passive: true });
  addEventListener('resize', () => { resize(); readScroll(); });
  resize();
  readScroll();

  /* ---------- frame ---------- */
  const clock = new THREE.Clock();
  let t = reduce ? 4 : 0;
  function frame(forced) {
    const dt = forced ?? Math.min(clock.getDelta(), 1 / 20);
    if (reduce && !dirty) return;
    dirty = false;
    if (!reduce) t += dt;
    const sy = scrollY;
    scrollV += ((sy - lastScroll) / Math.max(dt, 1e-3) / 100 - scrollV) * 0.1;
    lastScroll = sy;
    kick = Math.max(kick - dt * 1.6, 0);
    const k = reduce ? 1 : dt;

    holo.update(k, t, { z: -sy * 0.009 - (reduce ? 0 : t * 0.35), speed: reduce ? 0 : scrollV, pointer, dive: virtual ? 1 : p, focus: xpSec.getBoundingClientRect().bottom > innerHeight * 0.45 ? 1 : 0 });
    composer.render(dt);
    const view = composer.readBuffer.texture;

    const u = final.material.uniforms;
    if (!virtual) {
      real.update(k, t, p, pointer, view, res);
      renderer.setRenderTarget(realRT);
      renderer.render(real.scene, real.camera);
      u.tSrc.value = realRT.texture;
    } else u.tSrc.value = view;
    u.uTime.value = t;
    u.uKick.value = reduce ? 0 : kick * kick;
    u.uVirtual.value = virtual ? 1 : 0;
    renderer.setRenderTarget(null);
    renderer.render(finalScene, finalCam);
  }
  renderer.setAnimationLoop(() => frame());

  // test hook: stop the loop and step frames by hand (software GL is too slow for real time)
  if (location.hash === '#debug') window.__arena = {
    holo, real, get p() { return p; },
    stop() { renderer.setAnimationLoop(null); },
    step(n = 1, dt = 1 / 30) { for (let i = 0; i < n; i++) { dirty = true; frame(dt); } },
  };

  setLoad(0.9);
  frame();
  await fonts;
  await finishLoad();
}
