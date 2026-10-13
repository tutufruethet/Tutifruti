---
title: Estudo de design e 3D
date: 2026-10-10
tags: [design, 3d, indice]
---

# Estudo de design e 3D

Mapa das notas. Comece pelas **regras** quando for desenhar algo; volte às **referências** para entender o porquê de cada regra.

> [!NOTE]
> A rede do ambiente bloqueou o acesso direto aos 5 sites. As notas vêm de case studies, do repositório aberto do Bruno Simon e de análises tipográficas (Awwwards, Fonts In Use, Refero). Pontos marcados *(fonte antiga/terceiros)* podem estar desatualizados.

## Regras (use antes de desenhar)
- [Tipografia](regras/tipografia.md): famílias, escala, contraste serifa × grotesca.
- [Cor e paleta](regras/cor-e-paleta.md): 3 neutros + 1 acento.
- [Grid e espaço](regras/grid-e-espaco.md): 12 colunas, assimetria, metadados nos cantos.
- [Movimento](regras/movimento.md): easing, durações, reveal por linha, damp, mola, loop que dorme.
- [Fundo vivo e 3D](regras/fundo-vivo-e-3d.md): quando usar 3D e os truques baratos.
- [Performance](regras/performance.md): DPR, pausar fora da tela, reduced-motion.
- [Mundos e navegação](regras/mundos-e-navegacao.md): sites imersivos, cenas, dois caminhos de navegação.
- [Detalhes de acabamento](regras/detalhes-de-acabamento.md): loader, cursor, marquee, wordmark.
- [Erros que eu cometia](regras/erros-que-eu-cometia.md): o que evitar.
- [Checklist de entrega](checklist-de-entrega.md): conferir antes de entregar.

## Referências (o porquê)
- [Bolt: backgrounds interativos](referencias/bolt-backgrounds-interativos.md): fundo vivo em landing pages.
- [Lusion](referencias/lusion.md): 3D em tempo real como herói, tipografia mínima.
- [Bruno Simon](referencias/bruno-simon.md): portfólio que é um jogo; otimização de assets.
- [Locomotive](referencias/locomotive.md): design editorial, serifa × grotesca, scroll.
- [Instrument](referencias/instrument.md): sistema de design, escala fixa, conteúdo primeiro.
- [Resn](referencias/resn.md): conceito antes do código, duas direções, tipografia própria.
- [Active Theory](referencias/active-theory.md): mundos 3D, navegação por público, motor próprio.
- [Frontend Design (Anthropic)](referencias/frontend-design.md): processo em duas passadas e os sinais de página gerada.
- [Superpowers](referencias/superpowers.md): planejar, TDD, depuração sistemática, verificar antes de afirmar.
- [React Three Fiber](referencias/react-three-fiber.md): loop sob demanda, eventos, armadilhas de performance.
- [pmndrs/examples](referencias/pmndrs-examples.md): 199 exemplos contados; luz, sombra, material, scroll.
- [react-three-examples](referencias/react-three-examples.md): estilo de código r3f e verificação em camadas.
- [Ecctrl](referencias/ecctrl.md): personagem e veículo com física amortecida, curvas em tabela.

## Skills (o estudo virando processo)
Ficam em `.claude/skills/` e o Claude Code carrega sozinho quando o assunto aparece. Cada uma tem instruções, critérios de qualidade e referências com código testado.
- [design-premium](../.claude/skills/design-premium/SKILL.md): plano de tokens, teste do genérico, piso de qualidade.
- [movimento-e-microinteracoes](../.claude/skills/movimento-e-microinteracoes/SKILL.md): damp, mola, inércia, loop que dorme.
- [cena-3d](../.claude/skills/cena-3d/SKILL.md): luz, sombra, materiais, modelagem procedural, r3f.
- [arquitetura-e-qualidade](../.claude/skills/arquitetura-e-qualidade/SKILL.md): regras puras, estado na URL, storage seguro.
- [planejar-depurar-revisar](../.claude/skills/planejar-depurar-revisar/SKILL.md): plano, TDD, depuração, verificação em camadas.

## Prática
- [Demo Tutifruti](demo-tutifruti.md): landing page que aplica todas as regras.
- [Ilha 3D](mundo-3d.md): portfólio em dois níveis com mundo 3D dirigível (a prova real).
- [Gelateria](gelateria.md): montador 3D com reserva, feito para validar as skills (e o que os testes pegaram).
