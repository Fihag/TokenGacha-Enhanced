"use strict";
/* ================================================================
   TokenGacha · 皮肤/特效系统 (skins.js)
   主题 CSS 变量切换 / 抽卡随机掉落 / 皮肤券兑换
   ================================================================ */

function applySkin(id){
  const skin = SKINS.find(s=>s.id===id);
  if(!skin) return;
  const root=document.documentElement.style;
  // 清理所有皮肤可能设置的变量，避免 classic(空 vars) 残留上一皮肤
  const allVars = new Set(SKINS.flatMap(s=>Object.keys(s.vars)));
  for(const k of allVars) root.removeProperty(k);
  for(const [k,v] of Object.entries(skin.vars)) root.setProperty(k,v);
  S.skin=id;
  save();
}

function rollSkinDrop(cards){
  const rate = (typeof PROBS!=='undefined'?PROBS.SKIN_DROP:SKIN_DROP_RATE);
  if(Math.random() < rate){
    const owned = new Set(S.skinsOwned);
    const unowned = SKINS.filter(s=>!owned.has(s.id));
    if(unowned.length){
      const skin = pick(unowned);
      S.skinsOwned.push(skin.id);
      save();
      setTimeout(()=>toast(`🎨 抽卡掉落了新皮肤「${skin.name}」${skin.icon}！去右上角切换吧`, 3200), 600);
    } else {
      S.skinTickets=(S.skinTickets||0)+1;
      save();
      setTimeout(()=>toast('🎨 皮肤已全收集，掉落自动转为 +1 皮肤券', 3200), 600);
    }
  }
}

function skinPickerHTML(){
  const rows=SKINS.map(s=>{
    const owned=S.skinsOwned.includes(s.id);
    const using=S.skin===s.id;
    return `<div class="skin-row ${using?'using':''}">
      <span class="sk-ic">${s.icon}</span>
      <div class="sk-info"><div class="sk-name">${s.name} ${using?'<b style="color:var(--green)">使用中</b>':''}</div><div class="sk-desc">${s.desc}</div></div>
      ${owned
        ? `<button class="mini-btn" data-skin-use="${s.id}" ${using?'disabled':''}>${using?'使用中':'使用'}</button>`
        : `<button class="mini-btn" data-skin-buy="${s.id}" ${(S.skinTickets||0)<1?'disabled':''}>🎫 兑换</button>`}
    </div>`;
  }).join('');
  const dropRate = (typeof PROBS!=='undefined'?PROBS.SKIN_DROP:SKIN_DROP_RATE);
  const canConvert = (S.skinTickets||0) > 0;
  const html=`<h3>🎨 皮肤中心 <span style="font-size:12px;color:var(--faint)">持有皮肤券 <b id="skin-tk-now" style="color:var(--gold)">${S.skinTickets||0}</b> 张</span><button class="x" onclick="closeModal()">×</button></h3>
  <div class="skin-list">${rows}</div>
  <div style="margin:12px 0 10px;padding:10px 12px;background:var(--panel2);border:1px solid var(--line);border-radius:12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
    <span style="font-size:12px;color:var(--dim)">🎫 皮肤券转换</span>
    <span style="font-size:11px;color:var(--faint)">1张 = ¥500</span>
    <input id="skin-convert-num" type="number" min="1" max="${S.skinTickets||0}" value="1" style="width:72px;padding:6px 8px;border:1px solid var(--line);border-radius:8px;background:var(--panel);color:var(--txt);font-size:12px">
    <button class="mini-btn" id="btn-skin-convert" ${canConvert?'':'disabled'}>转换为钱</button>
    <button class="mini-btn" id="btn-skin-convert-all" ${canConvert?'':'disabled'}>全部转换</button>
    <span style="font-size:11px;color:var(--faint)">当前可得 ¥${(S.skinTickets||0)*500}</span>
  </div>
  <div class="note">· 抽卡有 ${(dropRate*100).toFixed(1)}% 概率随机掉落未拥有皮肤<br>· 签到与日常任务可获皮肤券，1 张兑换 1 个皮肤<br>· 皮肤券可按 1:500 转换为余额<br>· 皮肤仅改变配色与氛围，不影响任何概率（吧）</div>`;
  showModal(html);
  document.querySelectorAll('[data-skin-use]').forEach(b=>b.onclick=()=>{
    applySkin(b.dataset.skinUse); SFX.click(); closeModal(); skinPickerHTML();
    toast('🎨 皮肤已切换'); renderAll();
  });
  document.querySelectorAll('[data-skin-buy]').forEach(b=>b.onclick=()=>{
    const id=b.dataset.skinBuy;
    if((S.skinTickets||0)<1){ toast('皮肤券不足，去签到/做任务吧'); SFX.bad(); return; }
    S.skinTickets--;
    S.skinsOwned.push(id);
    save(); SFX.coin(); closeModal(); skinPickerHTML();
    toast('🎨 兑换成功！新皮肤已入库');
  });
  const convertBtn=$('btn-skin-convert'), convertAllBtn=$('btn-skin-convert-all'), convertInput=$('skin-convert-num');
  function doConvert(n){
    n=Math.floor(Number(n));
    if(!n||n<=0){ toast('请输入有效数量'); SFX.bad(); return; }
    if((S.skinTickets||0)<n){ toast('皮肤券不足'); SFX.bad(); return; }
    const gain=n*500;
    S.skinTickets-=n;
    S.money+=gain;
    S.stats.earn+=gain;
    if(typeof S.daily==='object') S.daily.earnToday=(S.daily.earnToday||0)+gain;
    addLedger(`🎫 皮肤券转换 ×${n}`, gain);
    save(); SFX.coin(); closeModal(); skinPickerHTML(); renderAll();
    toast(`🎫 已转换 ${n} 张皮肤券 → +${fmt(gain)}`, 2600);
    checkEnd();
  }
  if(convertBtn) convertBtn.onclick=()=> doConvert(convertInput?convertInput.value:1);
  if(convertAllBtn) convertAllBtn.onclick=()=> doConvert(S.skinTickets||0);
  if(convertInput) convertInput.oninput=()=>{
    let v=Math.floor(Number(convertInput.value));
    if(v<1) v=1;
    if(v>(S.skinTickets||0)) v=S.skinTickets||0;
    convertInput.value=v;
  };
}
function convertSkinTickets(n){
  n=Math.floor(Number(n));
  if(!n||n<=0){ toast('请输入有效数量'); return false; }
  if((S.skinTickets||0)<n){ toast('皮肤券不足'); if(typeof SFX!=='undefined'&&SFX.bad) SFX.bad(); return false; }
  const gain=n*500;
  S.skinTickets-=n;
  S.money+=gain;
  S.stats.earn+=gain;
  if(typeof S.daily==='object') S.daily.earnToday=(S.daily.earnToday||0)+gain;
  addLedger(`🎫 皮肤券转换 ×${n}`, gain);
  save();
  if(typeof SFX!=='undefined'&&SFX.coin) SFX.coin();
  if(typeof renderAll==='function') renderAll();
  toast(`🎫 已转换 ${n} 张皮肤券 → +${fmt(gain)}`, 2600);
  if(typeof checkEnd==='function') checkEnd();
  return true;
}
