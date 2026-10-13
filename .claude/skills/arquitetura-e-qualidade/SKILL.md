---
name: arquitetura-e-qualidade
description: Use quando for estruturar um projeto web novo, decidir onde fica o estado, separar arquivos, escolher dependências, criar API ou persistência, ou quando o código estiver difícil de testar, cheio de efeitos colaterais, acoplado ao DOM ou com estado duplicado.
---

# Arquitetura full-stack e qualidade de código

Código bom aqui é código **que dá para testar sem navegador e mudar sem medo**: regras puras no centro, DOM e GPU nas bordas, estado com um dono só.

## Quando usar
- Começo de projeto ou de funcionalidade com estado (carrinho, montador, formulário, filtros).
- Decidir entre framework e vanilla, adicionar uma dependência, criar endpoint ou persistência.
- Revisão de código que mistura regra de negócio com manipulação de DOM.

## Quando não usar
- Decisões visuais (`design-premium`), cena 3D (`cena-3d`), processo de teste e depuração (`planejar-depurar-revisar`).

## Estrutura

```
projeto/
  js/dados.js      constantes do domínio (catálogo, preços, horários)  — puro
  js/estado.js     regras: reducer, validação, preço, URL, agenda       — puro, testável no Node
  js/ui.js         DOM: renderiza o estado, traduz eventos em ações     — borda
  js/cena.js       three.js: desenha o estado, não decide nada          — borda
  js/main.js       liga tudo, lê URL e storage, expõe gancho de teste   — composição
```

1. **Um arquivo, uma responsabilidade.** Arquivos que mudam juntos ficam juntos. Arquivo pequeno cabe no contexto e é editado com segurança.
2. **Regras puras.** Função recebe dado e devolve dado; tempo (`now`) e aleatório (`seed`) entram por parâmetro. Assim o teste é uma tabela de entradas e saídas literais.
3. **Um dono para o estado.** `dispatch(ação) → novo estado → render(estado)`. UI e cena só leem.
4. **Estado rápido fora do reativo.** Valores de 60 fps (rotação, mola, scroll) vivem no loop/ref; só o estado de decisão (o que foi escolhido) passa pelo reducer.
5. **Estado compartilhável na URL.** O que define "o que estou vendo" vai para a query/rota (`history.replaceState`); o link reproduz a tela. A pmndrs faz a câmera seguir a rota (`/item/:id`).
6. **Validar em toda fronteira** (defesa em profundidade): URL, `localStorage`, formulário e API desconfiam da entrada; item desconhecido é descartado, limite é aplicado, erro diz o que fazer.
7. **Persistência local com rede de segurança**: `try/catch` em todo acesso a `localStorage` (modo privado, cota), chave com versão (`app:favoritos:v1`), dado validado na leitura.

## CSS que não se anula
- `[hidden] { display: none !important; }` na base: qualquer `display: grid/flex` de componente vence o atributo `hidden` e mostra duas telas ao mesmo tempo (bug real da Gelateria, invisível para testes de texto).
- Seletores de uma classe; evite combinar seletor de seção com seletor de componente no mesmo elemento.

## Ciclo de vida de objetos visuais
- Case itens antigos e novos por **identidade/ordem**, não por posição: tirar o 1º item faz os outros escorregarem, em vez de serem destruídos e recriados.
- Ao remover algo da cena, libere o que é dele (`InstancedMesh.dispose()`); o que é compartilhado (geometria, material) fica.
- Carregue o pesado depois do essencial: `import('./cena.js')` dinâmico; o texto principal (LCP) não espera o three.js.

## Dependências
- **Zero biblioteca quando o efeito cabe em poucas linhas** (regra da casa). Uma lib entra quando resolve algo difícil (física, parser, three.js).
- **Vendorize com licença** (`vendor/three/LICENSE`) e versão fixa; nada de CDN obrigatório para o site funcionar offline/no Pages.
- Importe só o subsistema que usa (Ecctrl exporta `ecctrl/curves`, `ecctrl/input`…).
- Respeite licenças: MIT/OFL permitem copiar com aviso; "todos os direitos reservados" só permite **ler e parafrasear**.

## Back-end (quando houver)
- A API valida tudo de novo; o cliente nunca é fonte de verdade de preço, estoque ou permissão.
- Operações idempotentes (chave de idempotência em pedido), erros com código e mensagem útil.
- Configuração por variável de ambiente; segredo nunca no cliente.
- **Site estático sem servidor:** diga na interface o que é simulado. Prefira funções reais que não precisam de servidor (link compartilhável, arquivo `.ics`, cópia para a área de transferência, `mailto:`/`wa.me` com texto pronto).

## React / R3F (quando o projeto usa)
- Convenções do `react-three-examples`: controles junto de quem consome, declarativo primeiro, tipos vindos dos elementos, refs com nome do conteúdo, imports em hierarquia, comentário uma vez. Ver `cena-3d/references/r3f.md`.
- `setState` só para decisão; nada de estado reativo a 60 fps.

## Acessibilidade é arquitetura
- HTML semântico primeiro: `fieldset/legend` para grupos, `button` para ação, `dialog` nativo para modal, `label` ligado ao campo.
- Mudança assíncrona anunciada por **uma** região `aria-live` compartilhada.
- Foco gerenciado: abrir diálogo foca o primeiro campo; erro de formulário foca o primeiro inválido; fechar devolve o foco.

## Definição de pronto
- Lógica pura coberta por testes com valores literais (rodando no Node, sem navegador).
- Página sem erro no console; funciona sem WebGL e sem `localStorage`.
- Nenhum `TODO` silencioso: divergência das regras ou é corrigida ou é registrada (nota/issue) com o porquê.
- Commits pequenos com mensagem que diz o que e por quê.

## Critérios de qualidade
- [ ] Dá para testar as regras com `node --test` sem DOM.
- [ ] Recarregar a página com a URL copiada reproduz o estado.
- [ ] URL e storage corrompidos não quebram a página (testado).
- [ ] Nenhuma dependência sem licença registrada; nada de CDN obrigatório.
- [ ] UI e cena não tomam decisões de negócio (preço, limite, validação).
- [ ] `[hidden]` vence qualquer `display`; troca de tela testada com `isVisible`.

## Referências
- [references/exemplos.md](references/exemplos.md): reducer, URL, storage seguro, horários e `.ics`, extraídos da [Gelateria](../../../gelateria/index.html).
- Estudo: [Superpowers](../../../estudo/referencias/superpowers.md) · [react-three-examples](../../../estudo/referencias/react-three-examples.md).
