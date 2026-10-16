import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
import { spawn } from 'child_process';
import fs from 'fs';
const dir = process.argv[2], mode = process.argv[3];
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
p.on('console', m => console.log('console:', m.text())); p.on('pageerror', e => console.log('ERR', e.message));
await p.goto('file://' + dir + '/reel.html'); await p.evaluate(() => window.ready);
const dec = s => Buffer.from(s.split(',')[1], 'base64');
if (mode === 'sheet') {
  const times = process.argv.slice(4).map(Number);
  for (const t of times) fs.writeFileSync(`${dir}/shots/t${t.toFixed(2)}.jpg`, dec(await p.evaluate(t => window.grab(t, 0.85), t)));
} else {
  const ff = spawn('ffmpeg', ['-y','-hide_banner','-loglevel','error','-f','image2pipe','-framerate','60','-c:v','mjpeg','-i','-','-i',dir+'/music.wav',
    '-c:v','libx264','-preset','slow','-crf','16','-pix_fmt','yuv420p','-profile:v','high','-c:a','aac','-b:a','320k','-shortest','-movflags','+faststart', mode], { stdio: ['pipe','inherit','inherit'] });
  for (let i = 0; i < 900; i++) {
    const buf = dec(await p.evaluate(t => window.grab(t, 0.97), i / 60));
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 100 === 0) console.log('frame', i);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
}
await b.close();
