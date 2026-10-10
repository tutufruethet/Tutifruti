---
title: Personagens, prédios e cidades
date: 2026-10-10
tags: [referencia, 3d, personagem, procedural]
---

# Personagens, prédios e cidades

Repositórios estudados (lidos em 2026-10-10).

| Repositório | O que ensina |
|---|---|
| [ranjian0/building_tools](https://github.com/ranjian0/building_tools) | Addon do Blender. O prédio é montado em etapas: **planta → andares → janelas/portas/varandas → telhado**, cada etapa recortando faces da anterior. A mesma ordem serve para um gerador em Three.js. |
| [makehumancommunity/makehuman](https://github.com/makehumancommunity/makehuman) | Gera humanos realistas já com esqueleto; os assets são **CC0** (pode usar em site comercial). O caminho é: MakeHuman → Blender → exportar `.glb` com rig. |
| [pmndrs/ecctrl](https://github.com/pmndrs/ecctrl) | Controle de personagem (React Three Fiber + Rapier). As animações são uma **máquina de estados** (parado, andando, correndo, pulando) que troca de clipe com fade. |
| [achrefelouafi/BuildingGeneratorThreeJS](https://github.com/achrefelouafi/BuildingGeneratorThreeJS) | Prédio de Hong Kong portado de nós do Blender: um **kit de ~190 peças** (paredes, janelas, ar-condicionado, varais, lojas) num único `kit.glb`, posicionadas por um gerador com **semente** (`hash(id, seed)`) e desenhadas com `InstancedMesh`. 18 parâmetros (andares, planta, probabilidades). |
| [lanmower/Procedural-Cities](https://github.com/lanmower/Procedural-Cities) | Cidade inteira: **ruas** crescem por fila de prioridade guiada por ruído (ramificam, se conectam); entre as ruas saem **lotes**; cada lote vira **planta** com recortes, apartamentos e escada; por fim a **fachada**. |
| [three.js: skinning blending](https://threejs.org/examples/#webgl_animation_skinning_blending) | `AnimationMixer` no modelo; cada clipe vira uma action; troca com `startAction.crossFadeTo(endAction, duração, true)` e `setEffectiveWeight` para misturar parado/andando/correndo. |

## Lições
- **Personagem bonito não se modela no código.** Monta-se em ferramenta (MakeHuman/Blender), exporta-se `.glb` com esqueleto e animações, e o Three.js só toca e mistura os clipes. Era o erro do meu jogador feito de cápsulas.
- Animação = estados + transições suaves (fade de 0,2–0,3s), não poses calculadas à mão.
- Prédios bonitos = **peças modeladas + regra de posicionamento com seed + instancing**, não caixas.
- Cidade = ruas → lotes → planta → fachada, cada etapa alimenta a próxima.
- Falta para usar no site: `GLTFLoader` (não está vendorizado ainda) e um `.glb` CC0 com rig e animação de chute.

Related: [VR Arena](../arena.md) · [Bruno Simon](bruno-simon.md) · [Fundo vivo e 3D](../regras/fundo-vivo-e-3d.md)
