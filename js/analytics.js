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
  // 绑定导出按钮（仅一次）
  const bl=$('btn-export-ledger');
  if(bl && !bl.dataset.bound){ bl.dataset.bound='1'; bl.onclick=()=>{ if(typeof SFX!=='undefined'&&SFX.click) SFX.click(); exportLedgerCSV(); }; }
  const bh=$('btn-export-hist');
  if(bh && !bh.dataset.bound){ bh.dataset.bound='1'; bh.onclick=()=>{ if(typeof SFX!=='undefined'&&SFX.click) SFX.click(); exportHistCSV(); }; }
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
    let poolName=(POOLS[h.pool]&&POOLS[h.pool].name)||h.pool||'';
    if(h.pool==='banner' && h.season){
      const s=BANNER_SEASONS.find(x=>x.id===h.season);
      if(s) poolName=s.name;
    }
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
  const total=data.reduce((a,b)=>a+b,0);
  if(!total){
    g.font='12px system-ui'; g.fillStyle='#9aa4c8'; g.textAlign='center';
    g.fillText('暂无出货，抽卡后这里会展示分布', w/2, h/2);
    return;
  }
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

let _linePts=[], _lineInfos=[], _lineMin=0, _lineMax=0, _linePad=40;
function drawLineChart(){
  const c=chartCanvas('line'); if(!c) return;
  const {g,w,h}=c;
  // 按收支明细累计余额曲线（与结算一致：余额不跌穿 0，剔除重复尾点，截断历史时补充 S.money）
  const pts=[], infos=[];
  const led=[...S.ledger].reverse();
  if(!led.length){
    pts.push(S.money);
    infos.push({ts:'-', label:'初始资金', amt: S.money-START_MONEY, bal:S.money, idx:0});
  }else{
    let bal=START_MONEY;
    for(let i=0;i<led.length;i++){
      const l=led[i];
      bal=Math.max(0,bal+l.amt);
      pts.push(bal);
      infos.push({ts:l.ts, label:l.label, amt:l.amt, bal, idx:i});
    }
    if(pts[pts.length-1]!==S.money){
      pts.push(S.money);
      infos.push({ts:'当前', label:'当前余额', amt:0, bal:S.money, idx:led.length});
    }
  }
  _linePts=pts; _lineInfos=infos; _lineMin=Math.min(...pts); _lineMax=Math.max(...pts); _linePad=40;
  const min=_lineMin, max=_lineMax, span=Math.max(1,max-min);
  const pad=_linePad;
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
  // 若 ledger 被截断（80 条上限）则标注
  if(S.ledger.length>=80){
    g.textAlign='right'; g.fillStyle='#9aa4c8'; g.font='10px system-ui';
    g.fillText('仅最近80条', w-pad, pad-4);
  }
  setupLineTooltip();
}
function setupLineTooltip(){
  const wrap=$('wrap-chart-line'), cv=$('chart-line');
  if(!wrap || !cv) return;
  let tip=wrap.querySelector('.chart-tip');
  let cross=wrap.querySelector('.chart-cross');
  if(!tip){
    tip=document.createElement('div'); tip.className='chart-tip'; tip.hidden=true; wrap.appendChild(tip);
  }
  if(!cross){
    cross=document.createElement('div'); cross.className='chart-cross'; cross.hidden=true; wrap.appendChild(cross);
  }
  // 避免重复绑定
  if(cv.dataset.tipBound) return;
  cv.dataset.tipBound='1';
  cv.style.cursor='crosshair';
  cv.style.touchAction='none';
  const showAt=(clientX, clientY, isTouch)=>{
    const rect=cv.getBoundingClientRect();
    const cssW=rect.width, cssH=rect.height;
    // pad 与 canvas CSS 尺寸对应（chartCanvas 用 parent.clientWidth）
    const pad=_linePad;
    const pts=_linePts, infos=_lineInfos;
    if(!pts.length) return;
    // 计算 x 在图表区的归一化位置
    let x = clientX - rect.left;
    // clamp 到绘图区
    x = Math.max(pad, Math.min(cssW - pad, x));
    const t = (x - pad) / Math.max(1, cssW - 2*pad);
    const idx = Math.round(t * (pts.length - 1));
    const clamped=Math.max(0, Math.min(pts.length-1, idx));
    const bal=pts[clamped], info=infos[clamped];
    const min=_lineMin, max=_lineMax, span=Math.max(1,max-min);
    const y = cssH - pad - (bal - min)/span*(cssH - 2*pad);
    // 定位 cross
    const xCss = pad + (clamped/Math.max(1,pts.length-1))*(cssW - 2*pad);
    cross.style.left = xCss + 'px';
    cross.style.top = pad + 'px';
    cross.style.height = (cssH - 2*pad) + 'px';
    cross.hidden=false;
    // tooltip 内容：显示时间/收支/余额，并提示范围（前后1点）
    const prev = clamped>0 ? pts[clamped-1] : null;
    const next = clamped<pts.length-1 ? pts[clamped+1] : null;
    const range = (prev!=null||next!=null) ? `<span style="color:#a8b0d0">范围 ¥${Math.min(bal, prev??bal, next??bal).toLocaleString('zh-CN')} ~ ¥${Math.max(bal, prev??bal, next??bal).toLocaleString('zh-CN')}</span>` : '';
    const amtStr = info.amt ? (info.amt>0?`+${fmt(info.amt)}`:fmt(info.amt)) : '';
    const label = info.label ? info.label.replace(/</g,'&lt;') : '';
    tip.innerHTML = `<b>${fmt(bal)}</b> <span style="color:#a8b0d0">#${clamped+1}/${pts.length}</span><br><span style="color:#c9d1ec">${info.ts||''} ${label}</span>${amtStr?` <b style="color:${info.amt>=0?'#7ee787':'#ffb4b4'}">${amtStr}</b>`:''}<br>${range}`;
    tip.hidden=false;
    // 定位 tip，避免溢出
    // 先临时显示测宽高
    tip.style.left = xCss + 'px';
    tip.style.top = (y - 8) + 'px';
    // 边界修正
    requestAnimationFrame(()=>{
      const r=tip.getBoundingClientRect(), wr=wrap.getBoundingClientRect();
      let nx=xCss, ny=y - 8;
      // 左右溢出
      if(r.right > wr.right - 4) nx = wr.right - r.width/2 - 4 - wr.left;
      if(r.left < wr.left + 4) nx = r.width/2 + 4;
      // 顶部溢出
      if(r.top < wr.top + 4) ny = y + 18;
      tip.style.left = nx + 'px';
      tip.style.top = ny + 'px';
    });
  };
  const hide=()=>{
    tip.hidden=true; cross.hidden=true;
  };
  const onMove=(e)=>{
    const isTouch = e.touches && e.touches[0];
    const cx = isTouch ? e.touches[0].clientX : e.clientX;
    const cy = isTouch ? e.touches[0].clientY : e.clientY;
    showAt(cx, cy, !!isTouch);
  };
  cv.addEventListener('mousemove', onMove);
  cv.addEventListener('mouseleave', hide);
  cv.addEventListener('mouseenter', onMove);
  // 触摸：长按即显示，移动跟随，抬起后 1.5s 隐藏
  let touchTimer=null, touching=false;
  cv.addEventListener('touchstart', e=>{
    touching=true;
    if(e.cancelable) e.preventDefault();
    onMove(e);
    clearTimeout(touchTimer);
  }, {passive:false});
  cv.addEventListener('touchmove', e=>{
    if(!touching) return;
    if(e.cancelable) e.preventDefault();
    onMove(e);
  }, {passive:false});
  cv.addEventListener('touchend', ()=>{
    touching=false;
    clearTimeout(touchTimer);
    touchTimer=setTimeout(hide, 1500);
  });
  cv.addEventListener('touchcancel', hide);
}

function drawDonutChart(){
  const c=chartCanvas('donut'); if(!c) return;
  const {g,w,h}=c;
  const data=RORDER.filter(r=> r!=='NB' || (S.stats.byR.NB||0)>0).map(r=>[r,S.stats.byR[r]||0]); // NB 未抽到前隐藏
  const rawTotal=data.reduce((s,x)=>s+x[1],0);
  if(!rawTotal){
    g.font='12px system-ui'; g.fillStyle='#9aa4c8'; g.textAlign='center';
    g.fillText('暂无占比，抽卡后自动统计', w/2, h/2);
    return;
  }
  const total=Math.max(1,rawTotal);
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
  if(!entries.length){
    const c=chartCanvas('vendor', 180); if(!c) return;
    const {g,w,h}=c;
    g.font='12px system-ui'; g.fillStyle='#9aa4c8'; g.textAlign='center';
    g.fillText('暂无厂商数据，抽卡后自动统计', w/2, h/2);
    return;
  }
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

/* ---------- CSV 导出 ---------- */
function _csvEscape(s){
  s=String(s);
  return /[",\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s;
}
function _downloadCSV(rows, filename){
  const csv = rows.map(r=>r.map(_csvEscape).join(',')).join('\n');
  const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url; a.download=filename; a.click();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
}
function exportLedgerCSV(){
  const rows=[['时间','收支','金额','余额']];
  // ledger 是倒序（新在前），导出按时间正序并重算余额更直观
  let bal=START_MONEY;
  const led=[...S.ledger].reverse();
  if(!led.length) rows.push(['-','初始资金', START_MONEY, START_MONEY]);
  else {
    for(const l of led){ bal=Math.max(0,bal+l.amt); rows.push([l.ts, l.label, l.amt, bal]); }
  }
  // 若截断，提示
  if(S.ledger.length>=80) rows.unshift(['# 仅最近80条（更早记录已截断）','','','']);
  _downloadCSV(rows, `tokengacha-ledger-${new Date().toISOString().slice(0,10)}.csv`);
  toast('📥 收支明细已导出 CSV');
}
function exportHistCSV(){
  const rows=[['时间','卡池','模型','稀有度','智能指数','厂商']];
  const hist=[...(S.hist||[])].slice().reverse();
  if(!hist.length) { toast('暂无出货记录'); if(typeof SFX!=='undefined'&&SFX.bad) SFX.bad(); return; }
  for(const h of hist){
    const m=MMAP[h.m];
    const t=new Date(h.t);
    const ts=`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')} ${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`;
    let poolName=(POOLS[h.pool]&&POOLS[h.pool].name)||h.pool||'';
    if(h.pool==='banner' && h.season){ const s=BANNER_SEASONS.find(x=>x.id===h.season); if(s) poolName=s.name; }
    rows.push([ts, poolName, m.name, h.r, Math.round(m.idx), m.vendor]);
  }
  _downloadCSV(rows, `tokengacha-hist-${new Date().toISOString().slice(0,10)}.csv`);
  toast('📥 出货记录已导出 CSV');
}

/* ---------- 启动 ---------- */
applySkin(S.skin||'classic');
boot();
