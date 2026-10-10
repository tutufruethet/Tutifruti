import { reduce, fine, setLoad, finishLoad } from './ui.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const high = fine && !/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
if (reduce) document.body.classList.add('reduce');

const fonts = Promise.race([
  Promise.all(['500 40px "Instrument Sans"', '600 40px "Instrument Sans"', 'italic 40px "Instrument Serif"'].map(f => document.fonts.load(f))),
  new Promise(r => setTimeout(r, 2500)),
]);
setLoad(0.2);

let gl = null;
try { gl = document.createElement('canvas').getContext('webgl2'); } catch { /* no WebGL */ }
if (!gl) {
  document.body.classList.add('nogl');
  await fonts;
  await finishLoad();
  document.body.classList.add('live');
} else {
  await start();
}

async function start() {
  const THREE = await import('three');
  const { EffectComposer } = await import('three/addons/postprocessing/EffectComposer.js');
  const { RenderPass } = await import('three/addons/postprocessing/RenderPass.js');
  const { UnrealBloomPass } = await import('three/addons/postprocessing/UnrealBloomPass.js');
  const { OutputPass } = await import('three/addons/postprocessing/OutputPass.js');
  const { ShaderPass } = await import('three/addons/postprocessing/ShaderPass.js');
  const { World } = await import('./world.js');
  const { Logo, DISSOLVE, BALL_SIZE } = await import('./logo.js');
  const { BALL_R } = await import('./ball.js');
  setLoad(0.45);
  await fonts; // the signs in the world are drawn with the page fonts

  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const ss = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
  const sst = x => { x = Math.min(Math.max(x, 0), 1); return x * x * x * (x * (x * 6 - 15) + 10); };

  /* ---------- renderer and scene ---------- */
  const canvas = $('#gl');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, high ? 1.75 : 1.5));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = high;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.05, 900);
  const world = new World({ scene, renderer, high });
  setLoad(0.65);

  /* ---------- the badge and its ball ---------- */
  const logo = new Logo(renderer);
  scene.add(logo.group);
  const ball = logo.ball;
  scene.add(ball);
  const CENTER = V(0, BALL_R, 0);   // the centre spot, where the ball comes to rest
  const DROP = DISSOLVE + 0.35, FLY = 2.0;
  const CRANE0 = DISSOLVE + 0.15, CRANE = 3.0, END = CRANE0 + CRANE + 0.2;
  const ballPos = V(), ballFrom = V(), lastBall = V(), spin = V(0.3, 0, -1).normalize();
  let L = V(), C0 = V(), dir = V();

  // the badge floats ahead of the hero camera, so the crane back lands exactly on the hero frame
  function placeLogo() {
    const K = keys().hero;
    dir.subVectors(K.t, K.p).normalize();
    L.copy(K.p).addScaledVector(dir, narrow() ? 30 : 22);
    C0.copy(L).addScaledVector(dir, narrow() ? -15.5 : -10);
    logo.place(L, C0);
  }

  // after the badge dissolves the ball arcs down to the centre spot and bounces to rest
  function ballFlight(t, out) {
    const k = t - DROP;
    if (k < FLY) {
      const u = k / FLY;
      out.lerpVectors(ballFrom, CENTER, u);
      out.y = ballFrom.y + (CENTER.y - ballFrom.y) * u * u + Math.sin(Math.PI * u) * 1.5 * (1 - u);
      return out;
    }
    const b = k - FLY;
    return out.copy(CENTER).setY(BALL_R + Math.abs(Math.sin(b * 7)) * 0.9 * Math.exp(-b * 3.2));
  }

  /* ---------- camera ---------- */
  const narrow = () => innerWidth / innerHeight < 0.9;
  let K = null;
  function keys() {
    if (K) return K;
    const n = narrow();
    // phone: pull back so each place fits the tall frame
    const k = (p, t, m = 1.35) => ({ p: n ? t.clone().add(p.clone().sub(t).multiplyScalar(m)) : p, t });
    K = {
      hero: k(V(-30, 24, -36), V(2, 1, 8), 1.3),
      arena: k(V(-21.5, 1.7, 11.5), V(8, 1.6, -6), 1.3),
      bar: k(V(9.5, 2.1, 33.5), V(-2, 2.8, 21.5), 1.35),
      deck: k(V(-2.1, 4.95, 18.1), V(8, 0.4, -3), 1.2),
      pool: k(V(-15, 4.2, 43), V(2, 0.3, 31), 1.3),
      party: k(V(-21.5, 2.6, 29.5), V(-37, 1.6, 25), 1.35),
      end: k(V(40, 70, 78), V(-4, 0, 10), 1.1),
    };
    return K;
  }

  // the opening: close on the badge, then crane back to the hero frame following the ball down
  const tmpA = V(), tmpB = V();
  function introPose(t, pos, look) {
    pos.copy(C0).addScaledVector(dir, 0.8 * ss(0, DISSOLVE, t));
    look.copy(L);
    if (t < CRANE0) return;
    const e = sst((t - CRANE0) / CRANE);
    const H = keys().hero;
    pos.lerp(H.p, e);
    pos.y += Math.sin(Math.PI * e) * 4;
    tmpA.lerpVectors(L, ballPos, ss(0, 0.3, e));
    look.lerpVectors(tmpA, H.t, ss(0.45, 1, e));
  }

  const camSecs = $$('[data-cam]');
  const names = camSecs.map(s => s.dataset.cam);
  let anchors = [];
  function measure() {
    K = null;
    anchors = camSecs.map((s, i) => (i === 0 ? 0 : Math.max(s.getBoundingClientRect().top + scrollY - innerHeight * 0.35, 1)));
  }
  function scrollPose(y, t, pos, look) {
    const Ks = keys();
    let i = 0;
    while (i < anchors.length - 2 && y >= anchors[i + 1]) i++;
    const u = (y - anchors[i]) / Math.max(anchors[i + 1] - anchors[i], 1);
    const e = sst(ss(0.12, 0.92, u));
    const a = Ks[names[i]], b = Ks[names[i + 1]];
    pos.lerpVectors(a.p, b.p, e);
    pos.y += Math.sin(Math.PI * e) * Math.min(a.p.distanceTo(b.p) * 0.22, 14);
    look.lerpVectors(a.t, b.t, e);
    if (!reduce) { pos.x += Math.sin(t * 0.15) * 0.5; pos.z += Math.cos(t * 0.13) * 0.5; } // a resting frame still breathes
  }

  /* ---------- post: bloom only on what emits light, then grade ---------- */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  if (high) composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.6, 0.4, 1));
  composer.addPass(new OutputPass());
  const grade = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2() }, uFade: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform float uTime, uFade; uniform vec2 uRes; varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){
        vec3 c = texture2D(tDiffuse, vUv).rgb;
        vec2 d = vUv - .5;
        c *= smoothstep(1.05, .25, length(d * vec2(1., .9)));
        c += (hash(vUv * uRes + fract(uTime) * 61.) - .5) * .045;
        gl_FragColor = vec4(c * uFade, 1.);
      }`,
  });
  composer.addPass(grade);

  let dirty = true;
  function resize() {
    camera.aspect = innerWidth / innerHeight;
    camera.fov = narrow() ? 58 : 40;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(innerWidth, innerHeight);
    grade.uniforms.uRes.value.set(innerWidth, innerHeight).multiplyScalar(renderer.getPixelRatio());
    logo.setPixelRatio(renderer.getPixelRatio());
    measure();
    placeLogo();
    dirty = true;
  }

  /* ---------- state ---------- */
  const pointer = new THREE.Vector2(), sway = new THREE.Vector2();
  let intro = reduce ? END : 0, introDone = reduce, fade = reduce ? 1 : 0, clock = 0;
  addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    pointer.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    dirty = true;
  }, { passive: true });
  addEventListener('scroll', () => { dirty = true; }, { passive: true });
  addEventListener('resize', resize);
  resize();

  function finishIntro() {
    if (introDone) return;
    introDone = true;
    intro = END;
    document.body.classList.remove('intro');
    document.body.classList.add('live');
    measure();
  }
  $('[data-skip]').addEventListener('click', finishIntro);
  addEventListener('keydown', e => { if (e.key === 'Escape') finishIntro(); });

  /* ---------- frame ---------- */
  const pos = V(), look = V();
  let prev = performance.now();
  function frame(forced) {
    const now = performance.now();
    const dt = forced ?? Math.min((now - prev) / 1000, 1 / 20);
    prev = now;
    if (reduce && !dirty) return;
    dirty = false;
    clock += reduce ? 0 : dt;
    const t = reduce ? 6 : clock;

    if (!introDone) {
      intro += dt;
      fade = Math.min(fade + dt * 0.7, 1);
      if (intro >= END) finishIntro();
    } else fade = 1;
    const it = introDone ? END : intro;

    // the floodlights come on as the badge lets the ball go
    world.setLights(introDone ? 99 : it - DISSOLVE + 0.1);

    // badge and ball
    logo.group.visible = !introDone;
    if (it < DROP) { logo.update(it, introDone ? sway.set(0, 0) : pointer, ballPos); ballFrom.copy(ballPos); }
    else { if (!introDone) logo.update(it, pointer, tmpB); ballFlight(it, ballPos); }
    if (introDone) ballPos.copy(CENTER);
    ball.position.copy(ballPos);
    // the badge's big ball shrinks to a real one on the way down
    const size = BALL_SIZE + (BALL_R - BALL_SIZE) * ss(DROP, DROP + FLY * 0.9, it);
    ball.scale.setScalar(size / BALL_R);
    const moved = ballPos.distanceTo(lastBall);
    if (moved > 1e-4 && moved < 3) ball.rotateOnWorldAxis(spin, moved / size);
    else if (!introDone && it < DROP) ball.rotation.y += dt * 0.6;
    lastBall.copy(ballPos);

    if (!introDone) introPose(it, pos, look);
    else {
      scrollPose(scrollY, t, pos, look);
      sway.lerp(pointer, 1 - Math.exp(-3 * dt));
      tmpA.subVectors(look, pos).normalize();
      tmpB.crossVectors(tmpA, camera.up).normalize();
      pos.addScaledVector(tmpB, sway.x * 0.6).addScaledVector(camera.up, sway.y * 0.35);
    }
    camera.position.copy(pos);
    camera.lookAt(look);

    world.update(t, { camera, ball: ballPos, focus: introDone ? look : CENTER });
    grade.uniforms.uTime.value = t;
    grade.uniforms.uFade.value = fade;
    composer.render(dt);
  }

  // test hook: stop the loop and drive time by hand (software GL is too slow for real time)
  if (location.hash === '#debug') window.__arena = {
    stop() { renderer.setAnimationLoop(null); },
    step(n = 1, dt = 1 / 30) { for (let i = 0; i < n; i++) { dirty = true; frame(dt); } },
    at(s) { intro = s; fade = 1; dirty = true; frame(0); },
    skip: finishIntro,
    get intro() { return intro; },
  };

  setLoad(0.95);
  frame(0);
  await finishLoad();
  document.body.classList.add(introDone ? 'live' : 'intro');
  prev = performance.now();
  renderer.setAnimationLoop(() => frame());
}
