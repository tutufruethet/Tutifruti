---
title: Superpowers
date: 2026-10-13
tags: [referencia, processo, testes]
---

# Superpowers

Metodologia de desenvolvimento para agentes em [obra/superpowers](https://github.com/obra/superpowers) (MIT): 15 skills que disparam sozinhas.

| Skill | Ideia central |
|---|---|
| brainstorming | "O que eu sei de fato?" Pedido completo → faça. Falta algo → uma pergunta por vez, devolvendo o entendimento em blocos curtos |
| writing-plans | Mapa de arquivos primeiro; tarefas pequenas com o teste e o comando que provam; **foco de revisão**: 5 entradas que o pedido implica e nenhum teste cobre |
| test-driven-development | Vermelho → verde → refatorar. Viu falhar pelo motivo certo? Cada teste nomeia a quebra; expectativas literais, nunca recalculadas pela função testada |
| systematic-debugging | Sem correção antes da causa raiz; instrumentar cada fronteira; uma hipótese por vez; **3 correções falharam = questionar a arquitetura** |
| verification-before-completion | "Evidência antes de afirmação": rodar o comando agora, ler a saída inteira, só então dizer "passa" |
| requesting/receiving-code-review | Revisor com contexto preparado (não o histórico); receber revisão conferindo no código, sem "você tem toda razão!" |
| subagent-driven-development | Um subagente por tarefa + revisão em duas passadas: cumpre o pedido? depois, qualidade |
| writing-skills | Skill é TDD de documentação; a `description` diz **só quando usar** (resumir o processo faz o agente seguir o resumo e pular o corpo) |

## No código
- `condition-based-waiting.md`: esperar pela condição (`waitFor(() => …)`), nunca por tempo.
- `defense-in-depth.md`: validar em cada camada (entrada, regra, ambiente, log) torna o bug impossível, não só corrigido.
- `find-polluter.sh`: bissecção para achar o teste que suja o estado dos outros.

**Lição:** a qualidade vem do processo verificável, não da confiança.

Related: [Gelateria](../gelateria.md) · [react-three-examples](react-three-examples.md) · [Checklist de entrega](../checklist-de-entrega.md)
