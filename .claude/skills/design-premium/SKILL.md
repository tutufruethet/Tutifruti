---
name: design-premium
description: Use quando for criar ou redesenhar qualquer interface visual (landing page, portfólio, loja, app, dashboard, página de produto) ou quando um design estiver com cara de template, de "página feita por IA" ou sem personalidade.
---

# Design premium e não genérico

Design premium é **escolha específica do assunto, executada com disciplina**. A ousadia fica em um lugar só; o resto é quieto e correto.

As regras da casa em [estudo/regras/](../../../estudo/README.md) valem mais que esta skill (ver `CLAUDE.md`). Esta skill acrescenta o **processo** e a **calibração** contra o genérico.

## Quando usar
- Qualquer tela nova, ou redesenho de uma existente.
- Quando o pedido não diz qual é o assunto, o público ou o trabalho principal da página.
- Quando o resultado "parece bonito" mas poderia ser de qualquer marca.

## Quando não usar
- Ajuste pontual que o pedido já define ("muda o botão para azul"): faça e diga o que fez.
- Movimento e 3D têm skills próprias: `movimento-e-microinteracoes` e `cena-3d`.

## Processo em duas passadas

1. **Ancore no assunto.** Escreva em uma linha: o que é, para quem e qual o trabalho principal da página. Liste materiais, objetos, lugares e vocabulário do mundo do assunto. As escolhas visuais saem daí (uma gelateria tem letreiro pintado, balcão, casquinha; um painel financeiro tem densidade e números tabulares).
2. **Plano de tokens** (antes do código), no formato de [references/plano-de-design.md](references/plano-de-design.md):
   - Cor: 4–6 valores nomeados em hex (na casa: 3 neutros + 1 acento).
   - Tipo: famílias e papéis (no máximo 2 famílias e 4 estilos).
   - Layout: conceito em uma frase + wireframe ASCII; compare duas opções e escolha.
   - Princípios: 3 frases sobre o que torna esta página única.
3. **Teste do genérico.** Para cada item do plano, pergunte: "com um briefing parecido, eu chegaria no mesmo lugar?". Se sim, revise e anote o que mudou e por quê. Use a tabela de sinais abaixo.
4. **Construa** seguindo o plano revisado.
5. **Critique com screenshot** em 1440px e 375px, **de cada estado** (vazio, cheio, erro, diálogo aberto, outra opção escolhida), não só o padrão. Tire um acessório antes de sair (Chanel): corte a decoração que não serve ao assunto.

## Sinais de página genérica (calibração)

São escolhas legítimas quando o briefing pede; viram problema quando aparecem por padrão.

| Sinal | Por que denuncia | Em vez disso |
|---|---|---|
| Fundo creme (~`#F4F1EA`) + serifa display + acento terracota | Paleta padrão de páginas geradas | Derive a paleta dos materiais do assunto |
| Fundo quase preto + um acento ácido (verde-limão, vermelhão) | Idem; inclui o "preto tingido" `#0b0b0b` no lugar do preto | Idem; se for escuro, justifique pelo assunto |
| Cards idênticos arredondados com a mesma sombra `rgba(0,0,0,.1)` | Kit SaaS; nenhuma hierarquia | Linhas, listas, superfícies planas; raio varia com a hierarquia |
| Rótulo em CAIXA ALTA espaçada acima de cada título | Cromo de template | Só quando o rótulo carrega informação |
| Marcadores `01 / 02 / 03` | Só fazem sentido em sequência real | Numere passos, linha do tempo, ordem de montagem |
| Metadados com ponto médio `A · B · C` e "PALAVRA — fragmento" | Cromo de template | Frase normal ou tabela |
| Uma palavra do título em itálico/cor diferente | O tique tipográfico mais comum | O título inteiro como objeto tipográfico |
| `→` no fim de todo botão e link | Cromo de template | O verbo da ação já diz para onde vai |
| Fonte mono para rótulos pequenos | Cromo de template | Mono só para código ou dado técnico |
| Fade-and-slide-up em cada seção | Lê como gerado | Um momento orquestrado; movimento que responde à ação |
| Gradiente roxo→azul, glassmorphism sem motivo | Decoração genérica | Cor do assunto; efeito só se o material for vidro |

## Regras curtas

**Tipografia**
- A tipografia carrega a personalidade. Escolha famílias pelo assunto, não pelo hábito (Inter, Instrument, Space Grotesk, Fraunces são hábitos).
- Escala com razão fixa para corpo e UI (×1,2 a ×1,25); o display fica fora da escala, de propósito.
- Linhas com menos de 80 caracteres; serifa pede entrelinha um pouco maior.
- Números de preço e tabela com `font-variant-numeric: tabular-nums`.

**Cor**
- Hierarquia por valor (claro/escuro) e opacidade, não por cores novas.
- O acento aparece pouco: ação principal e estado selecionado.
- Cores do produto (fotos, sabores, modelos 3D) são conteúdo, não paleta de UI.
- Contraste: texto ≥ 4,5:1; texto grande e bordas de controle ≥ 3:1. Meça (ver `planejar-depurar-revisar`).

**Layout**
- Estrutura visual é informação: borda, número, divisor e rótulo precisam codificar algo do conteúdo.
- Alinhe à esquerda por padrão; assimetria com intenção; espaço vazio de verdade.
- No celular a hierarquia continua; a coisa mais importante continua primeiro.
- Cuidado com especificidade de CSS: classes de seção e de componente que se anulam (padding/margin) são o bug mais comum.

**Texto (copy)**
- Palavras existem para ajudar a entender e usar. Do ponto de vista de quem usa, em voz ativa.
- O botão diz o que acontece ("Reservar retirada", não "Enviar"); a confirmação usa o mesmo verbo ("Retirada reservada").
- Erro explica o que houve e como resolver, sem pedir desculpas. Estado vazio convida a agir.
- Conteúdo real do assunto desde o início; lorem ipsum esconde problemas de layout.
- **Texto dinâmico em português concorda** com o que muda: "Monte a sua casquinha" vira "Monte o seu copinho", "Sua casquinha" vira "Seu copinho". Erro achado só no print do 2º estado.

## Piso de qualidade (cumprir sem anunciar)
- Funciona em 375px sem scroll horizontal; alvos de toque ≥ 44px.
- Foco de teclado visível em tudo que é clicável; ordem de tab lógica.
- `prefers-reduced-motion` respeitado.
- HTML semântico (`button` para ação, `a` para navegação, `label` em todo campo).
- Fontes auto-hospedadas ou com `font-display: swap` e fallback métrico parecido.

## Critérios de qualidade (passa ou não passa)
- [ ] Assunto, público e trabalho principal escritos em uma linha antes do código.
- [ ] Plano de tokens existe e passou pelo teste do genérico (com o que mudou anotado).
- [ ] Hierarquia legível em 3 segundos no screenshot de 1440 e de 375.
- [ ] Nenhum sinal da tabela sem justificativa escrita.
- [ ] Ousadia concentrada em um elemento; o resto disciplinado.
- [ ] Contraste medido, foco visível, sem scroll horizontal.
- [ ] Copy com verbos consistentes entre botão, status e confirmação; texto dinâmico concordando.
- [ ] Título/herói não fica coberto pelo 3D: ou o 3D desvia (`setViewOffset`), ou o texto fica na frente.
- [ ] [Checklist de entrega](../../../estudo/checklist-de-entrega.md) da casa passou.

## Referências
- [references/plano-de-design.md](references/plano-de-design.md): modelo de plano + exemplo real (Gelateria).
- Estudo: [Frontend Design (Anthropic)](../../../estudo/referencias/frontend-design.md) · [regras da casa](../../../estudo/README.md).
- Prova: [gelateria/](../../../gelateria/index.html) e a nota [Gelateria](../../../estudo/gelateria.md).
