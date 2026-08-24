"use strict";
/* ================================================================
   TokenGacha · 远征无限 Hackathon (expedition.js)
   3卡组队 / 5关分支 / 无限递增 / 厂商羁绊
   ================================================================ */
const EXPED_STAGES = 5;
const EXPED_TOKEN_COST = TASK_TOKENS; // 每卡每远征消耗 20w

function expedBond(team){
  const cnt={};
  for(const c of team) cnt[MMAP[c.m].vendor]=(cnt[MMAP[c.m].vendor]||0)+1;
  let disasterDelta=0, reworkDelta=0, greatDelta=0, payMult=1;
  for(const [vendor, needObj] of Object.entries(VENDOR_BOND)){
    const have=cnt[vendor]||0;
    if(have >= needObj.need){
      const mult = have>=3 ? 1.5 : 1;
      if(vendor==='DeepSeek') disasterDelta -= 0.05*mult;
      else if(vendor==='Anthropic') reworkDelta -= 0.06*mult;
      else if(vendor==='Google') greatDelta += 0.02*mult;
      else if(vendor==='阿里通义') payMult += 0.05*mult;
    }
  }
  return {disasterDelta, reworkDelta, greatDelta, payMult, cnt};
}
function expedAvgIdx(team){
  return team.reduce((s,c)=>s+MMAP[c.m].idx,0)/team.length;
}
function expedAvgPay(team){
  return team.reduce((s,c)=> s + expectedTaskPay(MMAP[c.m], c.stars||0), 0)/team.length;
}
function expedCanStart(){
  const usable=S.inv.filter(c=>c.tokens>=EXPED_TOKEN_COST);
  return usable.length>=EXPED_CFG.team;
}
function expedTeamByUids(uids){
  return uids.map(uid=> S.inv.find(c=>c.uid===uid)).filter(Boolean);
}
let _expedRun=null; // 当前远征

function startExpedition(uids){
  if(!Array.isArray(uids) || uids.length!==EXPED_CFG.team) return {ok:false, msg:`需选择 ${EXPED_CFG.team} 张卡`};
  const team=expedTeamByUids(uids);
  if(team.length!==EXPED_CFG.team) return {ok:false, msg:'卡片不存在'};
  if(team.some(c=>c.tokens < EXPED_TOKEN_COST)) return {ok:false, msg:'Token 不足'};
  const lv = (S.expedition.lv||0) + 1; // 下一关
  // 预扣 token
  for(const c of team) c.tokens -= EXPED_TOKEN_COST;
  S.inv=S.inv.filter(c=>c.tokens>=TASK_TOKENS);
  // 若 team 中有被过滤的卡，需要从 team 引用仍保留对象但已不在库？我们已扣，team 对象仍持有引用，但 S.inv 已无，结算后不回库（消耗品）
  // 为避免“用被消耗的卡再次远征”，本次远征用快照，不回库
  _expedRun={team: team.map(c=> ({...c, vendor:MMAP[c.m].vendor, idx:MMAP[c.m].idx, name:MMAP[c.m].name, r:MMAP[c.m].r})), lv, stage:0, total:0, history:[], bond:expedBond(team)};
  save();
  if(typeof renderAll==='function') renderAll();
  showExpedStage();
  return {ok:true};
}
function expedStageEvent(lv, stage){
  const pool=[...CLIENT_REQS, ...MEME_LINES.slice(0,12)];
  const req=pool[Math.floor(Math.random()*pool.length)];
  return {req, lv, stage};
}
function showExpedStage(){
  if(!_expedRun) return;
  const run=_expedRun;
  if(run.stage >= EXPED_STAGES){
    finishExpedition();
    return;
  }
  const ev=expedStageEvent(run.lv, run.stage+1);
  const avgIdx=expedAvgIdx(run.team.map(t=> ({m:t.m} )).map(x=> ({m:x.m}))); // 复用
  // 实际 avgIdx 从 team snapshot
  const teamIdxAvg=run.team.reduce((s,c)=>s+c.idx,0)/run.team.length;
  const bond=run.bond;
  const html=`<h3>🚀 远征 Lv.${run.lv} · 第 ${run.stage+1}/${EXPED_STAGES} 关<button class="x" onclick="closeModal()">×</button></h3>
  <div style="background:var(--panel2);border:1px solid var(--line);border-radius:10px;padding:10px 12px;font-size:12.5px;line-height:1.7;margin-bottom:8px">
    <div style="font-weight:800">关卡事件</div>
    <div style="color:var(--dim)">${ev.req}</div>
    <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;font-size:11px;color:var(--dim)">
      <span>队伍均分 ${teamIdxAvg.toFixed(1)}</span>
      <span>羁绊 ${Object.entries(bond.cnt).filter(([v,c])=>c>=2).map(([v])=>v+'×'+bond.cnt[v]).join(' ')||'无'}</span>
      <span>Lv.${run.lv} 难度 +${(run.lv*0.3).toFixed(1)}%</span>
    </div>
  </div>
  <div style="display:flex;gap:8px">
    <button class="big-btn" style="flex:1" onclick="chooseExped('steady')">🛡️ 稳妥推进<small style="display:block;font-weight:500;opacity:.8">事故- 返工- 收益×0.9</small></button>
    <button class="big-btn danger" style="flex:1" onclick="chooseExped('risky')">⚡ 冒险冲刺<small style="display:block;font-weight:500;opacity:.8">大成功+ 风险+ 收益×1.3</small></button>
  </div>
  <div style="margin-top:10px;font-size:11px;color:var(--faint)">累计收益 ${fmt(run.total)} · 已过 ${run.stage} 关</div>`;
  showModal(html, true);
}
function chooseExped(choice){
  if(!_expedRun) return;
  const run=_expedRun;
  const teamAvgIdx=run.team.reduce((s,c)=>s+c.idx,0)/run.team.length;
  const teamAvgPay=run.team.reduce((s,c)=>{
    const m=MMAP[c.m];
    let pay=RARITY[m.r].basePay*payFactor(m);
    const allLim=(typeof LIMITED_ALL!=='undefined'?LIMITED_ALL:LIMITED_IDS);
    if(allLim.has(m.id)) pay*=2;
    if(c.stars) pay*=(1+c.stars*0.05);
    return s+pay;
  },0)/run.team.length;
  const lv=run.lv;
  // 基础概率
  let pGreat=.02+teamAvgIdx/800;
  let pRework=Math.min(.25,Math.max(.04,.25-teamAvgIdx/250));
  let pDisaster=Math.min(.02,Math.max(0,(28-teamAvgIdx)/1200));
  // lv 递增
  pDisaster+=lv*0.002;
  pRework+=lv*0.003;
  pGreat=Math.max(0.005, pGreat - lv*0.001);
  // 羁绊
  pDisaster+=run.bond.disasterDelta;
  pRework+=run.bond.reworkDelta;
  pGreat+=run.bond.greatDelta;
  let payMult=run.bond.payMult;
  // 选择分支
  if(choice==='steady'){
    pRework=Math.max(0.01, pRework-0.05);
    pGreat=Math.max(0.005, pGreat-0.01);
    payMult*=0.9;
  }else{
    pDisaster+=0.015;
    pGreat+=0.04;
    payMult*=1.3;
  }
  pDisaster=Math.max(0,Math.min(0.08,pDisaster));
  pRework=Math.max(0,Math.min(0.30,pRework));
  pGreat=Math.max(0,Math.min(0.20,pGreat));
  const roll=Math.random();
  let evt='ok', amt=0;
  if(roll < pDisaster){ evt='disaster'; amt=-50*PAY_BOOST*payMult; }
  else if(roll < pDisaster+pRework){ evt='rework'; amt=teamAvgPay*0.4*PAY_BOOST*payMult; }
  else if(roll > 1-pGreat){ evt='great'; amt=teamAvgPay*2.5*PAY_BOOST*payMult; }
  else { evt='ok'; amt=teamAvgPay*(0.85+Math.random()*0.3)*PAY_BOOST*payMult; }
  amt=Math.round(amt);
  run.history.push({stage:run.stage+1, choice, evt, amt, roll});
  run.total+=amt;
  run.stage++;
  closeModal();
  // 飘字
  const label=({great:'🤩 大成功', ok:'✅ 交付', rework:'🔧 返工', disaster:'💥 事故'}[evt]);
  toast(`${label} ${amt>=0?'+':''}${fmt(amt)}`, 1600);
  if(evt==='disaster') SFX.bad(); else if(evt==='great') SFX.coin();
  setTimeout(()=>{
    if(run.stage>=EXPED_STAGES) finishExpedition();
    else showExpedStage();
  }, 420);
}
function finishExpedition(){
  if(!_expedRun) return;
  const run=_expedRun;
  const before=S.money;
  S.money=Math.max(0,S.money+run.total);
  const applied=S.money-before;
  if(applied>0) S.stats.earn+=applied;
  S.daily.earnToday=(S.daily.earnToday||0)+Math.max(0,applied);
  S.expedition.runs=(S.expedition.runs||0)+1;
  const win=run.total>0 && !run.history.some(h=>h.evt==='disaster');
  if(win){
    S.expedition.wins=(S.expedition.wins||0)+1;
    S.expedition.lv=Math.max(S.expedition.lv||0, run.lv);
    S.expedition.bestLv=Math.max(S.expedition.bestLv||0, run.lv);
  }
  S.expedition.history.unshift({lv:run.lv, total:applied, win, ts:Date.now(), team:run.team.map(c=>c.name).join(','), stages:run.history});
  if(S.expedition.history.length>20) S.expedition.history.length=20;
  addLedger(`🚀 远征 Lv.${run.lv} ${win?'· 胜利':''}`, applied);
  save();
  _expedRun=null;
  if(typeof renderAll==='function') renderAll();
  if(typeof renderExpedition==='function') renderExpedition();
  const winTxt=win?`<p style="color:var(--green)">🎉 远征成功！无事故通关，Lv.${run.lv} 已解锁。</p>`:`<p style="color:var(--dim)">远征结束，本次收益 ${fmt(applied)}。${run.history.some(h=>h.evt==='disaster')?'有事故发生，下次稳一点。':''}</p>`;
  const detail=run.history.map(h=>`第${h.stage}关 [${h.choice==='steady'?'稳妥':'冒险'}] ${h.evt} ${h.amt>=0?'+':''}${fmt(h.amt)}`).join('<br>');
  showModal(`<h3>🚀 远征结算 Lv.${run.lv}<button class="x" onclick="closeModal()">×</button></h3>
  ${winTxt}
  <div style="background:var(--panel2);border:1px solid var(--line);border-radius:10px;padding:10px 12px;font-size:12px;line-height:1.7">${detail}</div>
  <p style="font-size:13px">合计 <b style="color:${applied>=0?'var(--green)':'var(--red)'}">${fmt(applied)}</b> · 队伍 ${run.team.map(c=>c.name).join(' / ')}</p>
  <button class="big-btn ghost" onclick="closeModal()">继续</button>`);
  SFX.win();
  burst(innerWidth/2, innerHeight/3, win?['#16a34a','#f59e0b','#fff']:['#67719a','#fff'], win?140:70, win?9:5);
  checkEnd();
}
function expedNextLv(){ return (S.expedition.lv||0)+1; }
let _expedSelected=new Set();
function renderExpedition(){
  const lvEl=$('exped-lv'), statEl=$('exped-stats'), teamBox=$('exped-team'), histBox=$('exped-history'), notice=$('exped-notice');
  if(!teamBox) return;
  const lv=S.expedition.lv||0, best=S.expedition.bestLv||0, runs=S.expedition.runs||0, wins=S.expedition.wins||0;
  if(lvEl) lvEl.textContent=`当前 Lv.${lv} · 最高 ${best} · ${wins}/${runs} 胜`;
  if(statEl) statEl.textContent=`胜率 ${runs?Math.round(wins/runs*100):0}%`;
  if(notice) notice.textContent=`远征无重置，下次 Lv.${lv+1} · 难度随 Lv 递增 · 羁绊可对冲 · 每次消耗每卡 20w tokens`;
  const usable=S.inv.filter(c=>c.tokens>=EXPED_TOKEN_COST).sort((a,b)=>{
    const ra=RORDER.indexOf(MMAP[b.m].r)-RORDER.indexOf(MMAP[a.m].r);
    return ra!==0?ra: MMAP[b.m].idx-MMAP[a.m].idx;
  });
  teamBox.innerHTML='';
  if(!usable.length){
    teamBox.innerHTML='<div style="color:var(--faint);font-size:12.5px;padding:8px 2px">暂无可用卡（需至少 3 张且每张 ≥20w tokens）</div>';
  }else{
    for(const c of usable.slice(0,48)){
      const m=MMAP[c.m];
      const on=_expedSelected.has(c.uid);
      const d=document.createElement('div');
      d.className='exped-card'+(on?' on':'');
      d.dataset.uid=c.uid;
      d.innerHTML=`${m.id==='fihagv1'?'<div style="font-size:22px">🌈</div>':''}<div class="nm">${m.name}${c.stars?' ★'+c.stars:''}</div><div class="tk">${fmtK(c.tokens)} tok</div><div style="font-size:10px;color:var(--faint)">${m.r} · ${m.vendor}</div>`;
      if(m.id!=='fihagv1'){
        const img=iconImg(m.icon);
        img.style.cssText='width:30px;height:30px;margin:0 auto 4px;display:block';
        d.insertBefore(img, d.firstChild);
      }
      teamBox.appendChild(d);
    }
    teamBox.querySelectorAll('[data-uid]').forEach(el=>{
      el.onclick=()=>{
        const uid=Number(el.dataset.uid);
        if(_expedSelected.has(uid)){ _expedSelected.delete(uid); el.classList.remove('on'); }
        else{
          if(_expedSelected.size>=EXPED_CFG.team){ toast(`最多选 ${EXPED_CFG.team} 张`); SFX.bad(); return; }
          _expedSelected.add(uid); el.classList.add('on');
        }
        SFX.click();
      };
    });
  }
  const btn=$('btn-exped-start');
  if(btn && !btn.dataset.bound){
    btn.dataset.bound='1';
    btn.onclick=()=>{
      if(_expedSelected.size!==EXPED_CFG.team){ toast(`请选择 ${EXPED_CFG.team} 张组队`); SFX.bad(); return; }
      SFX.click();
      const res=startExpedition([..._expedSelected]);
      if(!res.ok){ toast(res.msg); SFX.bad(); return; }
      _expedSelected.clear();
    };
  }
  const randBtn=$('btn-exped-rand');
  if(randBtn && !randBtn.dataset.bound){
    randBtn.dataset.bound='1';
    randBtn.onclick=()=>{
      const pool=usable.slice(0,30);
      _expedSelected.clear();
      for(let i=0;i<Math.min(EXPED_CFG.team, pool.length);i++){
        const idx=Math.floor(Math.random()*pool.length);
        const c=pool.splice(idx,1)[0];
        if(c) _expedSelected.add(c.uid);
      }
      renderExpedition();
      SFX.click();
    };
  }
  if(histBox){
    const hist=S.expedition.history||[];
    if(!hist.length) histBox.innerHTML='<div style="color:var(--faint);font-size:12.5px;padding:8px 2px">暂无记录，完成一次远征后展示</div>';
    else histBox.innerHTML=hist.map(h=>{
      const ts=new Date(h.ts);
      const t=`${String(ts.getMonth()+1).padStart(2,'0')}-${String(ts.getDate()).padStart(2,'0')} ${String(ts.getHours()).padStart(2,'0')}:${String(ts.getMinutes()).padStart(2,'0')}`;
      return `<div style="display:flex;align-items:center;gap:8px;border:1px solid var(--line);border-radius:10px;padding:8px 10px;background:var(--panel2);font-size:12px">
        <span style="font-weight:800">Lv.${h.lv}</span><span style="color:${h.win?'var(--green)':'var(--red)'}">${h.win?'胜利':'结束'}</span><span style="color:var(--dim)">${fmt(h.total)}</span><span style="margin-left:auto;color:var(--faint);font-size:10.5px">${t}</span>
      </div>`;
    }).join('');
  }
}
