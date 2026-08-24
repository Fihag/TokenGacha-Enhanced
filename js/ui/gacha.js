"use strict";
/* ================================================================
   TokenGacha · 抽卡流程 (拆自 ui.js)
   ================================================================ */
/* ---------- 抽卡流程 ---------- */
let pulling=false;
let lastPullAt=0, rapidCount=0, cooling=false;   // GPU 过热彩蛋: 连点计数/冻结标记
let lastRefund=0;                                 // 价格屠夫返现: 本次抽卡返现金额
let gachaCards=[], gachaEls=[], pendingHalluc=[]; // 幻觉彩蛋: 当前揭晓卡组/待修正列表
function tryPull(poolKey, count){
  if(pulling || cooling) return;
  const p=POOLS[poolKey];
  const useFree = poolKey==='standard' && count===10 && S.freeTen>0;
  const cost = count===10 ? p.tenPrice : p.price;
  if(!useFree && S.money<cost){ toast('💸 余额不足！先去「工作」赚钱'); SFX.bad(); return; }
  if(useFree){ S.freeTen--; addLedger('新手赠送 · 白银盲盒十连', 0); }
  else { S.money-=cost; S.stats.spent+=cost; addLedger(`购买${p.name} ×${count}`, -cost); }
  SFX.pull();
  if(window.tgTrack) window.tgTrack('pull', {pool:poolKey, count, cost: useFree?0:cost});
  const cards = doPulls(poolKey, count);
  // GPU 过热彩蛋: 3.5s 内连点抽卡 ≥5 次, 0.1% 触发机房冻结 3s(假补偿 10 token)
  const now=performance.now();
  rapidCount = (now-lastPullAt<=3500) ? rapidCount+1 : 1;
  lastPullAt = now;
  if(rapidCount>=5 && Math.random()<0.001) gpuCoolDown();
  // 价格屠夫返现: 抽到 DeepSeek 卡 0.2% 触发, 返还本次抽卡花费的 50%
  lastRefund=0;
  for(const c of cards){
    if(MMAP[c.m].vendor==='DeepSeek' && Math.random()<0.002){
      lastRefund = useFree ? 0 : Math.round(cost*0.5);
      if(lastRefund>0){
        S.money+=lastRefund;
        S.stats.spent=Math.max(0,S.stats.spent-lastRefund);
        addLedger('⚔️ DeepSeek 价格战返现', lastRefund);
      }
      break;
    }
  }
  save(); renderAll();
  showGacha(cards, p);
}
function simOne(poolKey, pity){
  const pool=POOLS[poolKey];
  const pityMax=pool.pityMax||PITY_MAX;
  const atPity = pity >= pityMax-1;
  const FIHAG = (typeof PROBS!=='undefined'?PROBS.FIHAG:0.0001);
  const DSV73 = (typeof PROBS!=='undefined'?PROBS.DSV73:0.015);
  const gotFihag = Math.random() < FIHAG;
  const force0731 = !gotFihag && !atPity && Math.random() < DSV73;
  let r;
  if(gotFihag) r='NB';
  else if(force0731) r='SSR';
  else if(atPity){
    r = pool.banner ? 'UTR' : (Math.random()<.2?'UR':'SSR');
  } else {
    const rnd=Math.random(); let acc=0;
    for(const t of RORDER_DESC){ acc+=pool.rates[t]||0; if(rnd<acc){ r=t; break; } }
    if(!r) r='N';
  }
  let m;
  if(gotFihag){
    m=MMAP.fihagv1;
  } else if(atPity && pool.banner){
    let limited = MODELS.filter(x=>LIMITED_IDS.has(x.id) && x.r==='UTR');
    if(!limited.length) limited = MODELS.filter(x=>x.r==='UTR' && !x.bannerOnly);
    if(!limited.length) limited = MODELS.filter(x=>x.r==='UR' && !x.bannerOnly);
    m=limited[Math.floor(Math.random()*limited.length)];
  } else if(force0731){
    m=MMAP.dsv4fl73;
  } else {
    const cands = MODELS.filter(x=> x.r===r && x.id!=='dsv4fl73' && (!x.bannerOnly || (poolKey==='banner' && LIMITED_IDS.has(x.id))));
    const cand = cands.length ? cands : MODELS.filter(x=>x.r===r && !x.bannerOnly);
    m=cand[Math.floor(Math.random()*cand.length)];
  }
  const base = m.quota||RARITY[m.r].quota;
  let quota = pool.half ? Math.round(base/2) : base;
  quota = Math.floor(quota / TASK_TOKENS) * TASK_TOKENS;
  // 下一 pity：限定池只认当期限定 UTR 或 NB，其他池 SSR+ 即清零
  const realR = m.r;
  const reset = pool.banner ? (realR==='NB' || (realR==='UTR' && LIMITED_IDS.has(m.id))) : (['SSR','UR','UTR','NB'].includes(realR));
  const nextPity = reset ? 0 : pity+1;
  return {m, quota, r: realR, nextPity};
}
function doSim(){
  const selPool=$('sim-pool'), selCount=$('sim-count'), box=$('sim-result');
  if(!selPool || !selCount || !box) return;
  const poolKey=selPool.value;
  const count=Math.min(1000, Math.max(1, parseInt(selCount.value,10)||100));
  const p=POOLS[poolKey];
  if(!p){ box.textContent='未知卡池'; return; }
  // 模拟
  let pity=0;
  const dist={N:0,R:0,SR:0,SSR:0,UR:0,UTR:0,NB:0};
  let totTok=0, totEst=0;
  const draws=[];
  for(let i=0;i<count;i++){
    const cur = simOne(poolKey, pity);
    pity=cur.nextPity;
    draws.push(cur);
    dist[cur.r]=(dist[cur.r]||0)+1;
    totTok+=cur.quota;
    totEst+= (cur.quota/TASK_TOKENS)*expectedTaskPay(cur.m);
  }
  // 十连保底：若十连且无 SR+，强制替换最后一张为 SR（同步 pity 清零）
  if(count===10 && !draws.some(d=>['SR','SSR','UR','UTR','NB'].includes(d.r))){
    const last = draws[draws.length-1];
    totTok-=last.quota; totEst-= (last.quota/TASK_TOKENS)*expectedTaskPay(last.m);
    dist[last.r]--;
    const cands = MODELS.filter(x=> x.r==='SR' && !x.bannerOnly);
    const m = cands[Math.floor(Math.random()*cands.length)];
    const base=m.quota||RARITY.SR.quota;
    let quota=Math.floor((p.half?Math.round(base/2):base)/TASK_TOKENS)*TASK_TOKENS;
    draws[draws.length-1]={m, quota, r:'SR', nextPity:0};
    dist.SR++; totTok+=quota; totEst+= (quota/TASK_TOKENS)*expectedTaskPay(m);
  }
  const cost = count===10 ? p.tenPrice : (count===100 ? p.tenPrice*10 : (count===1000 ? p.tenPrice*100 : p.price*count));
  // 针对 100/1000 抽，按单价*次数估算成本（模拟器不消耗，仅参考）
  const refCost = (()=>{
    if(count===10) return p.tenPrice;
    if(count===100) return p.tenPrice*10;
    if(count===1000) return p.tenPrice*100;
    return p.price*count;
  })();
  const rtp = refCost ? (totEst/refCost*100) : 0;
  const exp = poolExpectedValue(poolKey);
  const expRtp = p.price ? (exp/p.price*100) : 0;
  const rows = RORDER.slice().reverse().filter(r=> r!=='NB' || dist.NB>0).map(r=>`${r}×${dist[r]||0}`).join(' · ');
  const best = draws.reduce((a,b)=> RORDER.indexOf(b.r)>RORDER.indexOf(a.r)||(b.r===a.r&&b.m.idx>a.m.idx)?b:a, draws[0]);
  box.innerHTML = `
    <div><b style="color:var(--blue)">${p.name} · 模拟 ${count} 抽</b> <span style="color:var(--faint)">成本参考 ${fmt(refCost)}（${count}抽）· 期望 ${fmt(Math.round(exp*count/(count===10?10: count)))} vs 模拟 ${fmt(Math.round(totEst))}</span></div>
    <div style="margin:6px 0;display:flex;gap:6px;flex-wrap:wrap">${RORDER.slice().reverse().filter(r=> r!=='NB' || dist.NB>0).map(r=>{
      const c=dist[r]||0, pc=c/count*100;
      return `<span style="background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:2px 8px;font-size:11px"><b style="color:${RARITY[r].hex}">${r}</b> ${c} (${pc.toFixed(1)}%)</span>`;
    }).join('')}</div>
    <div>总 token <b>${(totTok/10000).toFixed(1)}万</b> · 总估值 <b style="color:var(--cyan)">${fmt(Math.round(totEst))}</b> · 模拟回本率 <b style="color:${rtp>=100?'var(--green)':'var(--red)'}">${rtp.toFixed(1)}%</b> <span style="color:var(--faint)">（期望 ${expRtp.toFixed(1)}%）</span></div>
    <div style="margin-top:6px">最佳：<b style="color:${RARITY[best.r].hex}">${best.m.name}</b>（${best.r} · 指数${Math.round(best.m.idx)}） · 分布：${rows}</div>
    <div style="margin-top:6px;color:var(--faint);font-size:11px">提示：模拟含 1.5% 0731、0.01% 隐藏、保底与十连保底，仅供参考，不影响真实存档与保底计数。</div>
  `;
}
function showGacha(cards, pool){
  pulling=true;
  gachaCards=cards;
  const ov=$('overlay'), row=$('gacha-row');
  $('overlay-title').textContent = cards.length>1 ? `✨ ${pool.name} · 十连抽 ✨` : `✨ ${pool.name} · 单抽 ✨`;
  $('gacha-summary').classList.remove('show');
  $('close-overlay').classList.remove('show');
  row.innerHTML=''; ov.classList.add('show');
  let skipped=false, flippedCount=0;
  const dispOf = c => c._halluc ? MMAP[c._halluc] : MMAP[c.m]; // 幻觉卡先显示 UR 伪装
  const els = cards.map((c,i)=>{
    const m=dispOf(c), r=RARITY[m.r];
    const d=document.createElement('div');
    d.className='gcard'+(m.r==='NB'?' nb':(m.r==='UR'||m.r==='UTR'?' ur':''));
    d.style.setProperty('--rc', r.hex);
    const showTok = c._halluc ? (MMAP[c._halluc].quota||RARITY.UR.quota) : c.tokens;
    d.innerHTML=`<div class="inner">
      <div class="face back"><div class="q">?</div><small>API 盲盒</small></div>
      <div class="face front">
        <div class="rr">${r.name} · ${r.label}</div>
        <div class="ic"></div>
        <div class="nm">${m.name}</div>
        <div class="vd">${m.vendor}${c.half?' · 体验卡':''}</div>
        <div class="idx">智能指数 ${Math.round(m.idx)}</div>
        <div class="tk">⚡ ${fmtTok(showTok)} tokens</div>
      </div></div>`;
    const icEl=d.querySelector('.ic');
    if(m.id==='fihagv1'){ icEl.textContent='🌈'; icEl.style.cssText='font-size:clamp(24px,4vw,42px);line-height:1;margin:8px 0 6px'; }
    else icEl.appendChild(iconImg(m.icon));
    d.onclick=()=>flipOne(i);
    row.appendChild(d);
    return d;
  });
  gachaEls=els;
  // 仅最佳音效一次：预计算最佳稀有度（叠加修复）
  let bestR=null, bestIsNB=false;
  {
    let maxIdx=-1;
    for(const c of cards){
      const rr=dispOf(c).r;
      const idx=RORDER.indexOf(rr);
      if(idx>maxIdx){ maxIdx=idx; bestR=rr; bestIsNB=(rr==='NB'); }
    }
  }
  let bestSfxPlayed=false;
  function playBestSfx(){
    if(bestSfxPlayed) return;
    bestSfxPlayed=true;
    if(bestIsNB) SFX.nb();
    else if(bestR==='SSR'||bestR==='UR'||bestR==='UTR') SFX.rarity(bestR);
  }
  function flipOne(i){
    const el=els[i];
    if(el.classList.contains('flipped')) return;
    el.classList.add('flipped','pop');
    flippedCount++;
    const rr=dispOf(cards[i]).r;
    SFX.flip(i);
    if(rr==='NB'){
      setTimeout(()=>{
        if(cards[i]._halluc) goldFlash();
        else goldFlash();
        const rect=el.getBoundingClientRect();
        burst(rect.left+rect.width/2, rect.top+rect.height/2, ['#ff2d55','#ffd700','#41d9ff','#7c3aed','#22c55e','#ff6ec7','#fff'], 220, 13);
        shake();
      }, 250);
    }else if(rr==='SSR'||rr==='UR'||rr==='UTR'){
      setTimeout(()=>{
        if(cards[i]._halluc) goldFlash(); // 幻觉: 屏幕闪金光
        const rect=el.getBoundingClientRect();
        burst(rect.left+rect.width/2, rect.top+rect.height/2,
          rr==='UTR'?['#ff2d55','#f59e0b','#2f6bff','#fff']:(rr==='UR'?['#ff5f6d','#f59e0b','#2f6bff','#fff']:['#f59e0b','#fde68a','#fff']),
          rr==='UTR'?160:(rr==='UR'?120:70), rr==='UTR'?11:(rr==='UR'?9:7));
        if(rr==='UR'||rr==='UTR') shake();
      }, 250);
    }
    if(flippedCount>=cards.length){
      // 全部翻完后仅播放一次最佳音效
      setTimeout(playBestSfx, 260);
      finish();
    }
  }
  // 自动跳过：勾选后直接翻完（同步双复选框与存档）
  const autoChk=$('chk-auto-skip');
  const autoChkBuy=$('chk-auto-skip-buy');
  const isAuto = (autoChk && autoChk.checked) || (autoChkBuy && autoChkBuy.checked) || !!S.flags.autoSkip;
  if(isAuto){
    skipped=true;
    els.forEach((_,i)=> flipOne(i));
  }else{
    cards.forEach((c,i)=> setTimeout(()=>{ if(!skipped) flipOne(i); }, 450+i*380));
  }
  $('skip-btn').onclick=()=>{ skipped=true; els.forEach((e,i)=>{ if(!e.classList.contains('flipped')) setTimeout(()=>flipOne(i), i*40); }); };
  function finish(){
    updateGachaSummary();
    $('gacha-summary').classList.add('show');
    $('close-overlay').classList.add('show');
    save(); renderAll();
    // 动画结束后依次弹: 幻觉揭晓(锁定) → 价格战返现
    // 点过跳过时全部卡牌瞬间翻完, 延后弹窗留时间看清出了什么模型; 正常翻牌保持较快节奏
    setTimeout(showHalluc, skipped ? 2800 : 650);
  }
  $('close-overlay').onclick=()=>{ ov.classList.remove('show'); pulling=false; checkEnd(); };
}
function updateGachaSummary(){
  const dispOf = c => c._halluc ? MMAP[c._halluc] : MMAP[c.m];
  const tokOf = c => c._halluc ? (MMAP[c._halluc].quota||RARITY.UR.quota) : c.tokens;
  const totTok = gachaCards.reduce((s,c)=>s+tokOf(c),0);
  const best = gachaCards.reduce((a,c)=> RORDER.indexOf(dispOf(c).r)>RORDER.indexOf(dispOf(a).r)?c:a, gachaCards[0]);
  const bm=dispOf(best);
  $('gacha-summary').innerHTML=`共获得 <b>${fmtTok(totTok)} tokens</b> · 最佳: <b style="color:${RARITY[bm.r].hex}">${bm.name}</b>（${RARITY[bm.r].name}）`;
}
function showHalluc(){
  pendingHalluc = gachaCards.map((c,i)=> c._halluc ? {c, el:gachaEls[i]} : null).filter(Boolean);
  if(pendingHalluc.length){ showModal(hallucHTML(MMAP[pendingHalluc[0].c._halluc].name), true); return; }
  if(lastRefund>0){ const amt=lastRefund; lastRefund=0; showModal(priceWarHTML(amt)); }
}
function acceptHalluc(){
  for(const {c, el} of pendingHalluc) rebindFace(el, c);
  pendingHalluc=[];
  updateGachaSummary();
  closeModal();
  toast('🧠 幻觉已修正：这张卡实际为 R 档，20 万 token 精神损失费已垫进卡里', 3200);
  // 高亮对应卡库卡牌
  setTimeout(()=>{
    renderBalance();
    for(const c of S.inv){ if(c._halluc) continue; }
    // 找到刚修正的 R 卡并 pulse
    const ids = gachaCards.filter(c=>!c._halluc).map(c=>c.m);
    for(const uid of ids){
      const el = document.querySelector(`.inv-card[data-uid="${S.inv.find(x=>x.m===uid)?.uid}"]`);
      if(el){ el.classList.add('pulse'); el.scrollIntoView({behavior:'smooth', block:'nearest'}); }
    }
  }, 400);
  if(lastRefund>0){ const amt=lastRefund; lastRefund=0; setTimeout(()=>showModal(priceWarHTML(amt)), 400); }
}
function rebindFace(el, c){
  const m=MMAP[c.m], r=RARITY[m.r];
  el.classList.toggle('ur', m.r==='UR'||m.r==='UTR');
  el.style.setProperty('--rc', r.hex);
  el.querySelector('.rr').textContent=`${r.name} · ${r.label}`;
  el.querySelector('.nm').textContent=m.name;
  el.querySelector('.vd').textContent=m.vendor+(c.half?' · 体验卡':'');
  el.querySelector('.idx').textContent=`智能指数 ${Math.round(m.idx)}`;
  el.querySelector('.tk').textContent=`⚡ ${fmtTok(c.tokens)} tokens`;
  const ic=el.querySelector('.ic'); ic.innerHTML=''; ic.appendChild(iconImg(m.icon));
  delete c._halluc; // 幻觉揭晓后清除伪装, 让摘要/统计显示真实结果
    el.classList.add('pop');
}
