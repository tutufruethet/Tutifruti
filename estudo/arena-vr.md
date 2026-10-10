---
title: Arena VR (passagem)
date: 2026-10-10
tags: [pratica, 3d, webgl]
---

# Arena VR (passagem)

Landing de uma arena de realidade virtual no Janga (Paulista, PE), em [arena/index.html](../arena/index.html). Referência do usuário: `vr-arena-janga-recriado-4.vercel.app` (a rede do ambiente bloqueou o acesso; o site foi feito a partir do conceito).

**Conceito (duas direções, escolhida a B):** A) corredor holográfico desde o início; B) **passagem**: começa no mundo real (papel, óculos VR em 3D) e o scroll mergulha no visor, que já é a arena virtual.

| Parte | Técnica | De onde veio |
|---|---|---|
| Transição | O visor é um **portal em espaço de tela**: amostra a textura da arena com `gl_FragCoord / resolução`. Quando a câmera chega perto, o visor cobre a tela e já é a arena; a troca de cena não tem corte. Um tranco de RGB marca a passagem. | [Active Theory](referencias/active-theory.md) |
| Óculos | Feitos no código: `ExtrudeGeometry` com retângulo arredondado e bevel, espuma com furo, alças em toro, um LED no acento. Reflexo por uma "sala de softbox" mínima no `PMREMGenerator`. | [Bruno Simon](referencias/bruno-simon.md) |
| Enquadramento | Projeção deslocada (`projectionMatrix.elements[8/9]`) põe os óculos fora do centro sem mexer na câmera; o deslocamento vai a zero durante o mergulho. | [Grid e espaço](regras/grid-e-espaco.md) |
| Arena | Chão em grade infinita (shader em coordenadas de mundo), anel de varredura saindo do holograma, cursor acende o chão, corredor de portais com `mod`, poeira. Linhas em HDR, bloom com threshold 1. | [Fundo vivo e 3D](regras/fundo-vivo-e-3d.md) |
| Conteúdo no mundo | Passar o mouse numa experiência troca o holograma da arena (no toque, a linha no centro da tela). | [Mundos e navegação](regras/mundos-e-navegacao.md) |
| Dois caminhos | Menu e "Pular para as experiências" saltam o mergulho. | [Mundos e navegação](regras/mundos-e-navegacao.md) |
| Paleta | Tinta, papel, cinza e lima `#cdff3a`; névoa e sombra em azul-violeta. | [Cor e paleta](regras/cor-e-paleta.md) |

## Lições do projeto
- **3D com foco:** fora da seção que usa o holograma, ele e o chão apagam para ~15%. Sem isso, o acento brilha atrás de todo texto e deixa de ser acento.
- **Opacidade em dois lugares briga:** o `data-fade` (opacidade 1) anulava o fade do scroll no mesmo elemento. Um efeito por elemento; o outro vai num wrapper.
- **Teste:** o `hover` do Playwright rola a página até o elemento; tire os prints de outras seções sem hover. O gancho `#debug` (`stop()` e `step(n)`) segue indispensável no renderizador por software.
- **Cor do texto no `body`, não só no `html`:** ao abrir a página dentro do app do Claude, o estilo padrão do app pintou o texto de preto sobre o fundo escuro (correção do usuário). Defina `color` e `color-scheme` explícitos no `body` e no `:root`.
- O Three.js vendorizado em `mundo/vendor` é reaproveitado por import map; nada de cópia nova.

Related: [Ilha 3D](mundo-3d.md) · [Mundos e navegação](regras/mundos-e-navegacao.md) · [Fundo vivo e 3D](regras/fundo-vivo-e-3d.md) · [Checklist de entrega](checklist-de-entrega.md)
