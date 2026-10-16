---
title: Showreel em código
date: 2026-10-16
tags: [pratica, motion, video]
---

# Showreel em código

Vídeo de 15 s ([showreel/](../showreel/)) feito só com canvas 2D e música sintetizada em numpy.

- **A música manda no corte.** 128 BPM × 8 compassos = 15,0 s exatos; cada cena dura 1 compasso e todo corte cai num tempo forte.
- **Match cut** liga as cenas: a bola vira o fundo laranja, a cortina da intro volta no final em acento.
- **Motion blur** = média de 4 sub-quadros num obturador de 180°; dá peso às entradas expo-out.
- As regras do site valem no vídeo: 2 famílias, 3 neutros + 1 acento, metadados nos cantos, reveal por linha com máscara.
- Uma cena de silêncio ("Pausa.", 44px no meio do vazio) dá contraste ao ritmo.

Related: [Movimento](regras/movimento.md) · [Tipografia](regras/tipografia.md) · [Cor e paleta](regras/cor-e-paleta.md)
