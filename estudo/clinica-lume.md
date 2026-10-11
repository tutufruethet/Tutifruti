---
title: Clínica Lume
date: 2026-10-11
tags: [pratica, landing, agenda]
---

# Clínica Lume

Site de clínica (fictícia) em [clinica/index.html](../clinica/index.html): landing, apresentação, tratamentos, equipe, agenda, dúvidas e contato. Sem dependências; abra direto no navegador.

| Parte | Regra aplicada |
|---|---|
| Hero claro: shader de "membrana" em papel + verde, luz que segue o cursor, cores lidas das variáveis CSS (funciona no modo escuro) | [Fundo vivo e 3D](regras/fundo-vivo-e-3d.md) |
| "Pele que *respira.*": display gigante com uma palavra em serifa itálica no acento | [Tipografia](regras/tipografia.md) · [Cor e paleta](regras/cor-e-paleta.md) |
| Apresentação que acende palavra por palavra no scroll | [Movimento](regras/movimento.md) |
| Tratamentos em linhas finas; clicar leva à agenda com o tratamento escolhido | [Grid e espaço](regras/grid-e-espaco.md) |
| Agenda: seleção em tinta (neutro), acento só no botão; resumo fixo ao lado | [Cor e paleta](regras/cor-e-paleta.md) |
| Menu some ao descer e volta ao subir; "Aberto agora" pelo horário de São Paulo | [Movimento](regras/movimento.md) · [Detalhes de acabamento](regras/detalhes-de-acabamento.md) |

## Lições do projeto
- **Lista com rolagem horizontal dentro do grid estoura a página.** Item de grid e `fieldset` têm largura mínima igual ao conteúdo; uma fileira de dias com `overflow-x:auto` empurrou a página para 1.700px. Corrige com `min-width:0` no item do grid e no `fieldset`.
- **`style` inline vence o media query.** Coluna posicionada com `style="grid-column:7/9"` não virou 1 coluna no celular. Posição que muda por tela vai numa classe.
- **Uma regra de `transition` apaga a outra.** Linha com `data-fade` e transição própria perdeu o fade; junte as duas na mesma declaração.
- **Agenda sem backend:** o pedido sai como mensagem pronta no WhatsApp e arquivo `.ics`. Para reservar de verdade, falta um servidor (ou Cal.com, Google Agenda).

Related: [Demo Tutifruti](demo-tutifruti.md) · [Checklist de entrega](checklist-de-entrega.md) · [Grid e espaço](regras/grid-e-espaco.md)
