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
11. **Vídeo tocado pela rolagem:** quadros WebP num canvas dentro de uma seção sticky; a rolagem escolhe o quadro e um `lerp` suaviza. É o efeito que o usuário mais pede ([Maison Odile](../referencias/maison-odile.md)).

Related: [Maison Odile](../referencias/maison-odile.md) · [Locomotive](../referencias/locomotive.md) · [Bolt: backgrounds interativos](../referencias/bolt-backgrounds-interativos.md) · [Performance](performance.md)
