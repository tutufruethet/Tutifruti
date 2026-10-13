---
name: planejar-depurar-revisar
description: Use quando for planejar uma tarefa de várias etapas, quando aparecer bug, teste falhando ou comportamento inesperado, antes de afirmar que algo está pronto ou funcionando, e antes de commitar ou entregar trabalho de web, design ou 3D.
---

# Planejar, depurar, testar e revisar

**Evidência antes de afirmação.** Nada está "pronto", "corrigido" ou "passando" sem um comando rodado nesta mensagem cuja saída prova isso.

Baseado no método do Superpowers (obra/superpowers, MIT) e na verificação em camadas do `react-three-examples` (MIT), adaptado a sites e cenas 3D.

## Quando usar
- Tarefa com mais de 3 passos ou mais de um arquivo.
- Qualquer bug, falha de teste, tela errada, cena preta ou travada.
- Antes de dizer "pronto", de commitar, de abrir PR, de entregar.

## 1. Entender antes de construir
- Pergunte a si: **o que eu sei de fato** sobre o que a pessoa quer e por quê? Se tudo que importa está no pedido, faça. Se falta algo que muda o resultado, pergunte uma coisa de cada vez.
- Escreva o que é **não-objetivo** e o que seria **fracasso mesmo funcionando**.

## 2. Plano
- Mapa de arquivos primeiro: cada arquivo com uma responsabilidade.
- Tarefas pequenas, cada uma com entrega testável e o comando que prova.
- **Foco de revisão:** liste as 5 entradas ou situações que o pedido implica e que nenhum teste óbvio cobre (URL corrompida, storage cheio, sem WebGL, tela de 320px, teclado só) e cubra cada uma.

## 3. Testes
- Lógica: **vermelho → verde → refatorar.** Escreva o teste, veja falhar pelo motivo certo, escreva o mínimo, veja passar.
- **Cada teste nomeia a quebra que pega.** Valores esperados são literais calculados à mão, nunca recalculados pela função testada.
- Teste comportamento, não texto do código; teste o seu contrato, não o framework.
- Espere por **condição**, não por tempo (`waitForFunction(() => window.__app?.ready)`, não `sleep(2000)`).
- Aleatório estável (hash do id ou semente) para o screenshot ser reprodutível.

## 4. Verificação de páginas e cenas (em camadas)
Receitas Playwright em [references/verificacao-web.md](references/verificacao-web.md). Scripts e prints ficam **no scratchpad**, nunca no repositório (regra da casa).

| Camada | O que prova | Pega |
|---|---|---|
| Unidade (`node --test`) | regras puras | preço, limites, URL, agenda |
| Fumaça | `ready` sinalizado, console limpo, canvas não-preto | erro de import, shader quebrado |
| Animação | 2 screenshots diferem > 100px e `frames` subiu | cena congelada sem erro |
| Repouso | `frames` para de subir parado | loop gastando bateria |
| Funcional | clicar cada controle e conferir DOM/URL/storage | botão sem efeito, estado perdido |
| Responsivo | 1440 e 375: sem scroll horizontal, alvos ≥ 44px | layout quebrado no celular |
| Acessibilidade | axe sem violações sérias, só teclado, foco visível, contraste | rótulo faltando, foco preso |
| Degradação | sem WebGL, reduced motion, sem storage | tela branca, animação forçada |
| **Olho** | olhar os screenshots | o que todas as anteriores deixam passar |

## 5. Depuração sistemática
1. **Causa raiz antes de correção.** Leia o erro inteiro, reproduza, veja o que mudou (`git diff`).
2. **Em sistema com camadas** (estado → UI → cena → GPU), instrumente cada fronteira uma vez e descubra **onde** quebra antes de mexer.
3. Compare com um exemplo que funciona; liste todas as diferenças.
4. **Uma hipótese, uma mudança.** "Acho que X porque Y"; mude só isso; confira.
5. **Três correções falharam → pare** e questione a arquitetura, não tente a quarta.
6. Sinais de que está chutando: "deve ser", "vou tentar mudar", várias mudanças de uma vez, "depois eu testo".

## 6. Revisão antes de entregar
- Releia o próprio diff como adversário: o que faria isto falhar no celular, sem rede, sem WebGL, com teclado?
- Duas passadas: **cumpre o pedido?** (linha a linha) e depois **qualidade** (nomes, duplicação, acoplamento).
- Ao receber revisão: confira no código antes de aceitar; discorde com razão técnica; sem "você tem toda razão!".
- Relate o que passou **e o que não passou ou não foi testado**, com a saída.

## Portão antes de afirmar
```
1. Qual comando prova a afirmação?
2. Rodei agora, completo?
3. Li a saída inteira (código de saída, número de falhas)?
4. A saída confirma? Se não, digo o estado real.
5. Só então afirmo — com a evidência.
```

## Critérios de qualidade
- [ ] Plano com mapa de arquivos e foco de revisão antes do código (tarefas > 3 passos).
- [ ] Testes de lógica com valores literais, vistos falhando antes de passar.
- [ ] Todas as camadas da tabela rodadas, ou a ausência declarada no relatório.
- [ ] Screenshots de 1440 e 375 olhados de verdade.
- [ ] Relatório final com o que passou, o que falhou e as limitações.

## Referências
- [references/verificacao-web.md](references/verificacao-web.md): Playwright para fumaça, animação, repouso, responsivo, axe, sem WebGL, reduced motion.
- Estudo: [Superpowers](../../../estudo/referencias/superpowers.md) · [react-three-examples](../../../estudo/referencias/react-three-examples.md) · [Checklist de entrega](../../../estudo/checklist-de-entrega.md).
