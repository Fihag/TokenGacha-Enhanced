"use strict";
/* ================================================================
   TokenGacha · 界面层 (ui.js)
   路由 / 渲染 / 抽卡流程 / 工作流 / 结局 / 弹窗 / 分享 / 充值 / 事件绑定 / 启动
   ================================================================ */

/* ---------- 路由 ---------- */
const PAGES=['buy','work','balance','activity','data'];
function go(page){
  if(!PAGES.includes(page)) page='buy';
  for(const p of PAGES){
    $('page-'+p).classList.toggle('active', p===page);
  }
  document.querySelectorAll('.top-nav button').forEach(b=>b.classList.toggle('active', b.dataset.page===page));
  if(location.hash!=='#'+page) history.replaceState(null,'','#'+page);
  renderAll();
}
document.querySelectorAll('.top-nav button').forEach(b=>b.onclick=()=>{ SFX.click(); go(b.dataset.page); });
addEventListener('hashchange',()=>go(location.hash.slice(1)));

/* ---------- 渲染: 购买Token ---------- */
function renderBuy(){
  const box=$('pool-cards'); box.innerHTML='';
  for(const [k,p] of Object.entries(POOLS)){
    if(p.banner && !isBannerActive()) continue; // 活动结束下架
    const card=document.createElement('div');
    card.className='pool-card'+(p.rec?' rec':'');
    card.style.setProperty('--pc', p.color);
    const pity=S.pity[k];
    const useFree = k==='standard' && S.freeTen>0;
    const seg=RORDER.map(r=> p.rates[r]? `<i style="width:${(p.rates[r]||0)*100}%;background:${RARITY[r].hex}" title="${r} ${((p.rates[r]||0)*100).toFixed(1)}%"></i>`:'').join('');
    const pityMax = p.pityMax || PITY_MAX;
    card.innerHTML=`<div class="accent"></div><div class="pool-body">
      <div><div class="pool-name">${p.name}</div><div class="pool-sub">${p.sub}</div></div>
      <div class="pool-price">${p.oldPrice?`<s>¥${p.oldPrice}</s><em class="arrow">→</em><b>¥${p.price}</b>`:`<b>¥${p.price}</b>`}<span>/ 抽 · 十连 ${p.oldTenPrice?`<s>¥${p.oldTenPrice}</s><em class="arrow">→</em><b>¥${p.tenPrice}</b>`:`¥${p.tenPrice}`}</span><span class="rtp-tag ${poolRTP(k)<1?'low':''}">回本率 ${(poolRTP(k)*100).toFixed(0)}%</span></div>
      <div class="featured-row"></div>
      <div class="rates-bar" title="稀有度分布">${seg}</div>
      <div class="rates-legend">${RORDER.filter(r=>p.rates[r]).map(r=>`<span style="color:${RARITY[r].hex}">■</span>${r} ${((p.rates[r]||0)*100).toFixed(1)}%`).join('　')}</div>
      <div class="pity-row"><span>保底 ${pity}/${pityMax}</span><div class="pity-bar"><i style="width:${pity/pityMax*100}%"></i></div></div>
      <div class="pool-btns">
        <button class="pull-btn p1" data-pool="${k}" data-n="1" ${S.money<p.price?'disabled':''}>单抽<small>¥${p.price}</small></button>
        <button class="pull-btn p10" data-pool="${k}" data-n="10" ${(!useFree&&S.money<p.tenPrice)?'disabled':''}>十连抽<small>${useFree?'新手赠送 · 免费！':'¥'+p.tenPrice+' · 必出SR+'}</small>${useFree?`<span class="free-tag">免费 ×${S.freeTen}</span>`:''}</button>
      </div>
      <div class="pool-note">${p.note}</div>
    </div>`;
    const fr=card.querySelector('.featured-row');
    for(const mid of p.featured){ fr.appendChild(iconImg(MMAP[mid].icon)); }
    fr.insertAdjacentHTML('beforeend','<span>UP 渠道</span>');
    if(p.banner) fr.insertAdjacentHTML('beforeend',`<span style="color:#ff2d55;font-weight:800" id="banner-countdown">⏳ ${bannerCountdownText()}</span>`);
    box.appendChild(card);
  }
  $('buy-tokens').textContent = fmtK(totalTokens())+' tokens';
  $('buy-tasks').textContent = totalTasks();
  box.querySelectorAll('.pull-btn').forEach(b=>b.onclick=()=>tryPull(b.dataset.pool, +b.dataset.n));
}

/* ---------- 渲染: 工作页 ---------- */
function renderWork(){
  const tk=totalTokens(), tasks=totalTasks();
  $('w-tokens').innerHTML=fmtK(tk)+' <small>tokens</small>';
  $('w-tasks').innerHTML=tasks+' <small>单</small>';
  $('w-est').textContent=fmt(estValue());
  const rows=$('rarity-rows'); rows.innerHTML='';
  const maxQ=RARITY.UTR.quota*3;
  const groups={};
  for(const r of RORDER) groups[r]=[];
  for(const c of S.inv){ if(c.tokens>0) groups[MMAP[c.m].r].push(c); }
  for(const r of [...RORDER].reverse()){
    const cards=groups[r];
    const tkR=cards.reduce((s,c)=>s+c.tokens,0);
    const estR=cards.reduce((s,c)=>s+(c.tokens/TASK_TOKENS)*expectedTaskPay(MMAP[c.m]),0);
    rows.insertAdjacentHTML('beforeend',
      `<div class="rrow" style="--rc:${RARITY[r].hex}">
        <span class="tag">${r}</span>
        <div class="bar"><i style="width:${Math.min(100,tkR/maxQ*100)}%"></i></div>
        <span class="num">${fmtK(tkR)} tok · ${Math.floor(tkR/TASK_TOKENS)}单</span>
        <span class="est">≈${fmt(estR)}</span>
      </div>`);
  }
  const bw=$('btn-work'), ba=$('btn-auto');
  const n=Math.min(BATCH_TASKS,tasks);
  bw.disabled = working || tasks<=0;
  ba.disabled = working || tasks<=0;
  $('work-sub').textContent = tasks>0 ? `一键完成 ${n} 单 · 消耗 ${fmtK(n*TASK_TOKENS)} tokens` : '没有可用 token，去「购买Token」';
  $('auto-sub').textContent = tasks>0 ? `全部 ${tasks} 单一次清完 · ${fmtK(tk)} tokens` : '没有可用 token';
}
function renderWorkLog(){
  // 日志只在会话内保留，渲染由 addWorkLog 完成
}
function addWorkLog(label, amt){
  const log=$('work-log');
  const row=document.createElement('div'); row.className='row';
  row.innerHTML=`<span class="evt">${label}</span><span class="amt ${amt>=0?'pos':'neg'}">${amt>=0?'+':''}${fmt(amt)}</span>`;
  log.prepend(row); while(log.children.length>20) log.lastChild.remove();
}

/* ---------- 渲染: 余额页 ---------- */
function renderBalance(){
  $('b-money').textContent=fmt(S.money);
  $('b-cheat').textContent = S.flags.cheated ? '💳 作弊模式 · 成就已关闭' : '';
  $('b-cheat').style.cssText = S.flags.cheated ? 'font-size:10px;background:#fef2f2;color:#b91c1c;padding:2px 8px;border-radius:8px;border:1px solid #fecaca;font-weight:700' : '';
  $('b-earn').textContent=fmt(S.stats.earn);
  $('b-spent').textContent=fmt(S.stats.spent);
  $('b-tokval').textContent=fmt(estValue());
  $('b-free-bar').style.width=Math.min(100,S.money/VICTORY_AT*100)+'%';
  $('b-free-txt').textContent=`${fmt(S.money)} / ${fmt(VICTORY_AT)}`;
  const ll=$('ledger-list');
  if(!S.ledger.length){ ll.innerHTML='<div class="ledger-empty">暂无收支记录</div>'; }
  else ll.innerHTML=S.ledger.map(l=>`<div class="lrow"><span class="lab"><small>${l.ts}</small>${l.label}</span><span class="amt ${l.amt>=0?'pos':'neg'}">${l.amt>=0?'+':''}${fmt(l.amt)}</span></div>`).join('');
  const best=S.stats.best?MMAP[S.stats.best]:null;
  const cells=[
    ['总抽数',S.stats.pulls],['工作单数',S.stats.tasks],['大成功',S.stats.greats],['删库事故',S.stats.disasters],
    ['最佳出货',best?best.name:'无'],['图鉴',`${Object.keys(S.dex).length}/${MODELS.length}`],
  ];
  $('stat-grid').innerHTML=cells.map(([l,v])=>`<div class="cell"><div class="lb">${l}</div><div class="vl">${v}</div></div>`).join('')
    + RORDER.map(r=>`<div class="cell"><div class="lb">${r} 出货</div><div class="vl" style="color:${RARITY[r].hex}">${S.stats.byR[r]||0}</div></div>`).join('');
  const ch=$('channels'); ch.innerHTML='';
  const chModels=['opus5','gpt56sol','gem31pro','dsv4pro','qwen37','doubao'];
  for(const id of chModels){
    const m=MMAP[id];
    const warn=Math.random()<.2;
    ch.insertAdjacentHTML('beforeend',`<div class="ch-row"><span class="ic"></span><span>${m.vendor} 渠道</span><span class="st ${warn?'warn':''}">${warn?'● 波动':'● 正常'}</span><span class="lat">${Math.round(80+Math.random()*400)}ms</span></div>`);
    ch.lastChild.querySelector('.ic').appendChild(iconImg(m.icon));
  }
  // 卡库
  const g=$('inv-grid'); g.innerHTML='';
  $('inv-total').textContent=`共 ${S.inv.length} 张 · 耗尽自动移除`;
  if(!S.inv.length){ g.innerHTML='<div class="inv-empty" style="grid-column:1/-1">卡库空空如也<br>去「购买Token」抽个盲盒吧</div>'; }
  else{
    const sorted=[...S.inv].sort((a,b)=> RORDER.indexOf(MMAP[b.m].r)-RORDER.indexOf(MMAP[a.m].r) || b.tokens-a.tokens);
    for(const c of sorted){
      const m=MMAP[c.m], r=RARITY[m.r];
      const d=document.createElement('div');
      d.className='inv-card'+(c.tokens<=0?' dead':'');
      d.style.setProperty('--rc', r.hex);
      d.innerHTML=`<span class="rt">${r.name}</span>${c.half?'<span class="half">体验</span>':''}`;
      d.appendChild(iconImg(m.icon));
      d.insertAdjacentHTML('beforeend',`<div class="nm">${m.name}</div><div class="tk">${c.tokens>0?fmtK(c.tokens)+' tok':'已耗尽'}</div>`);
      d.title=`${m.name} · ${m.vendor}\n智能指数 ${m.idx} · 真实成本 ${m.cost}\n${m.quote}`;
      g.appendChild(d);
    }
  }
}

/* ---------- 渲染: 头部 ---------- */
let shownMoney = S.money;
function renderHeader(){
  $('h-tokens').textContent=fmtK(totalTokens());
  $('h-pulls').textContent=S.stats.pulls;
}
function tweenMoney(){
  const el=$('h-money');
  const from=shownMoney, to=S.money;
  if(Math.abs(to-from)<0.5){ shownMoney=to; el.textContent=fmt(to); return; }
  el.classList.remove('flash-up','flash-down'); void el.offsetWidth;
  el.classList.add(to>from?'flash-up':'flash-down');
  const t0=performance.now(), dur=450;
  (function step(t){
    const k=Math.min(1,(t-t0)/dur);
    shownMoney=from+(to-from)*k;
    el.textContent=fmt(shownMoney);
    if(k<1) requestAnimationFrame(step); else shownMoney=to;
  })(t0);
}
function renderAll(){
  renderHeader(); tweenMoney(); renderBuy(); renderWork(); renderBalance();
  if(typeof renderActivity==='function') renderActivity();
  if(typeof renderData==='function') renderData();
}

/* ---------- 抽卡流程 ---------- */
let pulling=false;
function tryPull(poolKey, count){
  if(pulling) return;
  const p=POOLS[poolKey];
  const useFree = poolKey==='standard' && count===10 && S.freeTen>0;
  const cost = count===10 ? p.tenPrice : p.price;
  if(!useFree && S.money<cost){ toast('💸 余额不足！先去「工作」赚钱'); SFX.bad(); return; }
  if(useFree){ S.freeTen--; addLedger('新手赠送 · 白银盲盒十连', 0); }
  else { S.money-=cost; S.stats.spent+=cost; addLedger(`购买${p.name} ×${count}`, -cost); }
  SFX.pull();
  const cards = doPulls(poolKey, count);
  save(); renderAll();
  showGacha(cards, p);
}
function showGacha(cards, pool){
  pulling=true;
  const ov=$('overlay'), row=$('gacha-row');
  $('overlay-title').textContent = cards.length>1 ? `✨ ${pool.name} · 十连抽 ✨` : `✨ ${pool.name} · 单抽 ✨`;
  $('gacha-summary').classList.remove('show');
  $('close-overlay').classList.remove('show');
  row.innerHTML=''; ov.classList.add('show');
  let skipped=false, flippedCount=0;
  const els = cards.map((c,i)=>{
    const m=MMAP[c.m], r=RARITY[m.r];
    const d=document.createElement('div');
    d.className='gcard'+(m.r==='UR'||m.r==='UTR'?' ur':'');
    d.style.setProperty('--rc', r.hex);
    d.innerHTML=`<div class="inner">
      <div class="face back"><div class="q">?</div><small>API 盲盒</small></div>
      <div class="face front">
        <div class="rr">${r.name} · ${r.label}</div>
        <div class="ic"></div>
        <div class="nm">${m.name}</div>
        <div class="vd">${m.vendor}${c.half?' · 体验卡':''}</div>
        <div class="idx">智能指数 ${m.idx}</div>
        <div class="tk">⚡ ${fmtK(c.tokens)} tokens</div>
      </div></div>`;
    d.querySelector('.ic').appendChild(iconImg(m.icon));
    d.onclick=()=>flipOne(i);
    row.appendChild(d);
    return d;
  });
  function flipOne(i){
    const el=els[i];
    if(el.classList.contains('flipped')) return;
    el.classList.add('flipped','pop');
    flippedCount++;
    const r=MMAP[cards[i].m].r;
    SFX.flip(i);
    if(r==='SSR'||r==='UR'||r==='UTR'){
      setTimeout(()=>{
        SFX.rarity(r);
        const rect=el.getBoundingClientRect();
        burst(rect.left+rect.width/2, rect.top+rect.height/2,
          r==='UTR'?['#ff2d55','#f59e0b','#2f6bff','#fff']:(r==='UR'?['#ff5f6d','#f59e0b','#2f6bff','#fff']:['#f59e0b','#fde68a','#fff']),
          r==='UTR'?160:(r==='UR'?120:70), r==='UTR'?11:(r==='UR'?9:7));
        if(r==='UR'||r==='UTR') shake();
      }, 250);
    }
    if(flippedCount>=cards.length) finish();
  }
  cards.forEach((c,i)=> setTimeout(()=>{ if(!skipped) flipOne(i); }, 450+i*380));
  $('skip-btn').onclick=()=>{ skipped=true; els.forEach((e,i)=>{ if(!e.classList.contains('flipped')) setTimeout(()=>flipOne(i), i*40); }); };
  function finish(){
    const totTok = cards.reduce((s,c)=>s+c.tokens,0);
    const best = cards.reduce((a,c)=> RORDER.indexOf(MMAP[c.m].r)>RORDER.indexOf(MMAP[a.m].r)?c:a, cards[0]);
    const bm=MMAP[best.m];
    $('gacha-summary').innerHTML=`共获得 <b>${fmtK(totTok)} tokens</b> · 最佳: <b style="color:${RARITY[bm.r].hex}">${bm.name}</b>（${RARITY[bm.r].name}）`;
    $('gacha-summary').classList.add('show');
    $('close-overlay').classList.add('show');
    save(); renderAll();
  }
  $('close-overlay').onclick=()=>{ ov.classList.remove('show'); pulling=false; checkEnd(); };
}

/* ---------- 工作流（批量 + 自动） ---------- */
let working=false;
const ACCEL_START=300, ACCEL_BLOCK=40, ACCEL_DECAY=0.72, MIN_INTERVAL=2; // 加速度曲线
const SFX_GAP_MIN=20, SFX_GAP_RATIO=4; // 音效节流: gap=max(20ms, 当前间隔×4)
const TERM_MAX_NODES=600;  // term-body 节点截断上限
function termPrint(){
  const term=$('term-body');
  const trim=()=>{ while(term.childNodes.length>TERM_MAX_NODES) term.firstChild.remove(); };
  return {
    reset(){ term.innerHTML='<span class="cursor"></span>'; },
    line(text){
      term.querySelector('.cursor')?.remove();
      const isRes = text.startsWith('  →');
      term.insertAdjacentHTML('beforeend', (isRes?text:escapeHtml(text))+'\n<span class="cursor"></span>');
      trim();
      term.scrollTop=term.scrollHeight;
    },
    done(text){ term.querySelector('.cursor')?.remove(); term.insertAdjacentHTML('beforeend', escapeHtml(text)); trim(); term.scrollTop=term.scrollHeight; }
  };
}
function escapeHtml(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// 原子结算: 动画开始前一次性入账, 刷新页面也不会丢统计
// 返回 {total: 名义合计, applied: 实际到账(余额被 clamp 到 0 后的真实变化量)}
function settleItems(items){
  if(typeof dailyResetIfNeeded==='function') dailyResetIfNeeded(); // 跨天先重置今日计数
  const before=S.money;
  let total=0;
  for(const it of items){
    const amt=it.res.amt;
    S.money=Math.max(0,S.money+amt);
    if(amt>0) S.stats.earn+=amt;
    if(amt>0 && typeof S.daily==='object') S.daily.earnToday=(S.daily.earnToday||0)+amt;
    S.stats.tasks++;
    S.daily.tasks=(S.daily.tasks||0)+1;
    if(it.res.evt==='disaster') S.stats.disasters++;
    else if(it.res.evt==='great') S.stats.greats++;
    total+=amt;
  }
  save();
  return {total, applied:S.money-before};
}
// lines: [{text, amt?, evt?}]，纯视觉回放（入账已在 settleItems 完成）
// 加速度动画: 前 ACCEL_START 行原速, 之后每 ACCEL_BLOCK 行 interval×ACCEL_DECAY, 下限 MIN_INTERVAL
// 音效节流: 事件行按 gap=max(SFX_GAP_MIN, 当前间隔×SFX_GAP_RATIO) 节流, 加速度越高越密但不过快
function runLines(lines, interval, onDone){
  const tp=termPrint(); tp.reset();
  let i=0, timer=null, lastSfx=0, boosted=false;
  const finish=()=>{ document.removeEventListener('visibilitychange', onVis); onDone(tp); };
  const step=()=>{
    if(i>=lines.length){ finish(); return; }
    if(document.hidden){
      // 后台标签页: 浏览器节流 setInterval 到 ≥1s, 直接快进完成
      while(i<lines.length){
        const L=lines[i];
        tp.line(L.text);
        if(L.evt==='disaster') SFX.bad();
        else if(L.evt==='great') SFX.coin();
        if(L.amt!=null) tweenMoney();
        i++;
      }
      finish(); return;
    }
    let next=interval;
    if(i>=ACCEL_START){
      if(!boosted){ boosted=true; SFX.boost(); } // 进入加速段: 播加速音效
      next=Math.max(MIN_INTERVAL, interval*Math.pow(ACCEL_DECAY, Math.floor((i-ACCEL_START)/ACCEL_BLOCK)));
    }
    const L=lines[i];
    tp.line(L.text);
    const now=performance.now();
    if((L.evt==='disaster'||L.evt==='great') && now-lastSfx>=Math.max(SFX_GAP_MIN, next*SFX_GAP_RATIO)){
      lastSfx=now;
      if(L.evt==='disaster') SFX.bad();
      else SFX.coin();
    }
    if(L.amt!=null) tweenMoney();
    i++;
    timer=setTimeout(step, next);
  };
  const onVis=()=>{ if(document.hidden){ clearTimeout(timer); step(); } };
  document.addEventListener('visibilitychange', onVis);
  timer=setTimeout(step, interval);
}
function composeLines(items, {rich=true, maxDetail=Infinity}={}){
  const L=[];
  const n=items.length;
  items.forEach((it,i)=>{
    const showDetail = i<maxDetail;
    if(showDetail){
      L.push({text:`> [${i+1}/${n}] 接单 ${pick(CLIENT_REQS)} ｜ 调度: ${it.m.name}`});
      if(rich){
        const k=2+Math.floor(Math.random()*2);
        for(let j=0;j<k;j++) L.push({text:pick(MEME_LINES)});
        if(Math.random()<.4) L.push({text:pick(MID_REQS)});
        L.push({text:pick(OK_LINES)});
      }
    } else if(i===maxDetail){
      L.push({text:`> …其余 ${n-i} 单全速交付中…`});
    }
    const tag=(it.res.boosted?'🚀 限定×2 ':'')+({great:'🤩 大成功', ok:'✅ 交付', rework:'🔧 返工', disaster:'💥 删库'}[it.res.evt]);
    L.push({text:`  → [${i+1}/${n}] ${it.m.name} 结算 ${it.res.amt>=0?'+':''}${fmt2(it.res.amt)} ｜ ${tag}`, amt:it.res.amt, evt:it.res.evt});
  });
  return L;
}
function finishWork(tp, items, modeLabel, applied){
  const evts={great:0,ok:0,rework:0,disaster:0};
  const boostCount=items.filter(x=>x.res.boosted).length;
  items.forEach(x=>evts[x.res.evt]++);
  tp.done(`\n> ${modeLabel} 完成 ${items.length} 单 ｜ 🤩×${evts.great} ✅×${evts.ok} 🔧×${evts.rework} 💥×${evts.disaster}${boostCount?` 🚀限定×${boostCount}`:''}\n> 合计入账 ${applied>=0?'+':''}${fmt2(applied)}${evts.disaster?'\n> ⚠ 有删库事故，已自动购买数据库恢复服务':''}`);
  addWorkLog(`${modeLabel} ×${items.length} ｜ 🤩${evts.great} ✅${evts.ok} 🔧${evts.rework} 💥${evts.disaster}${boostCount?' 🚀×'+boostCount:''}`, applied);
  addLedger(`${modeLabel} ×${items.length} 单`, applied);
  const rect=$('term-body').getBoundingClientRect();
  bigMoneyPop(applied);
  coinShower(rect, applied);
  if(evts.great>0||applied>500){ burst(rect.left+rect.width/2, rect.top+100, ['#16a34a','#f59e0b','#fff'], 50, 6); }
  if(evts.disaster>0) shake();
  working=false; save(); renderAll(); checkEnd();
  if(totalTasks()<=0 && S.money<minPoolPrice()) return;
  if(totalTasks()<=0) toast('⚡ Token 已全部耗尽 → 去「购买Token」抽下一波');
}
function doWork(){
  if(working) return;
  const n=Math.min(BATCH_TASKS,totalTasks());
  if(n<=0){ toast('没有可用 token，先去抽卡！'); SFX.bad(); return; }
  working=true; renderWork();
  SFX.click();
  const items=consumeTasks(n);
  const settled=settleItems(items);
  const lines=composeLines(items,{rich:true});
  runLines(lines, 42, tp=>finishWork(tp, items, '批量工作', settled.applied));
}
function doAuto(){
  if(working) return;
  const n=totalTasks();
  if(n<=0){ toast('没有可用 token，先去抽卡！'); SFX.bad(); return; }
  working=true; renderWork();
  SFX.pull();
  const items=consumeTasks(n);
  const settled=settleItems(items);
  const lines=composeLines(items,{rich:false, maxDetail:12});
  runLines(lines, 16, tp=>finishWork(tp, items, '⚡ 自动模式', settled.applied));
}

/* ---------- 结局检测 ---------- */
// 全场最低单抽价（限定池下架时不计入）
function minPoolPrice(){
  return Math.min(...Object.values(POOLS).filter(p=>!p.banner||isBannerActive()).map(p=>p.price));
}
function checkEnd(){
  if(!S.flags.cheated) for(const ms of MILESTONES){
    if(S.money>=ms.at && !S.flags.ms[ms.id]){
      S.flags.ms[ms.id]=true; save();
      SFX.win();
      burst(innerWidth/2, innerHeight/3, ['#f59e0b','#2f6bff','#ff5f6d','#fff'], ms.at>=100000?320:200, ms.at>=100000?13:11);
      setTimeout(()=>showModal(milestoneHTML(ms)), 400);
      return;
    }
  }
  // 破产: token 全部耗尽 且 余额不足以最便宜单抽
  const minCost=minPoolPrice();
  if(S.money<minCost && totalTasks()<=0 && S.freeTen<=0 && !pulling && !working){
    SFX.bad();
    showModal(bankruptHTML(), true);
  }
}

/* ---------- 弹窗 ---------- */
function showModal(html, lock=false){ const b=$('modal-box'); b.innerHTML=html; if(lock) b.dataset.locked='1'; else delete b.dataset.locked; $('modal-mask').classList.add('show'); }
$('modal-mask').addEventListener('click', e=>{ if(e.target.id==='modal-mask' && !$('modal-box').dataset.locked) $('modal-mask').classList.remove('show'); });
function closeModal(){ $('modal-mask').classList.remove('show'); }

/* ---------- 分享 ---------- */
let shareCtx={cv:null,ms:null};
function shareText(ms){
  const best=S.stats.best?MMAP[S.stats.best].name:'无';
  if(ms) return `【${ms.title} ${ms.tag}】我在 TokenGacha 抽卡模拟器达成新成就！抽卡 ${S.stats.pulls} 次、打工 ${S.stats.tasks} 单，现在余额 ${fmt(S.money)}。70% 的玩家最终破产，你能成为持续赚钱的那 30% 吗？👉 ${SITE_URL}`;
  return `我在 TokenGacha 抽卡模拟器鏖战至今：余额 ${fmt(S.money)}，抽卡 ${S.stats.pulls} 次，最佳出货 ${best}，删库 ${S.stats.disasters} 次🤡。70% 的玩家最终破产，你能成为那 30% 吗？👉 ${SITE_URL}`;
}
function roundRectPath(g,x,y,w,h,r){ g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); }
function drawShareCard(ms){
  const W=900,H=500,cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  const g=cv.getContext('2d');
  const gr=g.createLinearGradient(0,0,W,H);
  gr.addColorStop(0,'#eaf1ff'); gr.addColorStop(.55,'#f6f3ff'); gr.addColorStop(1,'#fff7ea');
  g.fillStyle=gr; g.fillRect(0,0,W,H);
  for(const [c,x,y,r] of [['#2f6bff',60,60,90],['#9333ea',840,80,70],['#f59e0b',820,430,100],['#41d9ff',80,440,60]]){
    g.globalAlpha=.08; g.fillStyle=c; g.beginPath(); g.arc(x,y,r,0,7); g.fill();
  }
  g.globalAlpha=1; g.textAlign='center';
  const F='"PingFang SC","Microsoft YaHei",system-ui';
  g.font='44px '+F; g.fillText('🎰',W/2,86);
  g.font='900 30px '+F; g.fillStyle='#1c2340'; g.fillText('TokenGacha · LLM API 中转站',W/2,128);
  g.font='900 46px '+F; g.fillStyle=ms?'#d97706':'#2f53d8';
  g.fillText(ms?ms.title:'我的抽卡战绩',W/2,196);
  if(ms){ g.font='600 22px '+F; g.fillStyle='#67719a'; g.fillText(ms.tag,W/2,232); }
  g.font='900 64px '+F; g.fillStyle='#d97706';
  g.fillText('¥'+Math.round(S.money).toLocaleString('zh-CN'), W/2, ms?300:288);
  g.font='500 18px '+F; g.fillStyle='#98a2c8'; g.fillText('账户余额', W/2, ms?330:318);
  const best=S.stats.best?MMAP[S.stats.best].name:'—';
  const cells=[['抽卡次数',S.stats.pulls],['工作单数',S.stats.tasks],['删库事故',S.stats.disasters],['最佳出货',best]];
  const cw=180,gap=16,x0=(W-(cw*4+gap*3))/2,y0=352;
  cells.forEach(([l,v],i)=>{
    const x=x0+i*(cw+gap);
    g.fillStyle='rgba(255,255,255,.78)'; roundRectPath(g,x,y0,cw,86,14); g.fill();
    g.strokeStyle='#e3e8f2'; g.stroke();
    g.font='500 15px '+F; g.fillStyle='#98a2c8'; g.fillText(l,x+cw/2,y0+30);
    g.font='800 21px '+F; g.fillStyle='#1c2340'; g.fillText(String(v),x+cw/2,y0+62);
  });
  g.font='700 20px '+F; g.fillStyle='#2f6bff';
  g.fillText('70% 玩家最终破产，你能成为那 30% 吗？👉 tokengacha.metagaruta.com', W/2, 478);
  return cv;
}
function shareHTML(ms){
  return `<h3>📣 分享战绩<button class="x" onclick="closeModal()">×</button></h3>
  <div style="border-radius:12px;overflow:hidden;border:1px solid var(--line);margin-bottom:12px;box-shadow:var(--shadow)"><img id="share-img" style="width:100%;display:block" alt="分享图"></div>
  <div style="background:var(--panel2);border:1px solid var(--line);border-radius:10px;padding:10px 12px;font-size:12px;color:var(--dim);margin-bottom:12px;line-height:1.6">${shareText(ms)}</div>
  <div style="display:flex;gap:8px;flex-wrap:wrap">
    <button class="big-btn" style="flex:1;margin-top:0;min-width:130px" id="btn-copy-share">📋 复制文案</button>
    <button class="big-btn ghost" style="flex:1;margin-top:0;min-width:130px" id="btn-dl-share">🖼️ 保存图片</button>
    ${(typeof navigator!=='undefined'&&navigator.share)?'<button class="big-btn ghost" style="flex:1;margin-top:0;min-width:130px" id="btn-sys-share">📤 系统分享</button>':''}
  </div>`;
}
function openShare(ms){
  const cv=drawShareCard(ms);
  shareCtx={cv,ms};
  showModal(shareHTML(ms));
  $('share-img').src=cv.toDataURL('image/png');
}
function copyText(t){
  const done=()=>toast('📋 分享文案已复制，去粘贴给小伙伴吧');
  const legacy=()=>{ const ta=document.createElement('textarea'); ta.value=t; ta.style.cssText='position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); try{document.execCommand('copy');}catch(e){} ta.remove(); };
  if(typeof navigator!=='undefined'&&navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(t).then(done).catch(()=>{legacy();done();}); }
  else { legacy(); done(); }
}
/* ---------- 充值（作弊模式） ---------- */
const TOPUP_MAX = 64800;
function topupHTML(){
  const tiers=[6,30,68,128,328,648,6480,64800];
  return `<h3>💳 充值中心（作弊模式）<button class="x" onclick="closeModal()">×</button></h3>
  <div class="notice" style="margin-bottom:12px"><span class="dot"></span><span>⚠️ <b>作弊警告</b>：充值后本局将<b>永久关闭成就系统</b>（🎉 小有所成 / 🏆 财富自由 / 👑 传奇大亨 均无法再解锁）。已解锁的成就保留，余额页将打上「作弊」标记。</span></div>
  <p style="font-size:13px;color:var(--dim);margin-bottom:4px">输入充值金额（单次上限 <b>¥64,800</b>）：</p>
  <input id="topup-amt" type="number" min="1" max="64800" step="1" placeholder="想充多少，自己填" style="width:100%;padding:12px 14px;font-size:18px;font-weight:800;border:1.5px solid var(--line);border-radius:12px;margin:6px 0 12px;font-variant-numeric:tabular-nums;color:var(--txt);background:var(--panel2);outline:none">
  <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">${tiers.map(t=>`<button class="mini-btn" data-amt="${t}" style="flex:1;min-width:64px;padding:8px 4px">¥${t.toLocaleString('zh-CN')}</button>`).join('')}</div>
  <div class="note">双倍返利？没有。首充礼包？也没有。这里是作弊，不是福利。</div>
  <button class="big-btn danger" id="btn-do-topup">确认充值（并放弃成就）</button>`;
}
function doTopup(){
  const raw=($('topup-amt')&&$('topup-amt').value||'').trim();
  const v=Number(raw);
  if(!raw||!isFinite(v)||v<=0){ toast('请输入有效金额'); SFX.bad(); return; }
  if(v>TOPUP_MAX){ toast(`单次充值上限 ${fmt(TOPUP_MAX)}！想充更多请分多次（老赌徒了）`); SFX.bad(); return; }
  const amt=Math.round(v);
  const fromRect={left:innerWidth/2-60,top:innerHeight/2-40,width:120,height:80};
  S.money+=amt;
  S.flags.cheated=true;
  addLedger('💳 充值（作弊模式）', amt);
  save(); closeModal(); renderAll();
  SFX.coin();
  bigMoneyPop(amt);
  coinShower(fromRect, amt);
  toast(`💳 充值 ${fmt(amt)} 已到账！成就系统已永久关闭（本局）`, 3000);
  checkEnd();
}
function rtCell(r){ return `<span class="rt-${r}">${RARITY[r].name}</span>`; }
function ratesHTML(){
  let rows='';
  for(const [k,p] of Object.entries(POOLS)){
    if(p.banner && !isBannerActive()) continue;
    rows+=`<tr><td><b style="color:${p.color}">${p.name}</b><br><small>¥${p.price}/抽 · ¥${p.tenPrice}/十连</small></td>
      ${['N','R','SR','SSR','UR','UTR'].map(r=>`<td>${p.rates[r]?rtCell(r)+'<br>'+((p.rates[r]||0)*100).toFixed(1)+'%':'—'}</td>`).join('')}
      <td>${(poolRTP(k)*100).toFixed(0)}%</td></tr>`;
  }
  return `<h3>📊 概率公示（像正规抽卡游戏一样诚实）<button class="x" onclick="closeModal()">×</button></h3>
  <table><tr><th>卡池</th><th>N 垃圾</th><th>R 普通</th><th>SR 精锐</th><th>SSR 传说</th><th>UR 神话</th><th>UTR 超神话</th><th>期望回本率</th></tr>${rows}</table>
  <div class="note">
  · ⚠️ 卡池页展示的「回本率」为宣传口径，你懂的；上表才是实测数学期望。本站保留最终解释权。<br>
  · 稀有度按 <a href="https://artificialanalysis.ai/leaderboards/models" target="_blank">Artificial Analysis 智能指数 v4.1</a> 分档：UTR≥64 / UR 55-63 / SSR 47-54 / SR 40-46 / R 28-39 / N&lt;28<br>
  · 每池 ${PITY_MAX} 抽无 SSR+ 触发保底（80% SSR / 20% UR）；限定池 90 抽大保底 80% 出限定；十连必出 SR 及以上<br>
  · 新手池为「体验卡」，token 额度 ×50%<br>
  · 工作收入 = 模型报价 × 事件倍率（大成功×2.5 / 返工×0.4 / 删库赔¥65，垃圾模型事故率高）；限定池出卡接单收入 ×2<br>
  · 本中转站期望约 7 成玩家最终破产。庄家永远赢，除非……你抽到那张卡。</div>`;
}
function dexHTML(){
  const counts={};
  for(const r of RORDER) counts[r]=MODELS.filter(m=>m.r===r).length;
  const got=Object.keys(S.dex).length;
  const html=`<h3>📖 模型图鉴 ${got}/${MODELS.length}<button class="x" onclick="closeModal()">×</button></h3>
  <div class="dex-legend">${RORDER.map(r=>`<span style="color:${RARITY[r].hex}">■</span> ${r} ${RARITY[r].label} ×${counts[r]}`).join('　')}</div>
  <div class="dex-grid" id="dex-grid"></div>
  <div class="note" style="margin-top:10px">收录 OpenAI / Anthropic / Google / xAI / DeepSeek / Moonshot / 智谱 / 阿里 / Meta / Mistral / NVIDIA / Amazon / 小米 / MiniMax / 字节 / 百度 / 腾讯 / 讯飞 等 18 家厂商。排名参考 Artificial Analysis 智能指数 v4.1。</div>`;
  showModal(html);
  const grid=$('dex-grid');
  const sorted=[...MODELS].sort((a,b)=>RORDER.indexOf(b.r)-RORDER.indexOf(a.r)||b.idx-a.idx);
  grid.innerHTML=sorted.map(m=>{
    const owned=S.dex[m.id]>0;
    return `<div class="dex-cell ${owned?'':'locked'}" style="--rc:${RARITY[m.r].hex}" title="${m.name} · ${m.vendor}&#10;${m.quote}">
      <span class="rr">${m.r}</span><div class="ic"></div>
      <div class="nm">${owned?m.name:'？？？'}</div>
      <div class="ct">${owned?`指数 ${m.idx} · 抽到 ${S.dex[m.id]} 次`:'未获得'}</div></div>`;
  }).join('');
  sorted.forEach((m,i)=>{ grid.children[i].querySelector('.ic').appendChild(iconImg(m.icon)); });
}
function helpHTML(){
  return `<h3>❓ 玩法说明<button class="x" onclick="closeModal()">×</button></h3>
  <p>你是一名独立开发者。这家中转站不卖套餐，只卖<b>盲盒</b>：抽到顶级模型还是电子垃圾，全看命。</p>
  <p>🔁 循环：<b>「购买Token」抽卡 → 「工作」用 token 接 vibe coding 私活 → 「余额」看着数字涨跌</b>。系统自动优先消耗最高稀有度的卡——好钢用在刀刃上。模型越强报价越高、翻车越少；垃圾模型还可能把客户数据库删了<b>倒赔钱</b>。</p>
  <p>⚡ 「开始工作」一键完成 ${BATCH_TASKS} 单；「自动模式」直接梭哈全部 token。资金回笼后立刻去抽下一波。</p>
   <p>💡 攻略：青铜池是新手陷阱（额度减半）；<b>白银池是本站良心，期望回本率最高</b>，主力抽它；王者池不出垃圾但 UR 仅 6%——欧皇的天堂，赌狗的坟场。余额 ≥ ${fmt(VICTORY_AT)} 即达成「财富自由」。</p>
  <p>🔥 限定池：每赛季自动轮换的限定 UP 卡池，当前为 DeepSeek V5 系列；90 抽大保底必出当期限定，限定卡接单收入 <b>翻倍</b>！</p>
  <p>📅 「活动」页每日签到 + 3 个日常任务领奖励；「数据」页可查看抽卡/收支图表。</p>
  <p>⌨️ 快捷键：<span class="kbd">空格</span> 批量接单</p>
  <button class="big-btn ghost" id="btn-reset">🗑️ 清空存档，重新来过</button>`;
}
function endStats(){
  const best=S.stats.best?MMAP[S.stats.best]:null;
  const rows=[['总抽数',S.stats.pulls],['工作单数',S.stats.tasks],['累计收入',fmt(S.stats.earn)],['累计氪金',fmt(S.stats.spent)],['大成功',S.stats.greats],['删库事故',S.stats.disasters],['最佳出货',best?best.name:'无']];
  return `<div class="end-stats">${rows.map(([l,v])=>`<div class="cell"><div class="lb">${l}</div><b>${v}</b></div>`).join('')}</div>`;
}
function bankruptHTML(){
  return `<div class="end-title">💀 破产了</div>
  <div class="end-sub">盲盒误我，垃圾模型毁我青春。<br>你与那 70% 的玩家殊途同归。</div>
  ${endStats()}
  <button class="big-btn danger" id="btn-rebirth">🔄 东山再起（重新开局 ${fmt(START_MONEY)} + 免费十连）</button>`;
}
function milestoneHTML(ms){
  return `<div class="end-title">${ms.title}</div>
  <div class="end-sub">${ms.tag}！${ms.hype}</div>
  ${endStats()}
  <button class="big-btn" data-share-ms="${ms.id}">📣 分享这一时刻</button>
  <button class="big-btn ghost" onclick="closeModal()">继续压榨中转站 →</button>`;
}
function welcomeHTML(){
  return `<h3>🎰 欢迎来到 TokenGacha</h3>
  <p>这是一家神秘的 <b>LLM API 中转站</b>。它不按量计费，只卖<b>盲盒</b>——</p>
  <p>你可能抽到 <b>Claude Opus 6</b>（限定超神话，智能指数 79，接单收入翻倍），也可能抽到<b>豆包</b>（「垃圾。」——某玩家的个人想法）。</p>
  <p>💰 启动资金 <b>${fmt(START_MONEY)}</b> 已到账，另赠<b>白银盲盒免费十连 ×1</b>。<br>三个页面完成整个循环：<b>购买Token → 工作 → 余额</b>。是破产收场还是财富自由，看你的命了。</p>
  <button class="big-btn" id="btn-start">🎁 收下启动资金，开抽！</button>`;
}

/* ---------- 事件绑定 ---------- */
$('btn-work').onclick=doWork;
$('btn-auto').onclick=doAuto;
$('go-work').onclick=()=>go('work');
$('btn-rates').onclick=()=>{ SFX.click(); showModal(ratesHTML()); };
$('btn-dex').onclick=()=>{ SFX.click(); dexHTML(); };
$('btn-help').onclick=()=>{ SFX.click(); showModal(helpHTML()); };
$('btn-copy-key').onclick=()=>{ SFX.click(); toast('🔑 令牌已复制（假的，别往代码里贴）'); };
$('btn-share').onclick=()=>{ SFX.click(); openShare(null); };
$('btn-topup').onclick=()=>{ SFX.click(); showModal(topupHTML()); const inp=$('topup-amt'); if(inp){ inp.addEventListener('keydown',e=>{ if(e.key==='Enter') doTopup(); }); inp.focus&&inp.focus(); } };
$('btn-skin').onclick=()=>{ SFX.click(); skinPickerHTML(); };
$('btn-mute').onclick=()=>{ toggleMuteUI(); };
function toggleMuteUI(){
  muted=!muted; S.flags.muted=muted; save();
  $('btn-mute').innerHTML = muted ? '🔇<span class="lbl"> 静音</span>' : '🔊<span class="lbl"> 音效</span>';
  if(muted) toast('🔇 已静音'); else toast('🔊 音效已开启');
}
// banner 倒计时: 每秒实时刷新, 活动到期自动下架
setInterval(()=>{
  const el=$('banner-countdown');
  if(!el) return;
  if(isBannerActive()) el.textContent='⏳ '+bannerCountdownText();
  else renderAll();
},1000);
document.addEventListener('keydown', e=>{
  if(e.target.tagName==='INPUT') return;
  if(e.code==='Space'){ e.preventDefault();
    if(!$('modal-mask').classList.contains('show')&&!$('overlay').classList.contains('show')&&$('page-work').classList.contains('active')) doWork();
  }
});
document.addEventListener('click', e=>{
  if(e.target.id==='btn-reset'){ localStorage.removeItem('tokengacha_v2'); location.reload(); }
  if(e.target.id==='btn-rebirth'){ const keepMuted=muted; S=defaultState(); S.flags.welcomed=true; S.flags.muted=keepMuted; shownMoney=S.money; save(); closeModal(); go('buy'); toast('🔄 新生活开始了！启动资金与免费十连已到账'); }
  if(e.target.id==='btn-start'){ S.flags.welcomed=true; save(); closeModal(); SFX.win(); toast('🎁 启动资金到账！免费十连已放入白银盲盒'); renderAll(); }
  if(e.target.dataset && e.target.dataset.shareMs){ SFX.click(); const ms=MILESTONES.find(m=>m.id===e.target.dataset.shareMs); if(ms) openShare(ms); }
  if(e.target.id==='btn-copy-share'){ SFX.click(); copyText(shareText(shareCtx.ms)); }
  if(e.target.id==='btn-dl-share'){ SFX.click(); const a=document.createElement('a'); a.href=shareCtx.cv.toDataURL('image/png'); a.download='tokengacha-share.png'; a.click(); toast('🖼️ 分享图已保存'); }
  if(e.target.id==='btn-sys-share'&&typeof navigator!=='undefined'&&navigator.share){ navigator.share({title:'TokenGacha · LLM API 中转站',text:shareText(shareCtx.ms),url:SITE_URL}).catch(()=>{}); }
  if(e.target.id==='btn-do-topup'){ doTopup(); }
  if(e.target.dataset && e.target.dataset.amt){ const inp=$('topup-amt'); if(inp) inp.value=e.target.dataset.amt; SFX.click(); }
});

/* ---------- 启动(在所有模块加载后,由 analytics.js 末尾触发) ---------- */
function boot(){
  $('notice-text').textContent = pick(NOTICES);
  $('btn-mute').innerHTML = muted ? '🔇<span class="lbl"> 静音</span>' : '🔊<span class="lbl"> 音效</span>';
  go(location.hash.slice(1) || 'buy');
  if(!S.flags.welcomed){ showModal(welcomeHTML()); }
  else checkEnd();
}
