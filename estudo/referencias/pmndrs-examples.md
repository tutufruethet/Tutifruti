---
title: pmndrs/examples
date: 2026-10-13
tags: [referencia, 3d, luz, material]
---

# pmndrs/examples

199 exemplos de r3f/drei em [pmndrs/examples](https://github.com/pmndrs/examples) (MIT). Contei padrões em todos e li de perto `lusion-connectors`, `image-gallery`, `baking-soft-shadows`, `selective-bloom`, `bloom-hdr-workflow-gltf`, `camera-scroll`, `horizontal-tiles`, `grass-shader`, `mount-transitions`.

## O que é comum (contagem nos 199)
| Padrão | Exemplos |
|---|---|
| `<Environment>` (75; `preset="city"` em 19) | luz por reflexo de ambiente é o padrão |
| `dpr={[1, 2]}` 42 · `[1, 1.5]` 20 | pixel ratio sempre limitado |
| `color attach="background"` 80 · `<fog>` 34 | fundo sólido da paleta + névoa da mesma cor |
| ContactShadows 27 · AccumulativeShadows 21 · BakeShadows 7 | sombra macia barata |
| `antialias: false` 23 | MSAA fica no compositor de pós |
| `easing.damp*` (maath) 23 | amortecimento independente de quadros |
| `useGLTF.preload` 37 | carregar antes de precisar |
| fov 50 (52), 35/25 (14 cada), 15 (6) | teleobjetiva para produto |

## Técnicas
- **Lusion connectors:** gravidade zero + impulso para o centro; ponteiro é um corpo cinemático; estúdio de `Lightformer`s; cor do acento trocada com `dampC`; fov 17,5.
- **Image gallery:** a **rota** (`/item/:id`) é o estado; a câmera faz `damp3`/`dampQ` até o quadro; aleatório **estável** por hash da URL (o teste de screenshot não varia).
- **Bloom HDR:** só brilha o que passa de 1 (`threshold 1`, cor emissiva > 1, `toneMapped={false}`).
- **Camera scroll:** a câmera é animada no Blender; o scroll só "raspa" a timeline.
- **Horizontal tiles:** `scroll.curve()` em sino deixa o item em foco maior e colorido; o resto em cinza.
- **Grass:** `InstancedBufferGeometry` precisa de `boundingSphere` manual para o culling.

**Lição:** realismo vem de ambiente + sombra macia + tone mapping, não de polígono.

Related: [React Three Fiber](react-three-fiber.md) · [Lusion](lusion.md) · [Fundo vivo e 3D](../regras/fundo-vivo-e-3d.md)
