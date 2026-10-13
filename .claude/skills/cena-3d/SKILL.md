---
name: cena-3d
description: Use quando for criar, iluminar, texturizar ou otimizar uma cena 3D na web (three.js puro ou React Three Fiber), incluindo produto 3D, mundo navegável, personagem ou veículo com física, pós-processamento, ou quando uma cena estiver lenta, escura, "de plástico", com cor errada ou pesada no celular.
---

# Cena 3D: modelagem, luz, materiais e ambiente

Na web, 3D bonito é **luz controlada + materiais honestos + poucas chamadas de desenho + um loop que dorme**. Modelo pesado raramente é a resposta.

Regras da casa: [Fundo vivo e 3D](../../../estudo/regras/fundo-vivo-e-3d.md), [Performance](../../../estudo/regras/performance.md), [Mundos e navegação](../../../estudo/regras/mundos-e-navegacao.md). **3D é herói ou não entra**; se for decoração, um shader 2D resolve.

## Quando usar
- Produto 3D, configurador, mundo, personagem/veículo com física, fundo 3D herói.
- Cena lenta, cor lavada ou estourada, sombra dura, "cara de plástico", celular esquentando.

## Quando não usar
- Fundo decorativo: shader 2D de tela cheia (ver regra da casa).
- Animação de UI: `movimento-e-microinteracoes`.

## Decisões de base (copie e ajuste)

| Item | Padrão | Por quê / de onde |
|---|---|---|
| Pixel ratio | `min(devicePixelRatio, 1.5–2)`; celular 1,5 | 42 exemplos pmndrs usam `dpr={[1, 2]}`, 20 usam `[1, 1.5]` |
| Antialias | ligado sem pós; **desligado** com pós (MSAA do compositor) | 23 exemplos com `antialias: false` + `multisampling` |
| Tone mapping | `NeutralToneMapping` para produto (cor fiel); ACES/AgX para drama | Khronos PBR Neutral foi feito para e-commerce |
| Saída | `outputColorSpace = SRGBColorSpace`; cores de UI em sRGB | r3f habilita `ColorManagement` |
| Câmera de produto | `fov` 15–35, longe do objeto (teleobjetiva, sem distorção) | Lusion connectors usa 17,5; galeria de produto 25–35 |
| Câmera geral | `fov` 45–50; `near`/`far` apertados | 52 exemplos com 50 |
| Fundo | cor sólida da paleta + `fog` da mesma cor | 80 exemplos definem `background`; 34 usam `fog` |

## Luz (receitas em [references/luz-e-materiais.md](references/luz-e-materiais.md))
1. **Ambiente primeiro.** Reflexo é o que faz material parecer real. `Environment preset="city"` é o mais usado (19 de 75); para controle total, um estúdio de **Lightformers** (retângulos/círculos emissivos dentro do environment) ou `RoomEnvironment` + PMREM no three puro.
2. **Uma luz-chave** (spot ou direcional) com sombra; o resto vem do ambiente.
3. **Sombra colorida, nunca preta.** Luz hemisférica com `groundColor` frio, ou cor de sombra nos presets de atmosfera (Bruno Simon).
4. **Brilho só no que emite.** Bloom com `threshold = 1`; materiais emissivos com cor > 1 e `toneMapped = false` (fluxo HDR, `bloom-hdr-workflow`).

## Sombra (da mais barata para a mais cara)
1. **Blob**: textura radial num plano sob o objeto (custo quase zero).
2. **ContactShadows** (27 exemplos): renderiza a profundidade de cima e borra.
3. **AccumulativeShadows + RandomizedLight** (21): sombra macia acumulada em N quadros; ótima para cena parada.
4. **Shadow map** real só na luz-chave: `mapSize` 1024, `bias` ≈ −0,0001; em cena estática, `BakeShadows` (para de atualizar).

## Materiais
- `MeshStandardMaterial` por padrão; `MeshPhysicalMaterial` quando precisa de `clearcoat` (calda, verniz), `sheen` (tecido, creme), `transmission` (vidro).
- `MeshTransmissionMaterial` e `MeshReflectorMaterial` são caros (amostras, resolução): use um por cena, como herói.
- **Compartilhe** geometria e material entre malhas iguais; crie fora do loop e fora do render.
- Detalhe barato: `CanvasTexture` gerada (ruído, waffle, pontilhado) como `map`, `bumpMap`, `roughnessMap` ou `alphaMap` + `alphaTest`.
- Atlas de paleta (Bruno Simon): muitos objetos, uma textura pequena de cores, UV escolhe a cor.

## Modelagem
- Procedural quando a forma é simples: `LatheGeometry` (casquinha, copo, vaso), esfera deslocada por ruído (comida, pedra), `ExtrudeGeometry` (logo).
- GLTF: passe pelo **gltfjsx** (`--transform`: Draco/Meshopt + texturas WebP/KTX2), `useGLTF.preload` (37 exemplos), `<Center>` para assentar no chão.
- Aleatório **estável**: derive de um hash do id (pmndrs `image-gallery`), não de `Math.random()`, para o layout ser o mesmo em todo carregamento e em todo teste.

## Performance (a arquitetura é a performance)
- Chamadas de desenho: algumas centenas no máximo. Repetiu? **Instancing** (`InstancedMesh` + `instanceColor`); em `InstancedBufferGeometry` defina o `boundingSphere` à mão para o frustum culling não sumir com tudo.
- **Não monte e desmonte** objetos caros: alterne `visible` (shaders recompilam).
- **Renderize sob demanda**: `frameloop="demand"` + `invalidate()` (r3f) ou um loop que dorme (vanilla). Pause fora da tela e com a aba escondida.
- Zero alocação no loop (`vec.set()` em vez de `new Vector3()`).
- Qualidade adaptativa: `PerformanceMonitor` (sobe/desce dpr), `performance.regress()` durante movimento, LOD com `<Detailed>`.
- Carregamento em camadas: `Suspense` com versão leve como fallback da pesada.

## React Three Fiber (detalhes em [references/r3f.md](references/r3f.md))
- `useFrame((state, delta) => …)` muta refs; **nunca `setState` no loop** nem em `onPointerMove`.
- Estado rápido em ref/`getState()`; estado lento (seleção, rota) em React. A **rota pode ser o estado da cena** (URL `/item/:id` move a câmera).
- `eventSource` no elemento raiz para HTML por cima e canvas dividirem eventos.
- Só objetos com handler entram no raycast; use `e.stopPropagation()` e `onPointerMissed`.

## Física e controle (Rapier / Ecctrl)
- Ponteiro como corpo cinemático (`setNextKinematicTranslation`) empurrando corpos dinâmicos (Lusion connectors).
- Gravidade zero + impulso para o centro (`-pos × 0,2`) = aglomerado vivo.
- Personagem: cápsula **flutuando** numa mola-amortecedor sobre um raio até o chão (`springK`, `dampingC`), impulso proporcional à massa, corpo dormindo não processa.
- Correção de taxa: multiplique impulsos por `60 × timestep`. Câmera lenta: pause o mundo e avance passos à mão.

## Acessibilidade e alternativa
- Sem WebGL: a página continua útil (imagem ou SVG com o mesmo estado).
- Canvas interativo: foco por teclado, `aria-label` que descreve o que está na cena, e o mesmo controle disponível em HTML.
- Reduced motion: sem giro automático; estado final direto.

## Critérios de qualidade
- [ ] Silhueta e material leem bem num screenshot parado (sem depender de movimento).
- [ ] Cor fiel à paleta (tone mapping escolhido de propósito) e sombra colorida/macia.
- [ ] Draw calls e triângulos conhecidos (`renderer.info`), repetições instanciadas.
- [ ] Loop dorme em repouso; pausa fora da tela; `dpr` limitado; nenhum `new` no loop.
- [ ] Sem WebGL e com reduced motion a página funciona.
- [ ] Gancho de teste: `window.__app = { ready, frames, … }` para os testes de fumaça e de animação (`planejar-depurar-revisar`).

## Referências
- [references/luz-e-materiais.md](references/luz-e-materiais.md): receitas de estúdio, sombra blob, calda com `alphaMap`, granulado instanciado.
- [references/r3f.md](references/r3f.md): padrões de React Three Fiber e equivalentes em three puro.
- Estudo: [React Three Fiber](../../../estudo/referencias/react-three-fiber.md) · [pmndrs/examples](../../../estudo/referencias/pmndrs-examples.md) · [react-three-examples](../../../estudo/referencias/react-three-examples.md) · [Ecctrl](../../../estudo/referencias/ecctrl.md) · [Bruno Simon](../../../estudo/referencias/bruno-simon.md).
