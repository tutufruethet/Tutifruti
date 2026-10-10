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
| Three.js character animation (exemplos oficiais) | `AnimationMixer` + `crossFadeTo` entre clipes de um `.glb` com esqueleto. |

## Lições
- **Personagem bonito não se modela no código.** Monta-se em ferramenta (MakeHuman/Blender), exporta-se `.glb` com esqueleto e animações, e o Three.js só toca e mistura os clipes. Era o erro do meu jogador feito de cápsulas.
- Animação = estados + transições suaves (fade de 0,2–0,3s), não poses calculadas à mão.
- Prédios e cidades procedurais saem bem em código: planta → andares → aberturas → telhado, repetido com variação (seed).
- Falta para usar no site: `GLTFLoader` (não está vendorizado ainda) e um `.glb` CC0 com rig e animação de chute.

Related: [VR Arena](../arena.md) · [Bruno Simon](bruno-simon.md) · [Fundo vivo e 3D](../regras/fundo-vivo-e-3d.md)
