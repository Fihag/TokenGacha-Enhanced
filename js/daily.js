"use strict";
/* ================================================================
   TokenGacha · 每日签到 & 日常任务 (daily.js)
   ================================================================ */

function todayStr(){
  const t=new Date();
  return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
}

// 每日 0 点重置任务进度
function dailyResetIfNeeded(){
  const today=todayStr();
  if(S.daily.day!==today){
    S.daily.day=today;
    S.daily.earnToday=0;
    S.daily.pulls=0;
    S.daily.tasks=0;
    S.daily.claimed={};
    save();
  }
}

function doSign(){
  dailyResetIfNeeded();
  const today=todayStr();
  if(S.daily.lastSign===today){ toast('今天已经签过到啦！明天再来'); SFX.bad(); return; }
  // 连续签到判断: 昨天签过 → streak+1, 否则重新 1
  const y=new Date(); y.setDate(y.getDate()-1);
  const yStr=`${y.getFullYear()}-${String(y.getMonth()+1).padStart(2,'0')}-${String(y.getDate()).padStart(2,'0')}`;
  S.daily.streak = (S.daily.lastSign===yStr) ? S.daily.streak+1 : 1;
  S.daily.lastSign=today;
  const idx=(S.daily.streak-1)%SIGN_REWARDS.length;
  const amt=SIGN_REWARDS[idx];
  S.money+=amt;
  S.stats.earn+=amt;
  S.daily.earnToday+=amt;
  S.skinTickets=(S.skinTickets||0)+1;
  addLedger(`📅 签到第 ${S.daily.streak} 天`, amt);
  save(); renderAll();
  SFX.coin();
  burst(innerWidth/2, innerHeight/3, ['#f59e0b','#2f6bff','#fff'], 90, 8);
  toast(`📅 签到成功！第 ${S.daily.streak} 天 +${fmt(amt)} +1 皮肤券`, 2600);
}

// 日常任务: 进度查询 / 领取
function dailyTaskProgress(t){
  switch(t.id){
    case 'pull100':   return Math.min(t.target, S.daily.pulls||0);
    case 'work800':   return Math.min(t.target, S.daily.tasks||0);
    case 'earn25000': return Math.min(t.target, Math.round(S.daily.earnToday||0));
  }
  return 0;
}
function claimDailyTask(id){
  dailyResetIfNeeded();
  const t=DAILY_TASKS.find(x=>x.id===id);
  if(!t) return;
  if(S.daily.claimed[id]){ toast('该任务已领取过啦'); return; }
  if(dailyTaskProgress(t)<t.target){ toast('任务还没完成呢'); SFX.bad(); return; }
  S.daily.claimed[id]=true;
  S.money+=t.rewardMoney;
  S.stats.earn+=t.rewardMoney;
  S.skinTickets=(S.skinTickets||0)+(t.rewardTicket||0);
  if(t.rewardFreeTen) S.freeTen=(S.freeTen||0)+t.rewardFreeTen;
  addLedger(`📋 任务「${t.name}」`, t.rewardMoney);
  save(); renderAll();
  SFX.coin();
  burst(innerWidth/2, innerHeight/3, ['#16a34a','#f59e0b','#fff'], 80, 7);
  toast(`📋 任务完成！+${fmt(t.rewardMoney)}${t.rewardTicket?` +${t.rewardTicket}皮肤券`:''}${t.rewardFreeTen?` +${t.rewardFreeTen}免费十连`:''}`, 2600);
}

function renderActivity(){
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
    <button class="work-btn manual" id="btn-sign" style="margin-top:10px" ${signedToday?'disabled':''}>${signedToday?'✅ 今日已签到':'📅 立即签到 (+¥'+SIGN_REWARDS[nextIdx]+' +1皮肤券)'}</button>`;
  const signBtn=$('btn-sign');
  if(signBtn) signBtn.onclick=()=>{ SFX.click(); doSign(); };
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
  taskBox.querySelectorAll('[data-task]').forEach(b=>b.onclick=()=>{ SFX.click(); claimDailyTask(b.dataset.task); });
}
