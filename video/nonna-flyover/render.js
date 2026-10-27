// Renders the film to MP4: node render.js [--fps 60] [--sub 16] [--out nonna-flyover.mp4] [--headed] [--swiftshader]
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), { spawn } = require('child_process');

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true); };
const FPS = +arg('fps', 60), SUB = +arg('sub', 16), DUR = 14.5;
const OUT = path.resolve(arg('out', 'nonna-flyover.mp4'));
const FROM = +arg('from', 0), TO = +arg('to', DUR);
const FFMPEG = process.env.FFMPEG || (() => { try { return require('ffmpeg-static'); } catch { return 'ffmpeg'; } })();

const ROOT = __dirname;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.css': 'text/css', '.woff2': 'font/woff2' };
const server = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
});

(async () => {
  await new Promise(res => server.listen(0, '127.0.0.1', res));
  const port = server.address().port;
  const gpuArgs = arg('swiftshader', false)
    ? ['--enable-unsafe-swiftshader']
    : [process.platform === 'win32' ? '--use-angle=d3d11' : process.platform === 'darwin' ? '--use-angle=metal' : '--use-angle=vulkan', '--enable-gpu', '--ignore-gpu-blocklist'];
  const browser = await chromium.launch({ headless: !arg('headed', false), args: gpuArgs });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1152 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('pageerror', e));
  await page.goto(`http://127.0.0.1:${port}/index.html`);
  await page.waitForFunction(() => window.READY || window.ERR, null, { timeout: 0 });
  const err = await page.evaluate(() => window.ERR); if (err) throw new Error(err);
  const gpu = await page.evaluate(() => { const g = document.createElement('canvas').getContext('webgl2'); const d = g.getExtension('WEBGL_debug_renderer_info'); return g.getParameter(d ? d.UNMASKED_RENDERER_WEBGL : g.RENDERER); });
  console.log('GPU:', gpu);
  if (/swiftshader/i.test(gpu) && !arg('swiftshader', false)) console.warn('Aviso: rodando sem GPU (SwiftShader). Tente --headed.');

  const ff = spawn(FFMPEG, ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '14',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT], { stdio: ['pipe', 'inherit', 'inherit'] });
  const n0 = Math.round(FROM * FPS), n1 = Math.round(TO * FPS);
  const t0 = Date.now();
  for (let i = n0; i < n1; i++) {
    const t = i / FPS;
    await page.evaluate(([t, s]) => seek(t, s), [t, SUB]);
    const png = await page.screenshot({ type: 'png' });
    if (!ff.stdin.write(png)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % FPS === 0) { const done = i - n0 + 1, eta = (Date.now() - t0) / done * (n1 - i) / 1000; console.log(`frame ${i}/${n1}  t=${t.toFixed(2)}s  ~${Math.round(eta)}s restantes`); }
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  await browser.close(); server.close();
  console.log('Pronto:', OUT);
})().catch(e => { console.error(e); process.exit(1); });
