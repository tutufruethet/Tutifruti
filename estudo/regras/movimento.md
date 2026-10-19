---
title: Movimento
date: 2026-10-10
tags: [regra, motion]
---

# Movimento

1. **Um easing só, com assinatura:** expo-out `cubic-bezier(.16,1,.3,1)`.
2. **Durações:** entradas de 0,9–1,2s; stagger de 60–90ms entre itens.
3. **Texto revelado por linha, com máscara:** `.line{overflow:hidden}` + `span{transform:translateY(110%)}` → `none`. Padding inferior ~0,16em para não cortar descendentes (g, p).
4. **Cursor e hover com lerp** de 0,08–0,2, nunca colados ao mouse.
5. **Scroll conta história:** palavras que acendem conforme o scroll, parallax leve, elementos sticky (Locomotive Scroll / GSAP).
6. **Linear só no marquee.**
7. **Parallax por atributo:** um número de velocidade por elemento (`progresso × janela × velocidade`), como o `data-scroll-speed` da Locomotive. Para scroll suave, Lenis.
8. Gravar a **direção do scroll** numa variável CSS para o layout reagir (menu some ao descer, aparece ao subir).
9. **Texto que embaralha:** letras aleatórias que se resolvem na palavra certa, para UI em fonte mono (Active Theory).
10. Sempre respeitar `prefers-reduced-motion`.
11. **Vídeo que anda com o scroll (sequência de quadros):** seção alta com um canvas sticky; o scroll escolhe o quadro, o canvas persegue com lerp e mistura o quadro seguinte pela fração, então nunca "pula". Carregue do grosso ao fino (de 16 em 16, depois 8, 4, 2, 1) e desenhe o quadro mais próximo que já chegou. Um conjunto em pé para o celular ([Não Codei](../referencias/nao-codei.md), [Vilubre ton de](../vilubre.md)).
12. **Odômetro para números:** fita de dígitos 0–9 duas vezes, rolando até `10 + dígito` com stagger por casa.

Related: [Locomotive](../referencias/locomotive.md) · [Bolt: backgrounds interativos](../referencias/bolt-backgrounds-interativos.md) · [Performance](performance.md) · [Não Codei](../referencias/nao-codei.md)
