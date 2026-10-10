---
title: Tia Gláucia (site acolhedor)
date: 2026-10-10
tags: [pratica, 3d, webgl, acessibilidade]
---

# Tia Gláucia (site acolhedor)

Site de reforço escolar em [tia-glaucia/index.html](../tia-glaucia/index.html). Público duplo: encantar a criança e passar segurança ao responsável.

| Parte | Técnica | Regra |
|---|---|---|
| Abertura | Livro aberto, letras (Fraunces) e números (Figtree) extrudados de contornos extraídos da fonte; o lápis escreve "abc" e "123" numa `CanvasTexture` da folha | [Fundo vivo e 3D](regras/fundo-vivo-e-3d.md) |
| Escrita à mão | Traços em SVG (M/L/C) amostrados em pontos; a ponta do lápis segue o ponto na folha curva (mesma função de altura da geometria) | [Movimento](regras/movimento.md) |
| Sombras | Chão invisível com `ShadowMaterial` lilás a 12%; o lápis projeta sombra na folha | [Fundo vivo e 3D](regras/fundo-vivo-e-3d.md) |
| Ícones | Renderizados uma vez com as mesmas peças 3D e salvos em WebP; no site, só flutuam em CSS | [Performance](regras/performance.md) |
| Jornada | Linha SVG desenhada pelo scroll, com lápis na ponta; passa só nos vãos entre colunas | [Movimento](regras/movimento.md) |
| Dados pendentes | Um `config.js`; campo entre colchetes vira etiqueta "Pendente" e nenhum link é criado | [Checklist de entrega](checklist-de-entrega.md) |

## Lições do projeto
- **Paleta com dois acentos suaves** (lilás + amarelo) funciona quando um manda (lilás nos objetos e destaques) e o outro só grifa (amarelo no "leve", marcos acesos). A regra 3 neutros + 1 acento cede ao briefing.
- **Algarismo "3" da Fraunces lê como ʒ em 3D**: números vieram de outra família (Figtree).
- **`window.open(url, '_blank', 'noopener')` sempre devolve `null`**: um fallback `if (!w) location.href = url` navega a página junto. Abrir sem a flag e zerar `w.opener`.
- **Revelar no scroll com IntersectionObserver falhou com a thread ocupada pelo WebGL**: elementos passavam sem disparar. Checar `getBoundingClientRect().top` num rAF do scroll é mais robusto (e revela o que ficou para trás).
- **Linha que liga etapas não pode cruzar o texto**: seguir na altura dos marcadores e trocar de nível no vão entre colunas.
- **Reserva do 3D**: imagem gerada da própria cena; aparece se não houver WebGL ou se o 3D demorar mais de 2,6 s (aí a cena entra já pronta, sem refazer a intro).

Related: [Ilha 3D](mundo-3d.md) · [Demo Tutifruti](demo-tutifruti.md) · [Erros que eu cometia](regras/erros-que-eu-cometia.md) · [Cor e paleta](regras/cor-e-paleta.md)
