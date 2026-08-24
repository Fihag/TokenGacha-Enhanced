"use strict";
/* ================================================================
   TokenGacha · 弹窗与结局 (拆自 ui.js)
   ================================================================ */
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
  // 破产: token 全部耗尽 且 余额不足以最便宜单抽（先检查是否有可领任务，避免误判）
  const minCost=minPoolPrice();
  if(S.money<minCost && totalTasks()<=0 && S.freeTen<=0 && !pulling && !working){
    if(typeof dailyResetIfNeeded==='function') dailyResetIfNeeded();
    const hasClaimable = typeof DAILY_TASKS!=='undefined' && typeof dailyTaskProgress==='function'
      && DAILY_TASKS.some(t=> dailyTaskProgress(t)>=t.target && !S.daily.claimed[t.id]);
    if(hasClaimable){
      toast('💡 还有日常任务可领取，去「活动」页领奖励再战！');
      return;
    }
    SFX.bad();
    showModal(bankruptHTML(), true);
  }
}

/* ---------- 弹窗 ---------- */
function showModal(html, lock=false){ const b=$('modal-box'); b.innerHTML=html; if(lock) b.dataset.locked='1'; else delete b.dataset.locked; $('modal-mask').classList.add('show'); }
$('modal-mask').addEventListener('click', e=>{ if(e.target.id==='modal-mask' && !$('modal-box').dataset.locked) $('modal-mask').classList.remove('show'); });
function closeModal(){ $('modal-mask').classList.remove('show'); }
/* ---------- 抽卡彩蛋: 金闪 / 弹幕 / 冷却 / 返现 / 幻觉 ---------- */
function goldFlash(){ const g=$('goldflash'); if(!g) return; g.classList.remove('go'); void g.offsetWidth; g.classList.add('go'); }
function danmaku(text){
  const d=document.createElement('div'); d.className='danmaku'; d.textContent=text;
  document.body.appendChild(d); setTimeout(()=>d.remove(), 5000);
}
function gpuCoolDown(){
  cooling=true;
  const el=$('cooling'); if(!el) return;
  el.hidden=false;
  setTimeout(()=>{ el.hidden=true; cooling=false; toast('🧊 冷却完毕，补偿 10 Token 已发放（记在账外）', 3000); }, 3000);
}
function priceWarHTML(amt){
  return `<h3>⚔️ 价格战<button class="x" onclick="closeModal()">×</button></h3>
  <p>DeepSeek 挥刀砍价，帮你省了一半！友商沉默，玩家狂喜。</p>
  <p>本次抽卡返现 <b style="color:var(--red)">¥${fmt(amt)}</b> 已退回账户，且不扣成就。</p>
  <button class="big-btn ghost" onclick="closeModal()">收下 →</button>`;
}
function hallucHTML(fakeName){
  return `<h3>🤯 检测到模型幻觉<button class="x" onclick="closeModal()">×</button></h3>
  <p>你抽到的「<b>${fakeName}</b>」其实是模型一本正经地胡说八道——<b>纯纯的幻觉</b>。</p>
  <p>经本站鉴定：<b style="color:var(--blue)">实际结果为 R 档</b>，卡面已强制修正，概不退换。</p>
  <p style="color:var(--faint)">为表歉意，20 万 token 精神损失费已垫进这张卡里。</p>
  <button class="big-btn ghost" onclick="acceptHalluc()">接受现实 →</button>`;
}
function claudeBanHTML(){
  return `<h3>🚫 Claude 封禁通知<button class="x" onclick="closeModal()">×</button></h3>
  <p>Claude 官方检测到你的账号来自<b>中国境内</b>，触发区域风控，账号封禁。</p>
  <p><b style="color:var(--red)">名下全部 Claude 卡额度已清零</b>——Opus 6 / Opus 5 / Fable 5 / Sonnet 5 / 4.5 Sonnet / Haiku 4.5，备胎一个没留。</p>
  <p>官方理由：「合规问题，恕不另行通知。别问，问就是风控。」</p>
  <p style="color:var(--faint)">本批剩余订单一并查封作废；已结掉的钱不追回——这是本站最后的人道主义。</p>
  <p>庄家友情提示：下次接单记得用 DeepSeek，量大管饱，就是涨价后贵了点。</p>
  <button class="big-btn ghost" onclick="closeModal()">我认了，继续压榨 →</button>`;
}

/* ---------- 卡库: 销毁模型卡 ---------- */
// 手动销毁兜底: 防止「剩 10万 token 无法消耗又清不掉」的残卡永远卡在卡库列表; 任何卡都可销毁
function destroyCard(uid){
  const c=S.inv.find(x=>x.uid===uid);
  if(!c) return;
  const m=MMAP[c.m], r=RARITY[m.r];
  showModal(`<h3>🗑️ 销毁模型卡<button class="x" onclick="closeModal()">×</button></h3>
  <p>确定销毁「<b style="color:${r.hex}">${m.name}</b>」？卡内剩余 <b>${fmtK(c.tokens)} tokens</b> 将直接蒸发，<b>不可找回</b>。</p>
  <p style="color:var(--faint)">庄家点评：止损是真果断，浪费是真彻底。</p>
  <button class="big-btn danger" data-confirm-destroy="${uid}">确认销毁</button>
  <button class="big-btn ghost" onclick="closeModal()">手滑了！留着 →</button>`);
}
function confirmDestroy(uid){
  closeModal();
  const i=S.inv.findIndex(x=>x.uid===uid);
  if(i<0) return;
  const c=S.inv[i], m=MMAP[c.m];
  const lost=c.tokens;
  S.inv.splice(i,1);
  save(); renderAll();
  SFX.bad();
  toast(`🗑️ 已销毁 ${m.name}${lost>0?` · ${fmtK(lost)} tokens 化为乌有`:''}`, 3200);
}
function toggleLock(uid){
  const c=S.inv.find(x=>x.uid===uid);
  if(!c) return;
  c.locked=!c.locked;
  save(); renderAll();
  SFX.click();
  toast(c.locked?`🔒 已锁定 ${MMAP[c.m].name}（工作时不消耗）`:`🔓 已解锁 ${MMAP[c.m].name}`);
}
