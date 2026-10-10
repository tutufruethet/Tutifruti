---
title: Active Theory
date: 2026-10-10
tags: [referencia, 3d, webgl, estudio]
---

# Active Theory

Estúdio de experiências em WebGL (Los Angeles e Amsterdã). A v4 do site foi Site of the Month no Awwwards (jan/2018).

| Aspecto | O que fazem |
|---|---|
| Framework | **Hydra**, criado pelo próprio estúdio: motor feito para **máximo de gráficos com pouca CPU**, com editor visual de cenas. |
| Performance | Tiram o máximo de código da thread principal para um **Web Worker**; renderer em **WebGL2 com fallback para WebGL1**. Terceiros medem LCP de ~1,3s no desktop. |
| Site v5 | Planejaram 3 ambientes 3D e fizeram **8**. As **transições entre cenas** viraram parte da diversão, e o site deixou de parecer repetitivo. |
| Peça central | Cada ambiente tem uma **tela gigante** passando o reel do estúdio. O conteúdo vive *dentro* do mundo 3D. |
| Lugares reais | Ambientes inspirados nos bairros dos escritórios (Abbot Kinney e Venice Beach, canais de Amsterdã). |
| Navegação por público | **Clientes** querem o trabalho rápido, então têm filtros claros por tipo de projeto. **Criativos e devs** querem a experiência, então ficam com a home imersiva e o reel. |

**Lições:**
- **Dois caminhos para dois públicos:** a experiência imersiva não pode esconder o portfólio de quem tem pressa.
- **Variedade de cenas** evita repetição; a transição é tão importante quanto a cena.
- **Conteúdo dentro do 3D** (a tela gigante) em vez de 3D como papel de parede.
- Ambientes tirados de **lugares reais da marca** dão identidade.
- Performance é arquitetura: worker, fallback e motor próprio.

Fontes: [Webby: Active Theory](https://www.webbyawards.com/crafted-with-code/active-theory/) · [Story of Technology](https://medium.com/active-theory/the-story-of-technology-built-at-active-theory-5d17ae0e3fb4) · [CommArts](https://www.commarts.com/webpicks/active-theory-1) · [v4 SOTM](https://www.awwwards.com/active-theory-v4-wins-january-2018-site-of-the-month.html) · [WebGPU.com showcase](https://www.webgpu.com/showcase/active-theory-portfolio/)

Related: [Mundos e navegação](../regras/mundos-e-navegacao.md) · [Performance](../regras/performance.md) · [Fundo vivo e 3D](../regras/fundo-vivo-e-3d.md) · [Resn](resn.md) · [Bruno Simon](bruno-simon.md)
