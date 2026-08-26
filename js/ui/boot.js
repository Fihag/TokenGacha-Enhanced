"use strict";
/* ================================================================
   TokenGacha · 事件与启动 (拆自 ui.js)
   ================================================================ */
/* ---------- 事件绑定 ---------- */
$('btn-work').onclick=doWork;
$('btn-auto').onclick=doAuto;
$('btn-skip').onclick=()=>{ SFX.click(); skipWork(); };
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
// 交易工坊 Tab
document.querySelectorAll('[data-trade]').forEach(b=>{
  b.onclick=()=>{
    document.querySelectorAll('[data-trade]').forEach(x=>x.classList.toggle('on', x===b));
    const t=b.dataset.trade;
    const craftEl=$('trade-craft'), marketEl=$('trade-market');
    if(craftEl) craftEl.hidden = t!=='craft';
    if(marketEl) marketEl.hidden = t!=='market';
    SFX.click();
    if(t==='market' && typeof renderMarket==='function') renderMarket();
    if(t==='craft' && typeof renderCraft==='function') renderCraft();
  };
});
// banner 倒计时: 每秒实时刷新, 活动到期自动下架
setInterval(()=>{
  const el=$('banner-countdown');
  if(!el) return;
  if(isBannerActive()) el.textContent='⏳ '+bannerCountdownText();
  else renderAll();
},1000);
// 公告倒计时刷新（每60s）
setInterval(()=>{
  const el=$('notice-text');
  if(!el || typeof bannerSlot!=='function' || typeof bannerCountdownText!=='function') return;
  // 仅在购买页可见时刷新，避免干扰
  if(!$('page-buy')?.classList.contains('active')) return;
  el.textContent = `${bannerSlot().season.name} · ${bannerCountdownText()} ｜ ` + pick(NOTICES);
}, 60000);
document.addEventListener('keydown', e=>{
  if(e.target.tagName==='INPUT') return;
  if(e.code==='Space'){ e.preventDefault();
    if(!$('modal-mask').classList.contains('show')&&!$('overlay').classList.contains('show')&&$('page-work').classList.contains('active')) doWork();
  }
});
document.addEventListener('click', e=>{
  const lockEl = e.target.closest ? e.target.closest('[data-lock]') : null;
  if(lockEl){ toggleLock(Number(lockEl.dataset.lock)); return; }
  if(e.target.dataset && e.target.dataset.lock!=null){ toggleLock(Number(e.target.dataset.lock)); return; }
  const delEl = e.target.closest ? e.target.closest('.inv-del') : null;
  if(delEl && delEl.dataset.uid!=null){ SFX.click(); destroyCard(Number(delEl.dataset.uid)); return; }
  // 兼容旧：仅当目标本身是 inv-del 时触发，避免合成/批量卡牌（exped-card/inv-card）的 data-uid 误触
  // if(e.target.dataset && e.target.dataset.uid!=null){ ... } 已移除
  if(e.target.dataset && e.target.dataset.confirmDestroy!=null){ confirmDestroy(Number(e.target.dataset.confirmDestroy)); }
  if(e.target.id==='btn-reset'){ localStorage.removeItem('tokengacha_v2'); localStorage.removeItem('tokengacha_v4'); location.reload(); }
  if(e.target.id==='btn-rebirth'){ const keepMuted=muted; S=defaultState(); S.flags.welcomed=true; S.flags.muted=keepMuted; shownMoney=S.money; save(); closeModal(); go('buy'); toast('🔄 新生活开始了！启动资金与免费十连已到账'); }
  if(e.target.id==='btn-start'){ S.flags.welcomed=true; save(); closeModal(); SFX.win(); toast('🎁 启动资金到账！免费十连已放入白银盲盒'); renderAll(); }
  if(e.target.dataset && e.target.dataset.shareMs){ SFX.click(); const ms=MILESTONES.find(m=>m.id===e.target.dataset.shareMs); if(ms) openShare(ms); }
  if(e.target.id==='btn-copy-share'){ SFX.click(); copyText(shareText(shareCtx.ms)); }
  if(e.target.id==='btn-dl-share'){ SFX.click(); const a=document.createElement('a'); a.href=shareCtx.cv.toDataURL('image/png'); a.download='tokengacha-share.png'; a.click(); toast('🖼️ 分享图已保存'); }
  if(e.target.id==='btn-sys-share'&&typeof navigator!=='undefined'&&navigator.share){ navigator.share({title:'TokenGacha · LLM API 中转站',text:shareText(shareCtx.ms),url:SITE_URL}).catch(()=>{}); }
  if(e.target.id==='btn-do-topup'){ doTopup(); }
  if(e.target.id==='btn-confirm-clear-n'){
    const before=S.inv.length;
    S.inv=S.inv.filter(c=>MMAP[c.m].r!=='N');
    const removed=before-S.inv.length;
    save(); closeModal(); renderAll();
    SFX.bad();
    toast(`🗑️ 已清理 ${removed} 张 N 卡`);
  }
  if(e.target.id==='btn-confirm-batch-destroy'){
    const set = (typeof BatchState!=='undefined' ? BatchState.set : window._batchSet) || new Set();
    const uids=[...set];
    if(!uids.length){ closeModal(); return; }
    const before=S.inv.length;
    S.inv=S.inv.filter(c=>!uids.includes(c.uid));
    const removed=before-S.inv.length;
    if(typeof BatchState!=='undefined' && BatchState.set) BatchState.set.clear();
    else if(window._batchSet) window._batchSet.clear();
    const upd = (typeof BatchState!=='undefined' ? BatchState.updateBar : window._updateBatchBar);
    if(upd) upd();
    save(); closeModal(); renderAll();
    SFX.bad();
    toast(`🗑️ 已销毁 ${removed} 张`);
  }
  if(e.target.dataset && e.target.dataset.amt){ const inp=$('topup-amt'); if(inp) inp.value=e.target.dataset.amt; SFX.click(); }
});

/* ---------- 隐藏互动: Logo 连点 10 次 → 弹幕彩蛋 ---------- */
let logoClicks=0, logoTimer=null;
document.querySelector('.logo').onclick=()=>{
  logoClicks++;
  clearTimeout(logoTimer);
  logoTimer=setTimeout(()=>{ logoClicks=0; }, 1600);
  if(logoClicks>=10){ logoClicks=0; danmaku('别点了，没有隐藏福利！——来自穷鬼开发者'); }
};

/* ---------- 启动(在所有模块加载后,由 analytics.js 末尾触发) ---------- */
function boot(){
  // 同步 RARITY 色值到 CSS 变量（单源）
  try{
    const root=document.documentElement.style;
    for(const [k,v] of Object.entries(RARITY)) root.setProperty('--'+k, v.hex);
  }catch(e){}
  // 公告：顶部动态赛季倒计时 + 随机 NOTICES
  const seasonInfo = (typeof bannerSlot==='function' && typeof bannerCountdownText==='function')
    ? `${bannerSlot().season.name} · ${bannerCountdownText()} ｜ ` : '';
  $('notice-text').textContent = seasonInfo + pick(NOTICES);
  $('btn-mute').innerHTML = muted ? '🔇<span class="lbl"> 静音</span>' : '🔊<span class="lbl"> 音效</span>';
  // 自动跳过复选框（抽卡界面+购买页双控同步）
  const chk=$('chk-auto-skip'), chkBuy=$('chk-auto-skip-buy');
  if(chk) chk.checked=!!S.flags.autoSkip;
  if(chkBuy) chkBuy.checked=!!S.flags.autoSkip;
  const syncAuto = (v)=>{
    S.flags.autoSkip=v;
    save();
    if(chk) chk.checked=v;
    if(chkBuy) chkBuy.checked=v;
    toast(v?'已开启自动跳过抽卡动画':'已关闭自动跳过');
  };
  if(chk) chk.onchange=()=>syncAuto(chk.checked);
  if(chkBuy) chkBuy.onchange=()=>syncAuto(chkBuy.checked);
  // 模拟抽卡器
  const btnSim=$('btn-sim');
  if(btnSim && !btnSim.dataset.bound){
    btnSim.dataset.bound='1';
    btnSim.onclick=()=>{ SFX.click(); doSim(); };
  }
  go(location.hash.slice(1) || 'buy');
  if(!S.flags.welcomed){ showModal(welcomeHTML()); }
  else checkEnd();
}