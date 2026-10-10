# Tia Gláucia · site

Site de apresentação da Tia Gláucia (reforço escolar). HTML, CSS e JavaScript puros, com Three.js vendorizado: não precisa de build.

## Como editar os dados
Tudo fica em [`js/config.js`](js/config.js):

| Campo | O que colocar |
|---|---|
| `WHATSAPP` | Só números com DDD, ex.: `11987654321` |
| `INSTAGRAM` | Link completo, ex.: `https://instagram.com/usuario` |
| `LOCAL_DE_ATENDIMENTO` | Bairro/cidade ou "online" |
| `MODALIDADE_E_SERIES` | Ex.: "Presencial, do 1º ao 5º ano" |
| `FOTO` | Caminho da foto, ex.: `img/tia-glaucia.jpg` |
| `BIOGRAFIA` | Um parágrafo por item |
| `SERVICOS` | Formas de apoio. Depois de confirmar com a professora, mude `SERVICOS_CONFIRMADOS` para `true` |

Enquanto um campo estiver entre colchetes (`[PREENCHER]`) ou vazio, o site mostra **Pendente** e não cria link nenhum. Sem número de WhatsApp, o formulário não finge envio: mostra a mensagem pronta para copiar.

## Como rodar
Sirva a pasta por HTTP (módulos ES não abrem via `file://`):

```
npx serve tia-glaucia
```

## Estrutura
- `js/hero3d.js`: cena da abertura (livro, letras, lápis que escreve "abc" e "123" na folha).
- `js/models.js`: peças 3D e traços da escrita à mão.
- `js/site.js`: formulário, WhatsApp, trilha da jornada, revelações.
- `img/cena.webp`: imagem estática usada sem WebGL ou se o 3D demorar.
- `ferramentas/imagens.html`: gera de novo as imagens de `img/` a partir das peças 3D.

Movimento reduzido: a cena aparece parada, já escrita. Para testar a reserva sem 3D, abra com `?sem3d`.
