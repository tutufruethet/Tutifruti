# Luz e materiais: receitas testadas

Testadas na [Gelateria](../../../../gelateria/index.html) (three r170, sem build). Código completo em `gelateria/js/cena.js` e `gelateria/js/geometrias.js`.

## Estúdio de produto em 10 linhas (three puro)

```js
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, movel ? 1.5 : 2));
renderer.toneMapping = THREE.NeutralToneMapping;     // cor do produto fiel à paleta
renderer.setClearColor(0x000000, 0);                 // fundo é o CSS da página: costura perfeita

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; // reflexos de estúdio
scene.environmentIntensity = 0.75;
pmrem.dispose();

const chave = new THREE.DirectionalLight('#fff0dc', 1.7); chave.position.set(-3, 5, 4);   // quente, de cima
const ceuChao = new THREE.HemisphereLight('#fff6ef', '#d77f8f', 0.6);                    // rebatida rosa = sombra colorida
const recorte = new THREE.DirectionalLight('#ffe3ea', 1.4); recorte.position.set(3, 2, -4); // contorno
```

No r3f: `<Environment preset="city" />` ou `<Environment><Lightformer form="rect" intensity={4} … /></Environment>` cumpre o papel do `RoomEnvironment`.

**Calibrar olhando:** cores claras (pistache, fior di latte) estouram primeiro. Baixe a luz-chave e a hemisférica antes de mexer na cor do material.

## Câmera que enquadra o conteúdo

```js
camera.fov = 24;                                     // teleobjetiva: produto sem distorção
const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
const dist = Math.max(alturaVista / (2 * tan), larguraVista / (2 * tan * camera.aspect));
camera.position.set(0, focoY + dist * 0.2, dist); camera.lookAt(0, focoY, 0);
// abrir espaço para o título à esquerda sem mexer na cena:
camera.setViewOffset(w, h, -w * 0.17, 0, w, h);
```

`alturaVista` vem do **alvo** do conteúdo (altura da pilha quando as bolas assentarem), amortecida com `damp`: a câmera afasta quando entra a 3ª bola e aproxima quando sai.

## Bola de gelato procedural (forma que lê como comida)

1. `IcosahedronGeometry(1, 22)` (16 no celular), apague `normal` e `uv`, **`mergeVertices`** (sem isso as normais ficam facetadas e aparece costura).
2. Desloque cada vértice pela direção: ruído fbm (ondas da colher) + `sin(11·ângulo)` fraco + **saia** gaussiana em `y ≈ −0,47` (a borda que a colher deixa).
3. Achate o fundo (`y < −0,6` → comprime) para assentar na casquinha.
4. `computeVertexNormals()`.
5. Material: `MeshPhysicalMaterial({ roughness: .6, sheen: .35, sheenColor: cor clareada })`: o *sheen* dá o aspecto cremoso sem brilho de plástico.
6. Pintas (lascas, pedaços de fruta): `InstancedMesh` de icosaedros achatados, orientados pela normal da superfície, com **semente por sabor** (mesmo layout sempre).

## Casquinha e copinho: torno

`LatheGeometry` a partir de um perfil 2D (ponta → borda enrolada → parede interna). Waffle = `CanvasTexture` com grade diagonal usada como `map` **e** `bumpMap` (`bumpScale` ≈ 2). Copinho = listras numa textura de 256×16 com `RepeatWrapping`.

## Coberturas

- **Granulado:** um `InstancedMesh` de `CapsuleGeometry`, 120 instâncias, `setColorAt` com a paleta; deitado na superfície (`setFromUnitVectors(up, normal)` + 90° + giro aleatório estável).
- **Calda:** clone da geometria da bola; acima de um limite ondulado por ângulo (`0,2 − 0,5·max(0, sin 5a)³ …`) o vértice vai para 1,035 do raio, abaixo dele para 0,9 (some dentro). Material `MeshPhysicalMaterial({ color: '#3b1c11', roughness: .16, clearcoat: 1 })`. Escorridos sem textura e sem UV.
- Alternar com `visible`, nunca montar/desmontar.

## Sombra blob

`PlaneGeometry(1,1)` deitado, textura com gradiente radial na cor da tinta (`rgba(43,24,16,.55) → 0`), `transparent`, `depthWrite: false`, `toneMapped: false`. Escala e altura amortecidas por base (casquinha: estreita, na ponta; copinho: larga, no fundo).

## Pré-compilar materiais

```js
const vitrine = new THREE.Group();
for (const sabor of SABORES) vitrine.add(new THREE.Mesh(geoBola, materiais[sabor.id]));
vitrine.position.y = -50; scene.add(vitrine);
renderer.compile(scene, camera);   // a 1ª bola de cada sabor não engasga
scene.remove(vitrine);
```

## Números da Gelateria (SwiftShader, Chromium headless)
- 6–9 chamadas de desenho; 24 mil triângulos no desktop, 14 mil no celular (3 bolas + granulado: 48 mil / 34 mil).
- 0 quadros em repouso; primeiro quadro 3D em ~0,35–0,8 s local; LCP (título) < 100 ms local.
