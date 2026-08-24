"use strict";
/* ================================================================
   TokenGacha · 工作流 (拆自 ui.js)
   ================================================================ */
/* ---------- 工作流（批量 + 自动） ---------- */
let working=false, skipFlag=false;
const ACCEL_START=(typeof TUNING!=='undefined'?TUNING.ACCEL_START:260), ACCEL_BLOCK=(typeof TUNING!=='undefined'?TUNING.ACCEL_BLOCK:32), ACCEL_DECAY=(typeof TUNING!=='undefined'?TUNING.ACCEL_DECAY:0.68), MIN_INTERVAL=(typeof TUNING!=='undefined'?TUNING.MIN_INTERVAL:1);
const SFX_GAP_MIN=(typeof TUNING!=='undefined'?TUNING.SFX_GAP_MIN:20), SFX_GAP_RATIO=(typeof TUNING!=='undefined'?TUNING.SFX_GAP_RATIO:4);
const TERM_MAX_NODES=(typeof TUNING!=='undefined'?TUNING.TERM_MAX_NODES:600);
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
  const tprog=$('tprog'), tbar=$('tprog-bar'), ttxt=$('tprog-txt');
  if(tprog){ tprog.hidden=false; if(tbar) tbar.style.width='0%'; if(ttxt) ttxt.textContent=`0/${lines.length}`; }
  let i=0, timer=null, lastSfx=0, boosted=false;
  const finish=()=>{
    document.removeEventListener('visibilitychange', onVis);
    if(tprog) tprog.hidden=true;
    onDone(tp);
  };
  // 一次性快进所有剩余行(单次 DOM 写入 + 单次滚动, 避免逐行 reflow), 手动跳过与后台静默共用
  const fastFwd=(why)=>{
    const rest=[];
    while(i<lines.length){ rest.push(lines[i].text); i++; }
    if(tprog && tbar && ttxt){ tbar.style.width='100%'; ttxt.textContent=`${lines.length}/${lines.length}`; }
    tp.done((rest.length? rest.join('\n')+'\n' : '') + why);
    finish();
  };
  const step=()=>{
    if(i>=lines.length){ finish(); return; }
    if(skipFlag){
      skipFlag=false;
      fastFwd('> ⏭ 已手动跳过 · 剩余订单全部结算');
      return;
    }
    if(document.hidden){
      // 后台标签页: 浏览器节流 setInterval 到 ≥1s → 静默快进(静音, 不逐行 reflow)
      fastFwd('> ⏳ 后台静默完成 · 全部订单已结算');
      return;
    }
    let next=interval;
    if(i>=ACCEL_START){
      if(!boosted){ boosted=true; SFX.boost(); } // 进入加速段: 播加速音效
      next=Math.max(MIN_INTERVAL, interval*Math.pow(ACCEL_DECAY, Math.floor((i-ACCEL_START)/ACCEL_BLOCK)));
    }
    const L=lines[i];
    tp.line(L.text);
    if(tprog && tbar && ttxt){ tbar.style.width=(i/lines.length*100).toFixed(1)+'%'; ttxt.textContent=`${i+1}/${lines.length}`; }
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
  if(items._ccBan){ SFX.bad(); setTimeout(()=>showModal(claudeBanHTML(), true), 300); }
  if(totalTasks()<=0 && S.money<minPoolPrice()) return;
  if(totalTasks()<=0) toast('⚡ Token 已全部耗尽 → 去「购买Token」抽下一波');
}
function skipWork(){ skipFlag=true; } // 跳过按钮: 下一拍直接快进结算
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
