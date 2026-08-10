"use strict";
/* ================================================================
   TokenGacha · 皮肤/特效系统 (skins.js)
   主题 CSS 变量切换 / 抽卡随机掉落 / 皮肤券兑换
   ================================================================ */

function applySkin(id){
  const skin = SKINS.find(s=>s.id===id);
  if(!skin) return;
  const root=document.documentElement.style;
  for(const [k,v] of Object.entries(skin.vars)) root.setProperty(k,v);
  S.skin=id;
  save();
}

function rollSkinDrop(cards){
  if(Math.random() < SKIN_DROP_RATE){
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
  const html=`<h3>🎨 皮肤中心 <span style="font-size:12px;color:var(--faint)">持有皮肤券 <b id="skin-tk-now" style="color:var(--gold)">${S.skinTickets||0}</b> 张</span><button class="x" onclick="closeModal()">×</button></h3>
  <div class="skin-list">${rows}</div>
  <div class="note">· 抽卡有 ${(SKIN_DROP_RATE*100).toFixed(1)}% 概率随机掉落未拥有皮肤<br>· 签到与日常任务可获皮肤券，1 张兑换 1 个皮肤<br>· 皮肤仅改变配色与氛围，不影响任何概率（吧）</div>`;
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
}
