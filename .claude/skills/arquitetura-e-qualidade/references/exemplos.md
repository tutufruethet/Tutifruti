# Exemplos de arquitetura (da Gelateria)

Código real em `gelateria/js/`. Os testes rodaram no Node (`node --test`), sem navegador.

## Estado único + reducer puro

```js
// estado.js
export function reduzir(estado, acao) {
  switch (acao.tipo) {
    case 'adicionar':
      if (!SABOR[acao.sabor] || !podeAdicionar(estado)) return estado; // devolve o MESMO objeto
      return { ...estado, bolas: [...estado.bolas, acao.sabor] };
    // …
  }
}

// main.js
function despachar(acao) {
  const novo = reduzir(estado, acao);
  if (novo === estado) return false;            // nada mudou: não renderiza, não mexe na URL
  estado = novo;
  history.replaceState(null, '', `?${paraQuery(estado)}`);
  renderizar(estado); palco?.atualizar(estado);
  return true;
}
```

`novo === estado` como sinal de "não mudou" deixa a UI decidir a mensagem (ex.: "Já são 3 bolas") sem a regra sair do reducer.

## Saneamento em toda entrada

```js
export function sanear(bruto) {
  const e = bruto && typeof bruto === 'object' ? bruto : {};
  return {
    base: BASE[e.base] ? e.base : estadoInicial.base,
    bolas: Array.isArray(e.bolas) ? e.bolas.filter((s) => SABOR[s]).slice(0, MAX_BOLAS) : [...estadoInicial.bolas],
    cobertura: COBERTURA[e.cobertura] ? e.cobertura : estadoInicial.cobertura,
  };
}
```

Usado pela URL, pelos favoritos do `localStorage` e pela ação `carregar`. O nome exibido é **recalculado** a partir do estado saneado, nunca lido do storage (evita injetar HTML).

## Link canônico

```js
const link = `${location.origin}${location.pathname}?${paraQuery(estado)}`; // sempre com o estado
```

Copiar `location.href` falhava no estado padrão (a URL ainda não tinha query). Bug achado pelo teste funcional.

## Storage com rede de segurança

```js
const storage = (() => { try { return window.localStorage; } catch { return null; } })();
export function lerFavoritos(storage) {
  let bruto;
  try { bruto = JSON.parse(storage?.getItem(CHAVE) ?? '[]'); } catch { return []; }
  if (!Array.isArray(bruto)) return [];
  // sanear cada item, descartar vazios e duplicados…
}
```

Chave com versão (`tutifruti:favoritos:v1`); `storage` injetado (o teste passa um objeto falso que lança erro).

## Tempo injetado

```js
export function horariosDeRetirada(agora, cfg = HORARIO) { … }   // agora: Date
gerarICS({ codigo, inicio, resumo, descricao, agora });          // DTSTAMP testável
```

Testes rodam com `TZ=America/Sao_Paulo` e datas fixas: "14:07 → primeiro horário 14:30; depois das 21:40 oferece amanhã".

## Funções reais sem servidor

- **Link compartilhável** (estado na query).
- **Arquivo de agenda `.ics`** (RFC 5545: CRLF, texto escapado, linhas dobradas em 75 octetos, `UID` estável) via `Blob` + `URL.createObjectURL` + `<a download>`.
- **Código de reserva** determinístico (hash FNV-1a do pedido) em alfabeto sem 0/O e 1/I.
- Aviso honesto na página: "a reserva não chega a uma loja real".

## Divisão de arquivos

| Arquivo | Responsabilidade | Testado por |
|---|---|---|
| `dados.js` | catálogo e preços | — (só dados) |
| `estado.js` | regras puras | 28 testes `node --test` |
| `ui.js` | DOM a partir do estado | Playwright funcional |
| `reserva.js` | diálogo e validação na tela | Playwright funcional |
| `cena.js` / `geometrias.js` | 3D | fumaça, animação, repouso, prints |
| `fallback.js` | SVG sem WebGL | Playwright com `--disable-webgl` |
| `main.js` | composição e gancho `window.__app` | todos |
