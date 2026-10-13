# React Three Fiber: padrões e equivalentes em three puro

Fonte: código e docs de `pmndrs/react-three-fiber` (v9/v10), `pmndrs/examples`, `pmndrs/react-three-examples` (todos MIT). Trechos curtos, reescritos.

## Como o r3f funciona (o que importa para decidir)
- **Reconciler**: JSX vira objetos three (`<mesh>` → `new THREE.Mesh`). Props viram atribuições (`position-x`, `material-color`, `attach="fog"`).
- **Loop** (`core/loop.ts`): um `requestAnimationFrame` global roda os `useFrame` de cada raiz e renderiza. Com `frameloop="demand"`, cada raiz tem um contador `frames`; `invalidate()` põe 1 (ou 2 se chamado dentro de um `useFrame`) e o loop **para sozinho** quando todos zeram.
- **Prioridade**: um `useFrame` com prioridade > 0 assume o render (você chama `gl.render`). Na v10 viraram fases: `input`, `physics`, `update`, `render`.
- **Eventos** (`core/events.ts`): raycast só contra objetos que têm handler; ordena por prioridade da raiz e distância; `stopPropagation` corta os de trás; clique só dispara se o objeto já estava sob o ponteiro no `pointerdown`.

## Padrões

```jsx
// Mutar no loop, com delta (nunca setState aqui)
const meshRef = useRef();
useFrame((state, delta) => { meshRef.current.rotation.y += delta * 0.5; });

// Ler estado rápido sem re-render
useFrame(() => { meshRef.current.position.x = useStore.getState().x; });

// Reusar objetos
const target = useMemo(() => new THREE.Vector3(), []);
useFrame((s, dt) => easing.damp3(s.camera.position, target.set(0, 1, 5), 0.4, dt));

// Esconder em vez de desmontar
<Stage1 visible={stage === 1} />

// Compartilhar geometria/material entre muitas malhas
const geom = useMemo(() => new THREE.SphereGeometry(1, 32, 32), []);
items.map((i) => <mesh key={i.id} geometry={geom} material={materials[i.flavor]} />);

// Sob demanda + controles que avisam
<Canvas frameloop="demand" dpr={[1, 1.5]}>
// drei: <OrbitControls /> já chama invalidate; controles próprios: addEventListener('change', invalidate)

// Começar animação sem salto no modo demand
onClick={() => { invalidate(); requestAnimationFrame(() => start()); }}

// Carregamento em camadas
<Suspense fallback={<Model url="/low.glb" />}><Model url="/high.glb" /></Suspense>

// Rota como estado da cena (pmndrs image-gallery)
const [, params] = useRoute('/item/:id');
useFrame((s, dt) => { easing.damp3(s.camera.position, p, 0.4, dt); easing.dampQ(s.camera.quaternion, q, 0.4, dt); });

// Qualidade adaptativa
<PerformanceMonitor onIncline={() => setDpr(2)} onDecline={() => setDpr(1)} flipflops={3} onFallback={() => setDpr(1)} />
```

## Convenções de código (react-three-examples, AGENTS.md)
1. **Controles junto de quem consome**: `useControls` (leva) no componente que usa o valor; nada de passar por props.
2. **Declarativo primeiro**: `<meshStandardMaterial />` como filho, não `useMemo(() => new Material())`. Exceção: uma instância **realmente** compartilhada por muitas malhas; aí `useMemo` + comentário `REVIEW(shared-instance)`.
3. **Não inventar recurso** que o pedido não tem; um controle só se ele explica uma constante.
4. **Tipos vêm dos elementos** (`ThreeElements['mesh']`); cast é sinal de lacuna, registre.
5. **Nomeie refs pelo conteúdo** (`boxRef`, não `ref`), para o erro no console dizer onde.
6. **Imports em hierarquia**: react > three > r3f > libs r3f > utilitários > pai > irmãos.
7. **Comentário curto, uma vez**; cabeçalho diz o que se vê e o que o exemplo ensina.
8. Divergência das regras nunca é silenciosa: ou corrige, ou registra numa fila de revisão.

## Equivalentes em three puro

| r3f / drei | three puro |
|---|---|
| `useFrame` | sua função `update(dt)` chamada no `tick` |
| `frameloop="demand"` + `invalidate()` | loop que dorme + `requestFrame()` (ver `movimento-e-microinteracoes/references/receitas.md`) |
| `dpr={[1, 1.5]}` | `renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))` |
| `<Environment preset>` / Lightformers | `RoomEnvironment` + `PMREMGenerator.fromScene(env, 0.04).texture` em `scene.environment` |
| `useLoader` / `useGLTF` (cache) | um `Map` de promessas por URL |
| `<Instances>` | `InstancedMesh` + `setMatrixAt` + `setColorAt` |
| `onPointerOver` em malha | `Raycaster` no `pointermove`, só contra a lista de interativos |
| `<Html>` | elemento absoluto posicionado por `vector.project(camera)` |
| `ContactShadows` | blob (textura radial) ou render de profundidade de cima + blur |

## Testes de cena (react-three-examples)
- **Fumaça**: a página sinaliza pronto (`window.__exampleReady`), o canvas não é preto, o console está limpo.
- **Animação**: dois screenshots com ~2s de intervalo; > 100 px diferentes (tolerância 4 por canal) e o contador de quadros subiu > 5. Pega cena congelada que o console não mostra.
- **Screenshot olhado por alguém**: os dois níveis acima passaram com um bug de tone mapping que só o olho pegou.
- **Um clique em cada controle**: o estado padrão só testa o primeiro estado.
- `@react-three/test-renderer` para testar o grafo e eventos sem GPU (`fireEvent`, `scene.children[0].allChildren`).
