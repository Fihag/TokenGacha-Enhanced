"use strict";
/* ================================================================
   TokenGacha · 渲染 (拆自 ui.js)
   ================================================================ */
// 批量操作封装：避免散落的 window._batch* 全局
const BatchState = { mode:false, set:new Set(), updateBar:null };
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
  // 移动端横滑指示点
  const dots=$('pool-dots');
  if(dots){
    const n=box.children.length;
    dots.innerHTML = Array.from({length:n},(_,i)=>`<i class="${i===0?'on':''}"></i>`).join('');
    let tick=null;
    box.onscroll=()=>{
      if(tick) return;
      tick=requestAnimationFrame(()=>{
        tick=null;
        const idx=Math.round(box.scrollLeft / (box.scrollWidth/n));
        dots.querySelectorAll('i').forEach((d,i)=>d.classList.toggle('on', i===idx));
      });
    };
  }
  // 保底旁加期望值提示
  box.querySelectorAll('.pity-row').forEach((row,i)=>{
    const k=Object.keys(POOLS).filter(k=>!(POOLS[k].banner&&!isBannerActive()))[i];
    if(k) row.insertAdjacentHTML('beforeend', `<span class="pity-ev">期望 ¥${Math.round(poolExpectedValue(k))}</span>`);
  });
}

/* ---------- 渲染: 工作页 ---------- */
function renderWork(){
  const tk=usableTokens(), tasks=usableTasks(), tot=totalTokens(), locked=lockedTokens();
  const hasLocked = (S.inv.some(c=>c.locked));
  $('w-tokens').innerHTML=fmtK(tk)+(hasLocked?` <small style="color:var(--faint)">/ ${fmtK(tot)}</small>`:'')+' <small>tokens</small>';
  $('w-tokens').title = hasLocked ? `可用 ${fmtK(tk)} / 总计 ${fmtK(tot)}（锁定 ${fmtK(locked)} 不计入工作）` : '';
  $('w-tasks').innerHTML=tasks+(hasLocked?` <small style="color:var(--faint)">/ ${Math.floor(tot/TASK_TOKENS)}</small>`:'')+' <small>单</small>';
  $('w-tasks').title = hasLocked ? `可用 ${tasks} 单 / 总计 ${Math.floor(tot/TASK_TOKENS)} 单` : '';
  $('w-est').textContent=fmt(usableEstValue());
  $('w-est').title = hasLocked ? `仅含未锁定卡估值，总估值 ${fmt(estValue())}` : '';
  const rows=$('rarity-rows'); rows.innerHTML='';
  const maxQ=RARITY.UTR.quota*3;
  const groups={};
  for(const r of RORDER) groups[r]=[];
  for(const c of S.inv){ if(c.tokens>0 && !c.locked) groups[MMAP[c.m].r].push(c); }
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
  const sb=$('btn-skip'); if(sb) sb.hidden = !working;
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
const hasNB=(S.dex.fihagv1||0)>0;
    const dexTotal=MODELS.filter(m=>m.id!=='fihagv1'||hasNB).length;
  const cells=[
    ['总抽数',S.stats.pulls],['工作单数',S.stats.tasks],['大成功',S.stats.greats],['删库事故',S.stats.disasters],
    ['最佳出货',best?best.name:'无'],['图鉴',`${Object.keys(S.dex).length}/${dexTotal}`],
  ];
  $('stat-grid').innerHTML=cells.map(([l,v])=>`<div class="cell"><div class="lb">${l}</div><div class="vl">${v}</div></div>`).join('')
    + RORDER.map(r=>`<div class="cell"><div class="lb">${r} 出货</div><div class="vl" style="color:${RARITY[r].hex}">${S.stats.byR[r]||0}</div></div>`).join('');
  const ch=$('channels'); ch.innerHTML='';
  // 渠道状态会话内固定生成一次(避免每次 renderAll 随机闪烁)
  const chModels=['opus5','gpt56sol','gem31pro','dsv4pro','qwen37','doubao'];
  if(!window._chanState){
    window._chanState = {};
    for(const id of chModels){
      const m=MMAP[id];
      window._chanState[id] = { warn:Math.random()<.2, lat:Math.round(80+Math.random()*400) };
    }
  }
  for(const id of chModels){
    const m=MMAP[id];
    const st=window._chanState[id];
    ch.insertAdjacentHTML('beforeend',`<div class="ch-row"><span class="ic"></span><span>${m.vendor} 渠道</span><span class="st ${st.warn?'warn':''}">${st.warn?'● 波动':'● 正常'}</span><span class="lat">${st.lat}ms</span></div>`);
    ch.lastChild.querySelector('.ic').appendChild(iconImg(m.icon));
  }
  // 卡库（支持筛选/排序/残卡高亮/锁定）
  const g=$('inv-grid'); g.innerHTML='';
  const lockedCnt = S.inv.filter(c=>c.locked).length;
  const totalTxt = `共 ${S.inv.length} 张${lockedCnt?` · 🔒 ${lockedCnt} 张已锁定` : ''} · 耗尽自动移除`;
  $('inv-total').textContent=totalTxt;
  if(!S.inv.length){ g.innerHTML='<div class="inv-empty" style="grid-column:1/-1">卡库空空如也<br>去「购买Token」抽个盲盒吧</div>'; }
  else{
    const f = window._invFilter || 'all';
    const sortBy = ($('inv-sort')&&$('inv-sort').value) || 'rarity';
    let list = [...S.inv];
    if(f==='locked') list = list.filter(c=>c.locked);
    else if(f==='half') list = list.filter(c=>c.half);
    else if(f==='residue') list = list.filter(c=>c.tokens>0 && c.tokens < TASK_TOKENS*2);
    else if(f!=='all') list = list.filter(c=>MMAP[c.m].r===f);
    list.sort((a,b)=>{
      if(sortBy==='tokens') return b.tokens-a.tokens;
      if(sortBy==='idx') return MMAP[b.m].idx-MMAP[a.m].idx;
      return RORDER.indexOf(MMAP[b.m].r)-RORDER.indexOf(MMAP[a.m].r) || b.tokens-a.tokens;
    });
    // 残卡判定：<2单视为残卡（红色标记）
    for(const c of list){
      const m=MMAP[c.m], r=RARITY[m.r];
      const residue = c.tokens>0 && c.tokens < TASK_TOKENS*2;
      const stars = c.stars||0;
      const locked = !!c.locked;
      const d=document.createElement('div');
      d.className='inv-card'+(c.tokens<=0?' dead':'')+(residue?' residue':'')+(locked?' locked':'');
      d.dataset.uid=c.uid;
      d.style.setProperty('--rc', r.hex);
      d.innerHTML=`<span class="rt">${r.name}${stars?' ★'+stars:''}</span>${c.half?'<span class="half">体验</span>':''}
        <button class="inv-lock" data-lock="${c.uid}" title="${locked?'已锁定（工作不消耗）点击解锁':'未锁定点击锁定（工作不消耗）'}">${locked?'🔒':'🔓'}</button>
        <button class="inv-del" data-uid="${c.uid}" title="销毁这张卡（剩余 token 不可找回）">🗑️</button>`;
      d.classList.toggle('hasHalf', !!c.half);
      if(m.id==='fihagv1'){ const ic=document.createElement('span'); ic.textContent='🌈'; ic.style.cssText='font-size:28px;line-height:1;margin:4px 0'; d.appendChild(ic); }
        else d.appendChild(iconImg(m.icon));
      d.insertAdjacentHTML('beforeend',`<div class="nm">${m.name}${stars?' ★'+stars:''}${locked?' 🔒':''}</div><div class="tk">${c.tokens>0?fmtK(c.tokens)+' tok':'已耗尽'}</div>`);
      d.title=`${m.name}${stars?' ★'+stars:''}${locked?' 🔒已锁定':''} · ${m.vendor}\n智能指数 ${Math.round(m.idx)} · 真实成本 ${m.cost}\n${m.quote}${stars?' \n⭐ 星级 '+stars+' · 收益+'+(stars*5)+'%':''}${locked?' \n🔒 已锁定：工作时不消耗':''}${residue?' \n⚠️ 残卡（<2单），建议销毁':''}`;
      g.appendChild(d);
    }
    if(!list.length) g.innerHTML='<div class="inv-empty" style="grid-column:1/-1">该筛选下暂无卡牌</div>';
  }
  // 绑定筛选/排序（仅一次）
  const filt=$('inv-filter');
  if(filt && !filt.dataset.bound){
    filt.dataset.bound='1';
    filt.querySelectorAll('button[data-f]').forEach(b=>{
      b.onclick=()=>{
        window._invFilter=b.dataset.f;
        filt.querySelectorAll('button[data-f]').forEach(x=>x.classList.toggle('on', x===b));
        renderBalance();
      };
    });
    // 初始化选中态
    const curF=window._invFilter||'all';
    filt.querySelectorAll('button[data-f]').forEach(b=>b.classList.toggle('on', b.dataset.f===curF));
  }
  const sel=$('inv-sort');
  if(sel && !sel.dataset.bound){ sel.dataset.bound='1'; sel.onchange=()=>renderBalance(); }
  const clearN=$('btn-clear-n');
  if(clearN && !clearN.dataset.bound){
    clearN.dataset.bound='1';
    clearN.onclick=()=>{
      const nCards=S.inv.filter(c=>MMAP[c.m].r==='N');
      if(!nCards.length){ toast('没有 N 卡可清'); SFX.bad(); return; }
      SFX.click();
      showModal(`<h3>🗑️ 一键清理 N 卡<button class="x" onclick="closeModal()">×</button></h3><p>将销毁 <b>${nCards.length} 张 N 卡</b>（含 ${fmtK(nCards.reduce((s,c)=>s+c.tokens,0))} tokens），不可找回。</p><button class="big-btn danger" id="btn-confirm-clear-n">确认清理</button><button class="big-btn ghost" onclick="closeModal()">取消</button>`);
    };
  }
  // 批量操作绑定（仅一次）— 封装于 BatchState，避免 window 散落
  const btnBatchToggle=$('btn-batch-toggle');
  if(btnBatchToggle && !btnBatchToggle.dataset.bound){
    btnBatchToggle.dataset.bound='1';
    BatchState.mode = BatchState.mode || false;
    BatchState.set = BatchState.set || new Set();
    const bar=$('inv-batch-bar'), cntEl=$('inv-batch-cnt');
    const updateBatchBar=()=>{
      const n=BatchState.set.size;
      if(cntEl) cntEl.textContent=`已选 ${n} 张`+(n?` · ${fmtK([...BatchState.set].reduce((s,uid)=>{const c=S.inv.find(x=>x.uid===uid); return s+(c?c.tokens:0);},0))} tok`:'');
      const lockBtn=$('btn-batch-lock'), unlockBtn=$('btn-batch-unlock'), destroyBtn=$('btn-batch-destroy');
      const hasSel=n>0;
      if(lockBtn) lockBtn.disabled=!hasSel;
      if(unlockBtn) unlockBtn.disabled=!hasSel;
      if(destroyBtn) destroyBtn.disabled=!hasSel;
    };
    BatchState.updateBar=updateBatchBar;
    // 兼容旧 window 引用（boot.js 过渡期）
    window._batchMode = BatchState.mode; window._batchSet = BatchState.set; window._updateBatchBar = updateBatchBar;
    btnBatchToggle.onclick=()=>{
      BatchState.mode=!BatchState.mode;
      window._batchMode = BatchState.mode;
      if(!BatchState.mode) BatchState.set.clear();
      btnBatchToggle.textContent = BatchState.mode ? '✖️ 退出批量' : '☑️ 批量';
      btnBatchToggle.classList.toggle('on', BatchState.mode);
      if(bar) bar.hidden=!BatchState.mode;
      updateBatchBar();
      renderBalance();
      if(BatchState.mode) toast('☑️ 已进入批量模式，点击卡牌选择');
    };
    const bindBatchBtn=(id, fn)=>{
      const b=$(id);
      if(b && !b.dataset.bound){ b.dataset.bound='1'; b.onclick=()=>{ SFX.click(); fn(); }; }
    };
    bindBatchBtn('btn-batch-all', ()=>{
      const f=window._invFilter||'all', sortBy=($('inv-sort')&&$('inv-sort').value)||'rarity';
      let list=[...S.inv];
      if(f==='locked') list=list.filter(c=>c.locked);
      else if(f==='half') list=list.filter(c=>c.half);
      else if(f==='residue') list=list.filter(c=>c.tokens>0 && c.tokens < TASK_TOKENS*2);
      else if(f!=='all') list=list.filter(c=>MMAP[c.m].r===f);
      if(BatchState.set.size===list.length) BatchState.set.clear();
      else list.forEach(c=>BatchState.set.add(c.uid));
      updateBatchBar(); renderBalance();
    });
    bindBatchBtn('btn-batch-lock', ()=>{
      let n=0; for(const uid of [...BatchState.set]){ const c=S.inv.find(x=>x.uid===uid); if(c && !c.locked){ c.locked=true; n++; } }
      if(!n){ toast('选中的卡已是锁定状态'); SFX.bad(); return; }
      save(); BatchState.set.clear(); updateBatchBar(); renderAll();
      toast(`🔒 已锁定 ${n} 张`);
    });
    bindBatchBtn('btn-batch-unlock', ()=>{
      let n=0; for(const uid of [...BatchState.set]){ const c=S.inv.find(x=>x.uid===uid); if(c && c.locked){ c.locked=false; n++; } }
      if(!n){ toast('选中的卡已是未锁定'); SFX.bad(); return; }
      save(); BatchState.set.clear(); updateBatchBar(); renderAll();
      toast(`🔓 已解锁 ${n} 张`);
    });
    bindBatchBtn('btn-batch-destroy', ()=>{
      const uids=[...BatchState.set];
      if(!uids.length) return;
      const toks=uids.reduce((s,uid)=>{const c=S.inv.find(x=>x.uid===uid); return s+(c?c.tokens:0);},0);
      showModal(`<h3>🗑️ 批量销毁<button class="x" onclick="closeModal()">×</button></h3><p>将销毁 <b>${uids.length} 张</b>（含 ${fmtK(toks)} tokens），不可找回。</p><button class="big-btn danger" id="btn-confirm-batch-destroy">确认销毁</button><button class="big-btn ghost" onclick="closeModal()">取消</button>`);
    });
    bindBatchBtn('btn-batch-cancel', ()=>{
      BatchState.set.clear(); updateBatchBar(); renderBalance();
    });
  }
  // 卡牌批量选中样式与点击代理
  if(BatchState.mode && BatchState.set){
    g.querySelectorAll('.inv-card').forEach(el=>{
      const uid=Number(el.dataset.uid);
      if(BatchState.set.has(uid)) el.classList.add('batched');
    });
    if(!g.dataset.batchBound){
      g.dataset.batchBound='1';
      g.addEventListener('click', e=>{
        if(!BatchState.mode) return;
        const card=e.target.closest('.inv-card');
        if(!card) return;
        // 批量模式下，点击锁定/销毁按钮仍走原逻辑，不触发选中
        if(e.target.closest('.inv-lock') || e.target.closest('.inv-del')) return;
        const uid=Number(card.dataset.uid);
        if(BatchState.set.has(uid)) BatchState.set.delete(uid);
        else BatchState.set.add(uid);
        if(BatchState.updateBar) BatchState.updateBar();
        card.classList.toggle('batched', BatchState.set.has(uid));
      });
    }
  }
}

/* ---------- 渲染: 成就墙 ---------- */
function renderAchievements(){
  const grid=$('achieve-grid'), prog=$('achieve-progress');
  if(!grid) return;
  const unlocked = MILESTONES.filter(m=> S.flags.ms && S.flags.ms[m.id]).length;
  if(prog) prog.textContent = `${unlocked}/${MILESTONES.length} · 下一档 ${(() => {
    const nxt = MILESTONES.find(m=> !(S.flags.ms && S.flags.ms[m.id]));
    return nxt ? fmt(nxt.at) : '已全部解锁';
  })()}`;
  // 若作弊，提示关闭
  if(S.flags.cheated){
    grid.innerHTML = `<div style="grid-column:1/-1;color:var(--faint);font-size:12px;padding:8px 2px;text-align:center">💳 作弊模式已开启，成就系统关闭（已解锁 ${unlocked} 项保留）</div>` + MILESTONES.map(m=>{
      const ok = !!(S.flags.ms && S.flags.ms[m.id]);
      return `<div class="achieve-card ${ok?'unlocked':'locked'}"><div class="ac-ic">${m.title.split(' ')[0]}</div><div class="ac-title">${m.title}</div><div class="ac-tag">${m.tag}</div><div class="ac-hype">${m.hype}</div><div class="ac-at">${fmt(m.at)}</div></div>`;
    }).join('');
    return;
  }
  grid.innerHTML = MILESTONES.map(m=>{
    const ok = !!(S.flags.ms && S.flags.ms[m.id]);
    const pct = Math.min(100, Math.max(0, S.money / m.at * 100));
    return `<div class="achieve-card ${ok?'unlocked':'locked'}" title="${m.hype}\n${ok?'已解锁':'进度 '+pct.toFixed(0)+'%'}"><div class="ac-ic">${m.title.split(' ')[0]}</div><div class="ac-title">${m.title}</div><div class="ac-tag">${m.tag}</div><div class="ac-hype">${m.hype}</div><div class="ac-at">${fmt(m.at)}${ok?' · 已达成':''}</div>${!ok?`<div style="margin-top:6px;height:4px;background:var(--panel2);border:1px solid var(--line);border-radius:4px;overflow:hidden"><i style="display:block;height:100%;width:${pct.toFixed(1)}%;background:linear-gradient(90deg,var(--gold),#f59e0b)"></i></div>`:''}</div>`;
  }).join('');
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
  renderHeader(); tweenMoney(); renderBuy(); renderWork(); renderBalance(); renderAchievements();
  if(typeof renderCraft==='function') renderCraft();
  if(typeof renderMarket==='function') renderMarket();
  if(typeof renderActivity==='function') renderActivity();
  if(typeof renderData==='function') renderData();
}
