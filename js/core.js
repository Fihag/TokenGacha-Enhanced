"use strict";
/* ================================================================
   TokenGacha · 核心层 (core.js)
   抽卡核心 (含 UTR / 限定池 / 0731 独立爆率) / 工作核心 (含限定翻倍)
   ================================================================ */

const DSV73_DROP = 0.015; // DeepSeek V4 Flash 0731 独立爆率(每次抽卡固定 1.5%)
const ANTH_BAN_CHANCE = 0.005;

/* ---------- 抽卡核心 ---------- */
function drawRarity(poolKey){
  const pool = POOLS[poolKey];
  const pityMax = pool.pityMax || PITY_MAX;
  if(S.pity[poolKey] >= pityMax-1){
    // 保底: 限定池 100 抽大保底必出当期限定 UTR; 其他池 20% UR / 80% SSR
    if(pool.banner) return 'UTR';
    return Math.random()<.2?'UR':'SSR';
  }
  const r=Math.random(); let acc=0;
  for(const t of RORDER_DESC){ acc+=pool.rates[t]||0; if(r<acc) return t; }
  return 'N';
}
function makeCard(poolKey, rarity, force0731){
  let cands;
  if(force0731){
    cands = MODELS.filter(m=>m.id==='dsv4fl73');
  }else{
    cands = MODELS.filter(m=>m.r===rarity && m.id!=='dsv4fl73' && (!m.bannerOnly || (poolKey==='banner' && LIMITED_IDS.has(m.id))));
  }
  const m = cands[Math.floor(Math.random()*cands.length)];
  const base = m.quota || RARITY[rarity].quota;
  const quota = POOLS[poolKey].half ? Math.round(base/2) : base;
  return { uid:S.uid++, m:m.id, tokens:quota, max:quota, half:POOLS[poolKey].half };
}
// 限定池保底: 必出当期限定 UTR (v5 赛季=dsv5pro, 神话回响=opus6/gem4pro)
function makeLimited(poolKey){
  let limited = MODELS.filter(m=>LIMITED_IDS.has(m.id) && m.r==='UTR'); // 大保底锁定 UTR
  if(!limited.length) limited = MODELS.filter(m=>LIMITED_IDS.has(m.id)); // 兜底: 赛季无UTR限定则退回全部限定
  if(!limited.length) limited = MODELS.filter(m=>m.r==='UTR' && !m.bannerOnly); // 终极兜底: 任意非限定UTR
  const m = limited[Math.floor(Math.random()*limited.length)];
  const base = m.quota || RARITY[m.r].quota;
  const quota = POOLS[poolKey].half ? Math.round(base/2) : base;
  return { uid:S.uid++, m:m.id, tokens:quota, max:quota, half:POOLS[poolKey].half };
}
function recordHist(cards){
  const t=Date.now();
  for(const c of cards) S.hist.push({t, pool:c._pool, m:c.m, r:MMAP[c.m].r});
  if(S.hist.length>100) S.hist.splice(0, S.hist.length-100);
}
// 最佳出货: 先比稀有度, 同档比智能指数
function maybeBest(c){
  const m=MMAP[c.m];
  if(!S.stats.best){ S.stats.best=c.m; return; }
  const b=MMAP[S.stats.best];
  const d=RORDER.indexOf(m.r)-RORDER.indexOf(b.r);
  if(d>0 || (d===0 && m.idx>b.idx)) S.stats.best=c.m;
}
// 幻觉彩蛋: 非UR/UTR出货时有 0.2% 概率伪装成UR(gold闪+UR特效), 揭晓后强制变回R并垫少量token作精神损失费
function maybeHallucinate(c, poolKey){
  if(c.m==='dsv4fl73') return; // 0731 是独立爆率联名, 不参与
  if(RORDER.indexOf(MMAP[c.m].r) >= RORDER.indexOf('UR')) return; // 真UR/UTR不装幻觉
  if(Math.random() >= 0.002) return;
  const legal = m => m.r==='R' && m.id!=='dsv4fl73' && (!m.bannerOnly || (poolKey==='banner' && LIMITED_IDS.has(m.id)));
  const rCands = MODELS.filter(legal);
  const uCands = MODELS.filter(m=> m.r==='UR' && m.id!=='dsv4fl73' && (!m.bannerOnly || (poolKey==='banner' && LIMITED_IDS.has(m.id))));
  if(!rCands.length || !uCands.length) return;
  const real = rCands[Math.floor(Math.random()*rCands.length)];
  const fake = uCands[Math.floor(Math.random()*uCands.length)];
  const comp = 300000; // 精神损失费 30万 token
  c.m = real.id;
  c.tokens = (real.quota || RARITY.R.quota) + comp;
  c.max = c.tokens;
  c._halluc = fake.id; // 揭晓前显示 UR 伪装
  c._comp = comp;
}
function doPulls(poolKey, count){
  const cards=[];
  const pool = POOLS[poolKey];
  const pityMax = pool.pityMax || PITY_MAX;
  if(typeof dailyResetIfNeeded==='function') dailyResetIfNeeded(); // 跨天时先重置今日计数
  for(let i=0;i<count;i++){
    const atPity = S.pity[poolKey] >= pityMax-1; // 保底触发时必出 SSR+, 不受 0731 独立爆率抢占
    const force0731 = !atPity && Math.random() < DSV73_DROP;
    const r = force0731 ? 'SSR' : drawRarity(poolKey);
    S.pity[poolKey] = (r==='SSR'||r==='UR'||r==='UTR') ? 0 : S.pity[poolKey]+1;
    let c;
    if(atPity && pool.banner){
      c = makeLimited(poolKey); // 大保底: 必出限定
    }else{
      c = makeCard(poolKey, r, force0731);
    }
    c._pool = poolKey;
    maybeHallucinate(c, poolKey);
    cards.push(c);
    S.stats.pulls++;
    S.daily.pulls=(S.daily.pulls||0)+1;
    S.stats.byR[MMAP[c.m].r]=(S.stats.byR[MMAP[c.m].r]||0)+1;
    S.dex[c.m]=(S.dex[c.m]||0)+1;
    maybeBest(c);
    if(poolKey==='banner'){
      S.bannerPulls++;
      if(LIMITED_IDS.has(c.m)) S.bannerLimited++;
    }
  }
  if(count===10 && !cards.some(c=>['SR','SSR','UR','UTR'].includes(MMAP[c.m].r))){
    const old = cards[cards.length-1];
    S.stats.byR[MMAP[old.m].r]--;
    if(S.dex[old.m]){ S.dex[old.m]--; if(S.dex[old.m]<=0) delete S.dex[old.m]; }
    cards[cards.length-1] = makeCard(poolKey,'SR');
    cards[cards.length-1]._pool = poolKey;
    S.pity[poolKey]=0; // 十连保底实际出货 SR+, 该池保底计数清零
    const c=cards[cards.length-1];
    S.stats.byR.SR++;
    S.dex[c.m]=(S.dex[c.m]||0)+1;
    maybeBest(c);
  }
  S.inv.push(...cards);
  recordHist(cards);
  if(typeof afterPulls==='function') afterPulls(cards); // 皮肤掉落 hook
  save();
  return cards;
}

/* ---------- 工作核心 ---------- */
function taskPayout(model){
  let pay = RARITY[model.r].basePay*payFactor(model);
  const boosted = LIMITED_IDS.has(model.id);
  if(boosted) pay *= 2; // 限定卡加成: 用卡接单收入翻倍
  const roll = Math.random();
  const pGreat = .02 + model.idx/800;
  const pRework = Math.min(.25,Math.max(.04,.25-model.idx/250));
  const pDisaster = Math.min(.02,Math.max(0,(28-model.idx)/1200));
  if(roll<pDisaster) return {amt:-50*PAY_BOOST, evt:'disaster', boosted};
  if(roll<pDisaster+pRework) return {amt:pay*.4*PAY_BOOST, evt:'rework', boosted};
  if(roll>1-pGreat) return {amt:pay*2.5*PAY_BOOST, evt:'great', boosted};
  return {amt:pay*(.85+Math.random()*.3)*PAY_BOOST, evt:'ok', boosted};
}
function bestCard(){
  let best=null;
  for(const c of S.inv){
    if(c.tokens<TASK_TOKENS) continue;
    if(!best || RORDER.indexOf(MMAP[c.m].r)>RORDER.indexOf(MMAP[best.m].r)
      || (MMAP[c.m].r===MMAP[best.m].r && MMAP[c.m].idx>MMAP[best.m].idx)) best=c;
  }
  return best;
}
function banClaudeCards(){
  for(const c of S.inv){ if(MMAP[c.m].vendor==='Anthropic') c.tokens=0; }
  S.inv=S.inv.filter(c=>c.tokens>0);
  save();
}
// 消耗 n 单（按稀有度优先），返回明细
// 大单量优化: 一次性排序可用卡 + 指针按序消耗, 避免每单全表扫描与 splice
function consumeTasks(n){
  const items=[];
  const usable = S.inv.filter(c=>c.tokens>=TASK_TOKENS)
    .sort((a,b)=>{
      // 高稀有度优先(UTR→N): RORDER 升序, 反转为降序, 同档比智能指数高者先
      const r=RORDER.indexOf(MMAP[b.m].r)-RORDER.indexOf(MMAP[a.m].r);
      return r!==0 ? r : MMAP[b.m].idx-MMAP[a.m].idx;
    });
  let pos=0;
  for(let i=0;i<n && pos<usable.length;i++){
    const c=usable[pos];
    c.tokens-=TASK_TOKENS;
    const m=MMAP[c.m];
    items.push({m, res:taskPayout(m)});
    if(c.tokens<TASK_TOKENS) pos++; // 余量不足一单: 换下一张, 最后统一过滤
    if(m.vendor==='Anthropic' && Math.random() < ANTH_BAN_CHANCE){
      banClaudeCards();
      items._ccBan = true;
      break;
    }
  }
  if(pos>0) S.inv=S.inv.filter(c=>c.tokens>0); // 耗尽卡统一移除
  return items;
}
