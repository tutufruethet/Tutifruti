const {chromium}=require('playwright');const fs=require('fs');
const OUT=process.argv[2];
const L=[ // [id, selector, index]
['hero-pizza','.hero-pizza',0],['sticker','.sticker',0],['basil1','.deco-basil-1',0],['basil2','.deco-basil-2',0],['tomato','.deco-tomato',0],['hero-btn','.hero-card .btn',0],
['secret-pizza','.secret-pizza',0],['onion','.deco-onion',0],['pepper','.deco-pepper',0],
['spot-pizza','.spot-pizzas',0],...[0,1,2,3,4,5,6,7].map(i=>['orb'+i,'.spot-orbit .orb-item',i]),['spot-nav','.spot-nav',0],
['menu-img','.menu-title img',0],['menu-chips','.menu-head .chips',0],...[0,1,2,3,4,5].map(i=>['mcard'+i,'.m-card',i]),
['b-pizza','.b-pizza',0],['b-list','.b-list',0],['b-add','.b-add',0],
['phone','.phone',0],['box','.box-stage .box',0],...[0,1,2].map(i=>['dcard'+i,'.d-cards li',i]),
...[0,1,2,3].map(i=>['rev'+i,'.rev',i]),['rev-badge','.rev-badge',0],['final-btn','.final-cta .btn',0],['moto','.moto-rider',0]];
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900},deviceScaleFactor:2});
await p.goto('https://nonnapizzaria.vercel.app/',{waitUntil:'networkidle'});await p.waitForTimeout(5000);
for(let y=0;y<11000;y+=300){await p.evaluate(y=>window.scrollTo(0,y),y);await p.waitForTimeout(160)}
await p.waitForTimeout(2500);await p.evaluate(()=>window.scrollTo(0,0));await p.waitForTimeout(2500);
await p.evaluate(()=>{window.requestAnimationFrame=()=>0;for(let i=0;i<100000;i++){clearInterval(i);clearTimeout(i)}
 const s=document.createElement('style');s.textContent=`*,*::before,*::after{animation-play-state:paused!important;transition:none!important;caret-color:transparent}
 html.hide [data-layer]{visibility:hidden!important}
 html.solo,html.solo body{background:transparent!important} html.solo body *{visibility:hidden!important} html.solo [data-solo],html.solo [data-solo] *{visibility:visible!important}`;document.head.appendChild(s)});
await p.waitForTimeout(500);
const H=await p.evaluate(()=>document.documentElement.scrollHeight);
const info=await p.evaluate(L=>L.map(([id,sel,i])=>{const e=document.querySelectorAll(sel)[i];if(!e)return null;e.dataset.layer=id;let a=1e9,b=1e9,c=-1e9,d=-1e9;for(const n of [e,...e.querySelectorAll('*')]){const r=n.getBoundingClientRect();if(r.width<1||r.height<1)continue;a=Math.min(a,r.left);b=Math.min(b,r.top);c=Math.max(c,r.right);d=Math.max(d,r.bottom)}a=Math.max(a,0);c=Math.min(c,1440);return {id,x:a+scrollX,y:b+scrollY,w:c-a,h:d-b}}).filter(Boolean),L);
// logo
const logo=await p.evaluate(()=>{const s=document.querySelector('.nav-logo svg');const c=s.cloneNode(true);const src=s.querySelectorAll('*');const dst=c.querySelectorAll('*');src.forEach((e,i)=>{const cs=getComputedStyle(e);dst[i].setAttribute('fill',cs.fill);if(cs.stroke!=='none')dst[i].setAttribute('stroke',cs.stroke)});c.setAttribute('xmlns','http://www.w3.org/2000/svg');c.setAttribute('width',512);c.setAttribute('height',512);c.removeAttribute('class');return c.outerHTML});
fs.writeFileSync(OUT+'/logo.svg',logo);
await p.evaluate(()=>document.documentElement.classList.add('hide'));
const TILE=2048;const tiles=[];
for(let y=0;y<H;y+=TILE){const h=Math.min(TILE,H-y);await p.screenshot({path:`${OUT}/page${tiles.length}.png`,clip:{x:0,y,width:1440,height:h},fullPage:true});tiles.push({y,h})}
await p.evaluate(()=>{document.documentElement.classList.remove('hide');document.documentElement.classList.add('solo')});
const PAD=28;
for(const l of info){await p.evaluate(id=>{document.querySelectorAll('[data-solo]').forEach(e=>delete e.dataset.solo);document.querySelector(`[data-layer="${id}"]`).dataset.solo=1},l.id);
 const clip={x:Math.max(0,l.x-PAD),y:l.y-PAD,width:l.w+2*PAD,height:l.h+2*PAD};l.cx=clip.x;l.cy=clip.y;l.cw=clip.width;l.ch=clip.height;
 await p.screenshot({path:`${OUT}/L_${l.id}.png`,clip,fullPage:true,omitBackground:true})}
fs.writeFileSync(OUT+'/layout.json',JSON.stringify({W:1440,H,tile:TILE,tiles,layers:info},null,1));
console.log(H,info.length);await b.close()})()
