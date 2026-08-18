"use strict";
/* ================================================================
   TokenGacha · 数据分析页 (analytics.js)
   canvas 手绘图表: 抽卡分布 / 收支曲线 / 稀有度占比 / 图鉴进度 / 厂商分布
   ================================================================ */

function renderData(){
  const page=$('page-data');
  if(!page || !page.classList.contains('active')) {
    // 仍渲染 canvas(即使不活动也刷新, 避免切页空白)
  }
  drawBarChart();
  drawLineChart();
  drawDonutChart();
  drawDexChart();
  drawVendorChart();
  renderHist();
}

function renderHist(){
  const box=$('gacha-hist');
  if(!box) return;
  const hist=S.hist||[];
  if(!hist.length){
    box.innerHTML='<div style="color:var(--faint);font-size:12.5px;padding:6px 2px">暂无出货记录，抽卡后这里会展示最近 100 次出货。</div>';
    return;
  }
  const rows=hist.slice().reverse().map(h=>{
    const m=MMAP[h.m];
    const t=new Date(h.t);
    const ts=`${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')} ${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`;
    const poolName=(POOLS[h.pool]&&POOLS[h.pool].name)||h.pool||'';
    return `<div style="display:flex;align-items:center;gap:10px;padding:6px 8px;border-bottom:1px solid var(--line2)">
      <span style="color:var(--faint);font-size:11px;white-space:nowrap">${ts}</span>
      <span style="color:var(--faint);font-size:11px;white-space:nowrap">${poolName}</span>
      <span style="font-size:12px;white-space:nowrap">${m.name}</span>
      <span style="margin-left:auto;font-weight:800;font-size:11.5px;color:${RARITY[h.r].hex}">${h.r}</span>
    </div>`;
  }).join('');
  box.innerHTML=`<div style="max-height:320px;overflow-y:auto;border:1px solid var(--line);border-radius:10px;background:var(--panel2)">${rows}</div>`;
}

function chartCanvas(id, h=180){
  const cv=$('chart-'+id);
  if(!cv) return null;
  const dpr=window.devicePixelRatio||1;
  const w=cv.parentElement.clientWidth||400;
  cv.width=w*dpr; cv.height=h*dpr; cv.style.height=h+'px';
  const g=cv.getContext('2d'); g.scale(dpr,dpr); g.clearRect(0,0,w,h);
  return {g,w,h};
}

function drawBarChart(){
  const c=chartCanvas('bar'); if(!c) return;
  const {g,w,h}=c;
  const arr=RORDER.slice().reverse().filter(r=> r!=='NB' || (S.stats.byR.NB||0)>0); // NB 未抽到前隐藏
  const data=arr.map(r=>S.stats.byR[r]||0);
  const max=Math.max(1,...data);
  const pad=36, bw=(w-pad*2)/data.length;
  g.font='11px system-ui'; g.textAlign='center';
  arr.forEach((r,i)=>{
    const v=S.stats.byR[r]||0;
    const x=pad+i*bw+bw/2, bh=(v/max)*(h-40);
    g.fillStyle=RARITY[r].hex;
    g.fillRect(x-bw*.28, h-26-bh, bw*.56, bh);
    g.fillStyle='#67719a';
    g.fillText(r, x, h-12);
    g.fillStyle='#1c2340'; g.fillText(String(v), x, h-30-bh);
  });
  g.textAlign='left'; g.fillStyle='#98a2c8'; g.fillText('各稀有度累计出货', pad, 14);
}

function drawLineChart(){
  const c=chartCanvas('line'); if(!c) return;
  const {g,w,h}=c;
  // 按收支明细累计余额曲线(与结算一致: 余额不跌穿 0)
  const pts=[]; let bal=START_MONEY;
  const led=[...S.ledger].reverse();
  for(const l of led){ bal=Math.max(0,bal+l.amt); pts.push(bal); }
  if(!pts.length) pts.push(S.money);
  pts.push(S.money);
  const min=Math.min(...pts), max=Math.max(...pts), span=Math.max(1,max-min);
  const pad=40;
  g.font='11px system-ui';
  g.strokeStyle='#e3e8f2'; g.beginPath();
  for(let i=0;i<=4;i++){ const y=pad+(h-2*pad)*i/4; g.moveTo(pad,y); g.lineTo(w-pad,y); }
  g.stroke();
  g.strokeStyle='#2f6bff'; g.lineWidth=2; g.beginPath();
  pts.forEach((v,i)=>{
    const x=pad+(w-2*pad)*i/Math.max(1,pts.length-1);
    const y=h-pad-(v-min)/span*(h-2*pad);
    i===0?g.moveTo(x,y):g.lineTo(x,y);
  });
  g.stroke(); g.lineWidth=1;
  g.fillStyle='#67719a'; g.textAlign='left';
  g.fillText('余额走势（按收支明细）', pad, 14);
  g.fillText('¥'+Math.round(max).toLocaleString('zh-CN'), pad, pad+12);
  g.textAlign='right'; g.fillText('¥'+Math.round(min).toLocaleString('zh-CN'), w-pad, h-14);
  g.textAlign='center'; g.fillStyle='#1c2340';
  g.fillText('当前 '+fmt(S.money), w/2, h-14);
}

function drawDonutChart(){
  const c=chartCanvas('donut'); if(!c) return;
  const {g,w,h}=c;
  const data=RORDER.filter(r=> r!=='NB' || (S.stats.byR.NB||0)>0).map(r=>[r,S.stats.byR[r]||0]); // NB 未抽到前隐藏
  const total=Math.max(1,data.reduce((s,x)=>s+x[1],0));
  const R=Math.min(w*0.32, h/2-22);
  const cx=R+30, cy=h/2;
  let a=-Math.PI/2;
  g.font='11px system-ui';
  for(const [r,v] of data){
    if(!v) continue;
    const ang=v/total*Math.PI*2;
    g.beginPath(); g.moveTo(cx,cy); g.arc(cx,cy,R,a,a+ang); g.closePath();
    g.fillStyle=RARITY[r].hex; g.fill();
    a+=ang;
  }
  g.fillStyle='#fff';
  g.beginPath(); g.arc(cx,cy,R*.6,0,7); g.fill();
  g.fillStyle='#1c2340'; g.textAlign='center';
  g.font='900 20px system-ui'; g.fillText(String(total), cx, cy+2);
  g.font='10px system-ui'; g.fillStyle='#98a2c8'; g.fillText('总出货', cx, cy+16);
  // 图例: 圆盘右侧竖排, 行距充足
  const lx=cx+R+18;
  const rowH=Math.min(20,(h-20)/data.length);
  data.forEach(([r,v],i)=>{
    const ly=16+i*rowH+10;
    g.fillStyle=RARITY[r].hex; g.fillRect(lx, ly-8, 11, 11);
    g.textAlign='left'; g.fillStyle='#67719a';
    g.fillText(`${r} ${v} (${(v/total*100).toFixed(1)}%)`, lx+16, ly);
  });
}

function drawDexChart(){
  const c=chartCanvas('dex', 120); if(!c) return;
  const {g,w,h}=c;
  const owned=Object.keys(S.dex).length;
    const hasNB=(S.dex.fihagv1||0)>0;
    const total=MODELS.filter(m=>m.id!=='fihagv1'||hasNB).length;
  const pct=total?owned/total*100:0;
  const pad=36;
  g.fillStyle='#eef1f8';
  roundRect(g,pad,h-30,(w-2*pad),14,7); g.fill();
  g.fillStyle='#16a34a';
  roundRect(g,pad,h-30,(w-2*pad)*pct/100,14,7); g.fill();
  g.font='900 15px system-ui'; g.textAlign='center'; g.fillStyle='#1c2340';
  g.fillText(`${owned} / ${total}  (${pct.toFixed(1)}%)`, w/2, h-38);
  g.font='11px system-ui'; g.fillStyle='#98a2c8';
  g.fillText('模型图鉴进度', w/2, 14);
}
function roundRect(g,x,y,w,h,r){
  g.beginPath(); g.moveTo(x+r,y);
  g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r);
  g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath();
}

function drawVendorChart(){
  const counts={};
  for(const m of MODELS){ if(S.dex[m.id]) counts[m.vendor]=(counts[m.vendor]||0)+1; }
  const entries=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  const rowH=34; // 固定行距, 足够大
  const needH=Math.max(220, entries.length*rowH+70);
  const c=chartCanvas('vendor', needH); if(!c) return;
  const {g,w,h}=c;
  const max=Math.max(1,...entries.map(e=>e[1]));
  const pad=88, top=40;
  g.font='12px system-ui';
  entries.forEach(([name,v],i)=>{
    const y=top+i*rowH+rowH/2;
    g.textAlign='right'; g.fillStyle='#67719a';
    g.fillText(name, pad-8, y+4);
    const bw=(w-pad-16)*v/max;
    g.fillStyle='#7c3aed';
    g.fillRect(pad, y-11, bw, 22);
    g.textAlign='left'; g.fillStyle='#1c2340';
    g.fillText(String(v), pad+bw+10, y+4);
  });
  g.textAlign='left'; g.fillStyle='#98a2c8';
  g.fillText('已获得模型按厂商分布', pad, 18);
}

/* ---------- 启动 ---------- */
applySkin(S.skin||'classic');
boot();
