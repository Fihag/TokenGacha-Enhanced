/* ================================================================
   TokenGacha · 每日签到 & 日常任务 (daily.js)
   逻辑函数返回结果，音效/弹窗/渲染由 renderActivity 调用层处理
   ================================================================ */
import { SIGN_REWARDS, DAILY_TASKS } from "./config.js";
import { S, save, $, fmt, addLedger } from "./state.js";
import { SFX, toast, burst } from "./fx.js";
import { checkEnd } from "./ui/modals.js";
import { renderAll } from "./ui/render.js";
import { convertSkinTickets, skinPickerHTML } from "./skins.js";

export function todayStr(){
  // 统一用 +08:00 日切，与 BANNER_EPOCH 一致
  const d = new Date(Date.now() + 8*3600000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}

// 每日 0 点重置任务进度（+08 日切，与 BANNER_EPOCH 一致）
export function dailyResetIfNeeded(){
  const today=todayStr();
  if(S.daily.day!==today){
    S.daily.day=today;
    S.daily.earnToday=0;
    S.daily.pulls=0;
    S.daily.tasks=0;
    S.daily.crafts=0;
    S.daily.markets=0;
    S.daily.claimed={};
    // 清理旧任务残留
    if(S.daily.signDay!=null) delete S.daily.signDay;
    save();
  }
}

// 返回 {ok, amt?, streak?, already?}；UI 副作用留给调用方
export function doSign(){
  dailyResetIfNeeded();
  const today=todayStr();
  if(S.daily.lastSign===today) return {ok:false, already:true};
  // 连续签到判断: 昨天签过 → streak+1, 否则重新 1（+08 日切）
  const d = new Date(Date.now() + 8*3600000 - 86400000);
  const yStr=`${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
  S.daily.streak = (S.daily.lastSign===yStr) ? S.daily.streak+1 : 1;
  S.daily.lastSign=today;
  const idx=(S.daily.streak-1)%SIGN_REWARDS.length;
  const amt=SIGN_REWARDS[idx];
  S.money+=amt;
  S.stats.earn+=amt;
  S.daily.earnToday+=amt;
  addLedger(`📅 签到第 ${S.daily.streak} 天`, amt);
  save();
  return {ok:true, amt, streak:S.daily.streak};
}

// 日常任务: 进度查询 / 领取（兼容旧 id work800/earn25000）
export function dailyTaskProgress(t){
  switch(t.id){
    case 'pull100':   return Math.min(t.target, S.daily.pulls||0);
    case 'work300':
    case 'work800':   return Math.min(t.target, S.daily.tasks||0);
    case 'earn18000':
    case 'earn25000': return Math.min(t.target, Math.round(S.daily.earnToday||0));
    case 'craft2':    return Math.min(t.target, S.daily.crafts||0);
    case 'market2':   return Math.min(t.target, S.daily.markets||0);
  }
  // 通用：若任务自带 check 函数则优先使用
  if(t.check) try{ return Math.min(t.target, t.check(S)); }catch(e){}
  return 0;
}
export function claimDailyTask(id){
  dailyResetIfNeeded();
  const t=DAILY_TASKS.find(x=>x.id===id);
  if(!t) return {ok:false, msg:'未知任务'};
  if(S.daily.claimed[id]) return {ok:false, msg:'该任务已领取过啦'};
  if(dailyTaskProgress(t)<t.target) return {ok:false, msg:'任务还没完成呢'};
  S.daily.claimed[id]=true;
  S.money+=t.rewardMoney;
  S.stats.earn+=t.rewardMoney;
  S.skinTickets=(S.skinTickets||0)+(t.rewardTicket||0);
  if(t.rewardFreeTen) S.freeTen=(S.freeTen||0)+t.rewardFreeTen;
  addLedger(`📋 任务「${t.name}」`, t.rewardMoney);
  save();
  return {ok:true, t};
}

export function renderActivity(){
  dailyResetIfNeeded();
  // 签到区
  const signBox=$('daily-sign');
  if(!signBox) return;
  const today=todayStr();
  const signedToday = S.daily.lastSign===today;
  const doneIdx = signedToday ? (S.daily.streak-1)%SIGN_REWARDS.length : -1; // 已签: 标记到已领档位
  const nextIdx = S.daily.streak%SIGN_REWARDS.length; // 未签: 高亮下一档
  signBox.innerHTML=`
    <div class="panel-title">📅 每日签到<span class="right">连续签到第 ${S.daily.streak} 天</span></div>
    <div class="sign-row">
      ${SIGN_REWARDS.map((amt,i)=>{
        const done = signedToday && i<=doneIdx;
        const cur = !signedToday && i===nextIdx;
        return `<div class="sign-day ${done?'done':''} ${cur?'cur':''}"><div class="d">第${i+1}天</div><div class="a">¥${amt}</div>${done?'✔':''}</div>`;
      }).join('')}
    </div>
    <button class="work-btn manual" id="btn-sign" style="margin-top:10px" ${signedToday?'disabled':''}>${signedToday?'✅ 今日已签到':'📅 立即签到 (+¥'+SIGN_REWARDS[nextIdx]+')'}</button>`;
  const signBtn=$('btn-sign');
  if(signBtn) signBtn.onclick=()=>{
    SFX.click();
    const res=doSign();
    if(res.already){ toast('今天已经签过到啦！明天再来'); SFX.bad(); return; }
    if(!res.ok) return;
    renderAll();
    SFX.coin();
    burst(innerWidth/2, innerHeight/3, ['#f59e0b','#2f6bff','#fff'], 90, 8);
    toast(`📅 签到成功！第 ${res.streak} 天 +${fmt(res.amt)}`, 2600);
    checkEnd();
  };
  // 任务区
  const taskBox=$('daily-tasks');
  taskBox.innerHTML=`<div class="panel-title">📋 日常任务<span class="right">每日 0 点重置</span></div>`;
  for(const t of DAILY_TASKS){
    const prog=dailyTaskProgress(t);
    const done=prog>=t.target;
    const claimed=S.daily.claimed[t.id];
    taskBox.insertAdjacentHTML('beforeend',`
      <div class="task-card ${claimed?'claimed':''}">
        <div class="t-main">
          <div class="t-name">${t.name} <small>${t.desc}</small></div>
          <div class="t-prog"><div class="bar"><i style="width:${Math.min(100,prog/t.target*100)}%"></i></div><span>${prog}/${t.target}</span></div>
        </div>
        <div class="t-reward">¥${t.rewardMoney}${t.rewardTicket?' · 🎫×'+t.rewardTicket:''}${t.rewardFreeTen?' · 🎁十连×'+t.rewardFreeTen:''}</div>
        <button class="mini-btn" data-task="${t.id}" ${(!done||claimed)?'disabled':''}>${claimed?'已领取':'领取'}</button>
      </div>`);
  }
  // 皮肤券显示
  $('skin-tickets').textContent = S.skinTickets||0;
  taskBox.querySelectorAll('[data-task]').forEach(b=>b.onclick=()=>{
    SFX.click();
    const res=claimDailyTask(b.dataset.task);
    if(!res.ok){ if(res.msg) toast(res.msg); if(!res.msg || res.msg==='任务还没完成呢') SFX.bad(); return; }
    const t=res.t;
    renderAll();
    SFX.coin();
    burst(innerWidth/2, innerHeight/3, ['#16a34a','#f59e0b','#fff'], 80, 7);
    toast(`📋 任务完成！+${fmt(t.rewardMoney)}${t.rewardTicket?` +${t.rewardTicket}皮肤券`:''}${t.rewardFreeTen?` +${t.rewardFreeTen}免费十连`:''}`, 2600);
    checkEnd();
  });
  const quickBtn=$('btn-quick-convert');
  if(quickBtn && !quickBtn.dataset.bound){
    quickBtn.dataset.bound='1';
    quickBtn.onclick=()=>{
      SFX.click();
      if((S.skinTickets||0)<1){ toast('皮肤券不足，去签到/做任务吧'); SFX.bad(); return; }
      convertSkinTickets(1);
      $('skin-tickets').textContent = S.skinTickets||0;
    };
  }
}
