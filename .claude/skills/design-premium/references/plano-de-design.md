# Plano de design: modelo e exemplo

Preencha antes de escrever código. Cabe numa tela.

## Modelo

```
Assunto ........ o que é, em uma linha
Público ........ quem usa e em que situação (celular na fila? desktop no trabalho?)
Trabalho ....... a única coisa que a página precisa fazer bem
Mundo .......... materiais, objetos, lugares, vocabulário do assunto

Cor (4–6, nomeadas)
  nome   #hex   papel (fundo, texto, ação, detalhe)

Tipo
  família A   papel (display / corpo / UI) e por que combina com o assunto
  família B   ...
  escala: razão ×1,2 a partir de 16px; display fora da escala

Layout
  opção 1: frase + ASCII
  opção 2: frase + ASCII
  escolhida: qual e por quê; alinhamento

Princípios (3)
  1. onde fica a ousadia
  2. que dispositivo estrutural carrega informação
  3. o que fica de fora

Teste do genérico
  item → "eu chegaria aqui com qualquer briefing parecido?" → o que mudei
```

## Exemplo real: Gelateria Tutifruti ([gelateria/](../../../../gelateria/index.html))

```
Assunto ........ gelateria de bairro; montar uma casquinha e reservar a retirada
Público ........ cliente no celular, a caminho ou na fila
Trabalho ....... escolher até 3 bolas e reservar um horário em menos de 1 minuto
Mundo .......... letreiro pintado à mão, quadro de preços com pontilhado,
                 casquinha de waffle, bola com a "saia" da colher, granulado

Cor
  cacau          #2b1810   texto e contornos (12,3:1 sobre o papel)
  morango-leite  #f6d5cd   fundo
  casquinha      #c8874a   pontilhado do quadro, divisores, casquinha 2D
  pistache       #7fae45   acento: ação principal e item escolhido (6,5:1 com cacau)
  (as cores dos sabores são conteúdo, só no 3D e nas amostras)

Tipo
  Shrikhand        display: tem a pincelada dos letreiros de sorveteria
  Atkinson Hyperlegible Next  corpo e UI: legível na rua, no sol, no celular
  escala ×1,2 a partir de 16px; display em clamp(3rem, 9vw, 8.5rem)

Layout
  opção 1: tudo empilhado, 3D no topo, painel embaixo
  opção 2: palco 3D grudado à esquerda (7 col) + quadro de pedido à direita (5 col)
  escolhida: 2 no desktop, 1 no celular com o palco reduzido no topo;
  alinhado à esquerda, o título invade o palco

  +------------------------------+-------------------+
  | Tutifruti          [3D]      | Base  (o) (o)     |
  |                              | Sabores           |
  |        casquinha             | ( ) Pistache ... 3|
  | Monte a sua                  | Sua casquinha     |
  | casquinha.                   | Total   [Reservar]|
  +------------------------------+-------------------+

Princípios
  1. A casquinha 3D é o herói e a interface: escolher um sabor faz a bola cair nela.
  2. Quadro de preços com pontilhado (dispositivo do próprio mundo, carrega o preço).
  3. Sem rótulo em caixa alta, sem 01/02/03, sem cards. A única numeração é a ordem
     das bolas (1ª, 2ª, 3ª), porque é uma sequência real.

Teste do genérico
  - fundo creme + serifa → trocado por rosa morango + letreiro, vindos do assunto
  - CTA em preto com seta → CTA em pistache com o verbo "Reservar retirada"
  - lista de sabores em cards → linhas de quadro de preços com pontilhado
```
