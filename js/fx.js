"use strict";
/* ================================================================
   TokenGacha · 特效层 (fx.js)
   图标 CDN / 音效 / 粒子 / 飘字
   ================================================================ */

/* ---------- 图标 CDN ---------- */
const CDN1 = 'https://unpkg.com/@lobehub/icons-static-svg@latest/icons/';
const CDN2 = 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/';
function iconImg(slug, cls=''){
  const img = document.createElement('img');
  img.className = cls; img.alt = slug; img.loading = 'lazy';
  img.src = CDN1 + slug + '.svg';
  img.onerror = ()=>{ img.onerror = ()=>{
    const d = document.createElement('div');
    const s = img.width || 36;
    d.style.cssText = `width:${s}px;height:${s}px;display:flex;align-items:center;justify-content:center;border-radius:8px;background:#e8ecf8;font-weight:900;color:#67719a;font-size:${Math.round(s*.45)}px`;
    d.textContent = slug[0].toUpperCase();
    img.replaceWith(d);
  }; img.src = CDN2 + slug + '.svg'; };
  return img;
}

/* ---------- 音效 ---------- */
let AC = null, muted = false;
function ac(){ if(!AC) AC = new (window.AudioContext||window.webkitAudioContext)(); return AC; }
function beep(freq, dur=.12, type='sine', vol=.15, delay=0){
  if(muted) return;
  try{
    const c=ac(), o=c.createOscillator(), g=c.createGain();
    o.type=type; o.frequency.value=freq;
    const t=c.currentTime+delay;
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+.01);
    g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t+dur+.05);
  }catch(e){}
}
// 滑音: 频率从 f0 线性上滑到 f1
function sweep(f0, f1, dur=.5, type='sawtooth', vol=.09, delay=0){
  if(muted) return;
  try{
    const c=ac(), o=c.createOscillator(), g=c.createGain();
    o.type=type;
    const t=c.currentTime+delay;
    o.frequency.setValueAtTime(f0,t);
    o.frequency.linearRampToValueAtTime(f1,t+dur);
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+.01);
    g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t+dur+.05);
  }catch(e){}
}
const SFX = {
  click:()=>beep(600,.06,'square',.06),
  pull:()=>{beep(300,.2,'sawtooth',.08);beep(450,.25,'sawtooth',.06,.08);},
  flip:(i)=>beep(500+i*40,.07,'triangle',.09),
  rarity:(r)=>{ if(r==='UTR'){[523,659,784,1047,1319,1568].forEach((f,i)=>beep(f,.28,'sine',.15,i*.08));}
    else if(r==='UR'){[523,659,784,1047,1319].forEach((f,i)=>beep(f,.25,'sine',.14,i*.09));}
    else if(r==='SSR'){[523,659,784,1047].forEach((f,i)=>beep(f,.2,'sine',.12,i*.08));}
    else if(r==='SR'){[440,554,659].forEach((f,i)=>beep(f,.15,'sine',.1,i*.07));} },
  coin:()=>{beep(988,.08,'square',.08);beep(1319,.15,'square',.08,.07);},
  bad:()=>{beep(200,.3,'sawtooth',.1);beep(150,.4,'sawtooth',.1,.1);},
  boost:()=>{ sweep(320,980,.5,'sawtooth',.09); sweep(480,1400,.35,'square',.05,.12); }, // 加速: 转速上滑双音
  win:()=>{[523,659,784,1047,784,1047,1319].forEach((f,i)=>beep(f,.3,'sine',.13,i*.11));},
};

/* ---------- 粒子 & 飘字 ---------- */
const fx = document.getElementById('fx'), fctx = fx.getContext('2d');
let parts = [];
function fxResize(){ fx.width=innerWidth; fx.height=innerHeight; }
addEventListener('resize', fxResize); fxResize();
function burst(x, y, colors, n=60, power=7){
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2, v=(Math.random()*.7+.3)*power;
    parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-2,g:.15,life:1,decay:.008+Math.random()*.012,
      c:colors[Math.floor(Math.random()*colors.length)],s:2+Math.random()*4});
  }
}
(function fxLoop(){
  fctx.clearRect(0,0,fx.width,fx.height);
  parts = parts.filter(p=>p.life>0);
  for(const p of parts){
    p.x+=p.vx; p.y+=p.vy; p.vy+=p.g; p.life-=p.decay;
    fctx.globalAlpha=Math.max(0,p.life); fctx.fillStyle=p.c;
    fctx.fillRect(p.x,p.y,p.s,p.s);
  }
  fctx.globalAlpha=1;
  requestAnimationFrame(fxLoop);
})();
function shake(){ document.body.classList.remove('shake'); void document.body.offsetWidth; document.body.classList.add('shake'); }
function floater(text, x, y, color){
  const d=document.createElement('div'); d.className='floater'; d.textContent=text;
  d.style.left=x+'px'; d.style.top=y+'px'; d.style.color=color;
  document.body.appendChild(d); setTimeout(()=>d.remove(),1350);
}
// 出金动画: 中央大字 + 金币飞向余额
function bigMoneyPop(amt){
  const d=document.createElement('div');
  d.className='big-money'+(amt<0?' neg':'');
  d.textContent=(amt>=0?'+':'')+fmt(amt);
  document.body.appendChild(d); setTimeout(()=>d.remove(),1650);
}
function coinShower(fromRect, amount){
  const chip=$('h-money').getBoundingClientRect();
  const tx=chip.left+chip.width/2, ty=chip.top+chip.height/2;
  const neg=amount<0;
  const n=neg?6:Math.min(16, 7+Math.floor(Math.abs(amount)/120));
  for(let i=0;i<n;i++){
    const d=document.createElement('div');
    d.textContent=pick(neg?['💸','🕳️']:['🪙','💰','✨']);
    d.style.cssText=`position:fixed;z-index:230;font-size:${15+Math.random()*15}px;pointer-events:none;filter:drop-shadow(0 2px 4px rgba(0,0,0,.2))`;
    const sx=fromRect.left+fromRect.width*(.25+Math.random()*.5), sy=fromRect.top+fromRect.height*.25;
    d.style.left=sx+'px'; d.style.top=sy+'px';
    document.body.appendChild(d);
    const mx=(sx+tx)/2+(Math.random()*160-80), my=Math.min(sy,ty)-100-Math.random()*100;
    d.animate([
      {transform:'translate(0,0) scale(.4) rotate(0deg)',opacity:0},
      {transform:`translate(${mx-sx}px,${my-sy}px) scale(1.25) rotate(${Math.random()*200-100}deg)`,opacity:1,offset:.4},
      {transform:`translate(${tx-sx}px,${ty-sy}px) scale(.5) rotate(${Math.random()*360-180}deg)`,opacity:.9}
    ],{duration:650+Math.random()*450,delay:i*55,easing:'cubic-bezier(.25,.8,.35,1)'}).onfinish=()=>{
      d.remove();
      burst(tx,ty,['#f59e0b','#fde68a','#fff'],6,2.5);
    };
  }
}
let toastTimer=null;
function toast(msg, ms=2200){
  clearTimeout(toastTimer);
  document.querySelectorAll('.toast').forEach(t=>t.remove());
  const d=document.createElement('div'); d.className='toast'; d.innerHTML=msg;
  document.body.appendChild(d);
  toastTimer=setTimeout(()=>d.remove(), ms);
}
