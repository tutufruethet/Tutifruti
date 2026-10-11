import * as THREE from 'three';
import { NOISE } from './glsl.js';

// Céu de fundo: nebulosa com domain warping + poeira escura + estrelas, desenhado UMA vez num cubemap.
// Custa um frame na carga e zero depois (o shader caro nunca roda por quadro).
const VS = `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
const FS = /* glsl */`
uniform vec3 uA, uB, uC; uniform float uSeed, uGain;
varying vec3 vDir;
${NOISE}
float hash3(vec3 p){ p = fract(p * .3183099 + .1); p *= 17.; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
vec3 temp(float t){ // cor de estrela por temperatura: vermelha → branca → azul
  return t < .5 ? mix(vec3(1., .55, .3), vec3(1., .96, .9), t * 2.) : mix(vec3(1., .96, .9), vec3(.62, .75, 1.), (t - .5) * 2.);
}
vec3 stars(vec3 d, float scale, float density, float size){
  vec3 p = d * scale; vec3 c = floor(p); vec3 f = fract(p) - .5;
  float h = hash3(c + uSeed * 31.);
  if (h < 1. - density) return vec3(0.);
  vec3 o = vec3(hash3(c + 1.7), hash3(c + 4.1), hash3(c + 8.3)) - .5;
  float dd = length(f - o * .6);
  float b = pow(hash3(c + 2.9), 6.) * 3. + .25;
  return temp(hash3(c + 6.6)) * b * exp(-dd * dd * size);
}
void main(){
  vec3 d = normalize(vDir);
  vec3 p = d * 1.1 + uSeed * 11.;
  vec3 q = vec3(fbm(p), fbm(p + vec3(5.2, 1.3, 2.8)), fbm(p + vec3(1.7, 9.2, 4.4)));
  vec3 r = vec3(fbm(p * 1.2 + q * 1.2 + vec3(8.3, 2.8, 1.1)), fbm(p * 1.2 + q * 1.2 + vec3(3.1, 7.4, 5.5)), 0.);
  float n = fbm(p * .9 + r * 1.1);
  float band = exp(-pow(d.y * 2.2 + .3 * q.x, 2.));            // faixa principal, como uma via láctea
  float neb = smoothstep(-.2, .8, n) * (.25 + .9 * band);
  vec3 col = mix(uA, uB, smoothstep(-.4, .5, q.x));
  col = mix(col, uC, smoothstep(.0, .7, r.x));
  col = mix(col, col * 1.8 + .03, smoothstep(.5, .9, n));      // miolo mais claro das nuvens
  float dust = smoothstep(.05, .6, fbm(d * 2.6 + r * .8 + 3.)) * band;
  vec3 c = col * neb * (1. - dust * .75) * .5;
  c += stars(d, 260., .045, 220.) * (1. - dust * .7);
  c += stars(d, 90., .03, 120.) * 1.6 * (1. - dust * .5);
  c += stars(d, 600., .08, 300.) * .5 * (.4 + band);
  gl_FragColor = vec4(c * uGain, 1.);
}`;

export function makeSky(renderer, colors, seed, { size = 1024, octaves = 5, gain = 1 } = {}) {
  const rt = new THREE.WebGLCubeRenderTarget(size, { type: THREE.HalfFloatType, generateMipmaps: false });
  const scene = new THREE.Scene();
  const mat = new THREE.ShaderMaterial({
    vertexShader: VS, fragmentShader: FS, side: THREE.BackSide, depthWrite: false,
    defines: { OCTAVES: octaves },
    uniforms: {
      uA: { value: new THREE.Color(colors[0]) }, uB: { value: new THREE.Color(colors[1]) }, uC: { value: new THREE.Color(colors[2]) },
      uSeed: { value: seed }, uGain: { value: gain },
    },
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(5, 64, 32), mat);
  scene.add(mesh);
  const cam = new THREE.CubeCamera(0.1, 10, rt);
  cam.update(renderer, scene);
  mesh.geometry.dispose(); mat.dispose();
  return rt.texture;
}
