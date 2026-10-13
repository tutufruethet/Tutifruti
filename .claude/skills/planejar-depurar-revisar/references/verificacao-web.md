# Verificação de páginas e cenas com Playwright

Modelos para copiar **para o scratchpad** (regra da casa: scripts e prints de teste nunca no repositório). Playwright global: `/opt/node22/lib/node_modules/playwright/index.mjs`; Chromium em `/opt/pw-browsers`.

## Servir e abrir

```bash
npx --yes http-server -p 8123 -s -c-1 .   # da raiz do repo, em segundo plano
```

```js
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const GL = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']; // WebGL por software
const browser = await chromium.launch({ args: GL });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
// celular: { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }
const page = await ctx.newPage();
const erros = [];
page.on('console', (m) => ['error', 'warning'].includes(m.type()) && erros.push(m.text()));
page.on('pageerror', (e) => erros.push(e.message));
await page.goto(URL);
await page.waitForFunction(() => window.__app?.pronto, null, { timeout: 60000 }); // condição, não sleep
```

O app expõe um gancho só de leitura: `window.__app = { estado, pronto, info: () => ({ quadros, rodando, chamadas, triangulos }) }`.

## Camadas

```js
// Fumaça: console limpo + screenshot
ok(erros.length === 0, 'console limpo', erros);

// Repouso: o loop dorme
await page.waitForFunction(() => !window.__app.info().rodando);
const q0 = await page.evaluate(() => window.__app.info().quadros);
await page.waitForTimeout(1500);
ok(q0 === await page.evaluate(() => window.__app.info().quadros), 'zero quadros parado');

// Animação: pixels e quadros mudam depois de uma ação
const a = await page.locator('canvas').screenshot();
await page.click('[data-sabor=manga]');
await page.waitForTimeout(700);
ok(!a.equals(await page.locator('canvas').screenshot()), 'cena reagiu');

// Responsivo: sem scroll horizontal
for (const w of [320, 375, 768, 1024, 1440]) { /* abrir com {viewport:{width:w,height:800}} */
  const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  ok(sw <= cw, `sem scroll horizontal em ${w}px`);
}

// Alvos de toque ≥ 44px
const pequenos = await page.$$eval('button, a, select, label', (els) => els.filter((e) => { const b = e.getBoundingClientRect(); return b.height && b.height < 44; }).map((e) => e.className));

// Acessibilidade: axe-core (npm pack axe-core → axe.min.js no scratchpad)
await page.addScriptTag({ content: readFileSync(AXE, 'utf8') });
const v = await page.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] })).violations);
// rode também com cada diálogo aberto

// Sem WebGL
const b2 = await chromium.launch({ args: ['--disable-webgl', '--disable-3d-apis'] });

// Reduced motion
await browser.newContext({ reducedMotion: 'reduce' });

// Área de transferência
await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
const clip = await page.evaluate(() => navigator.clipboard.readText());

// Download (ex.: .ics)
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#baixar-ics')]);
const texto = await page.evaluate(async () => (await fetch(document.getElementById('baixar-ics').href)).text());
```

## Armadilhas que já custaram caro
- **`aria-disabled="true"`**: o Playwright se recusa a clicar ("element is not enabled"). Se o botão deve continuar clicável para explicar o limite, use `click(sel, { force: true })` no teste.
- **Visibilidade, não só texto.** O diálogo da Gelateria passou em todos os testes de texto e foco mostrando formulário **e** confirmação juntos (`display: grid` vencia `hidden`). Teste `isVisible` dos dois estados de qualquer troca de tela.
- **O olho pega o que o teste não pega.** "Monte a sua copinho" (concordância) passou por toda a bateria; só o print de cada estado mostrou. Fotografe **todos** os estados, não só o padrão.
- `fullPage: true` não mostra elementos `sticky` no lugar real; para conferir um palco grudado, role e tire screenshot da janela.
- WebGL por software é lento: não meça FPS nele; meça quadros em repouso, chamadas de desenho e triângulos (`renderer.info.render`).
- Ver um teste falhar pelo motivo certo: tire a correção, rode, recoloque (feito para o bug do `hidden`).

## Relatório
Liste cada checagem como `OK`/`FALHA` com o dado observado; termine com o total. Diga o que **não** foi testado (ex.: GPU real, Safari, leitor de tela real).
