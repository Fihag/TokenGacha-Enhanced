"use strict";
/* ================================================================
   TokenGacha · 核心层 (core.js)
   抽卡核心 (含 UTR / 限定池 / 0731 独立爆率) / 工作核心 (含限定翻倍)
   ================================================================ */

const DSV73_DROP = (typeof PROBS!=='undefined'?PROBS.DSV73:0.015);
const FIHAG_DROP = (typeof PROBS!=='undefined'?PROBS.FIHAG:0.0001);
const ANTH_BAN_CHANCE = (typeof PROBS!=='undefined'?PROBS.ANTH_BAN:0.004);
const HALLUC_RATE = (typeof PROBS!=='undefined'?PROBS.HALLUC:0.002);

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
  let quota = POOLS[poolKey].half ? Math.round(base/2) : base;
  // 规整到 TASK_TOKENS 倍数，避免 270w/10w 残卡永远卡在卡库 (540w半价 270w→260w)
  quota = Math.floor(quota / TASK_TOKENS) * TASK_TOKENS;
  return { uid:S.uid++, m:m.id, tokens:quota, max:quota, half:POOLS[poolKey].half, stars:0, locked:false };
}
// 限定池保底: 必出当期限定 UTR (v5 赛季=dsv5pro, 神话回响=opus6/gem4pro)
function makeLimited(poolKey){
  let limited = MODELS.filter(m=>LIMITED_IDS.has(m.id) && m.r==='UTR'); // 大保底锁定 UTR
  if(!limited.length) limited = MODELS.filter(m=>LIMITED_IDS.has(m.id)); // 兜底: 赛季无UTR限定则退回全部限定
  if(!limited.length) limited = MODELS.filter(m=>m.r==='UTR' && !m.bannerOnly); // 终极兜底: 任意非限定UTR
  const m = limited[Math.floor(Math.random()*limited.length)];
  const base = m.quota || RARITY[m.r].quota;
  let quota = POOLS[poolKey].half ? Math.round(base/2) : base;
  quota = Math.floor(quota / TASK_TOKENS) * TASK_TOKENS;
  return { uid:S.uid++, m:m.id, tokens:quota, max:quota, half:POOLS[poolKey].half, stars:0, locked:false };
}
function recordHist(cards){
  const t=Date.now();
  const season = S.bannerSeason || null;
  for(const c of cards) S.hist.push({t, pool:c._pool, season: c._pool==='banner'?season:null, m:c.m, r:MMAP[c.m].r});
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
// Fihag V1: 全池 0.01% 隐藏神卡, 固定 1 亿 token, 品质 NB
function makeFihag(){
  return { uid:S.uid++, m:'fihagv1', tokens:100000000, max:100000000, half:false, stars:0, locked:false };
}
// 幻觉彩蛋: 非UR/UTR出货时有 0.2% 概率伪装成UR(gold闪+UR特效), 揭晓后强制变回R并垫少量token作精神损失费
function maybeHallucinate(c, poolKey){
  if(c.m==='dsv4fl73') return; // 0731 是独立爆率联名, 不参与
  if(RORDER.indexOf(MMAP[c.m].r) >= RORDER.indexOf('UR')) return; // 真UR/UTR不装幻觉
  if(Math.random() >= HALLUC_RATE) return;
  const legal = m => m.r==='R' && m.id!=='dsv4fl73' && (!m.bannerOnly || (poolKey==='banner' && LIMITED_IDS.has(m.id)));
  const rCands = MODELS.filter(legal);
  const uCands = MODELS.filter(m=> m.r==='UR' && m.id!=='dsv4fl73' && (!m.bannerOnly || (poolKey==='banner' && LIMITED_IDS.has(m.id))));
  if(!rCands.length || !uCands.length) return;
  const real = rCands[Math.floor(Math.random()*rCands.length)];
  const fake = uCands[Math.floor(Math.random()*uCands.length)];
  // 精神损失费必须让总额整除 TASK_TOKENS: R档基准 160万 + 30万 = 190万 → 剩 10万 token 永远无法消耗(卡死列表)
  const comp = 200000; // 削减10万 → 180万 = 正好 9 单, 消耗殆尽自动移除
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
    const gotFihag = Math.random() < FIHAG_DROP; // 全池 0.01% 隐藏神卡优先判定
    const force0731 = !gotFihag && !atPity && Math.random() < DSV73_DROP;
    const r = gotFihag ? 'NB' : (force0731 ? 'SSR' : drawRarity(poolKey));
    let c;
    if(gotFihag){
      c = makeFihag(); // Fihag V1: 固定 1 亿 token
    }else if(atPity && pool.banner){
      c = makeLimited(poolKey); // 大保底: 必出限定 UTR
    }else{
      c = makeCard(poolKey, r, force0731);
    }
    // 保底计数: 限定池只在抽到【当期限定 UTR】或 NB 时清零 —— 普通 SSR/UR 不重置, 保证 100 抽内必出限定 UTR;
    // 其他池维持 SSR+ 即清零。按实际出货(c.m 的真实稀有度)计数, 幻觉修正为R的卡不会假性触发保底。
    c._pool = poolKey;
    maybeHallucinate(c, poolKey);
    const mr = MMAP[c.m].r;
    const reset = pool.banner ? (mr==='NB' || (mr==='UTR' && LIMITED_IDS.has(c.m))) : (mr==='SSR'||mr==='UR'||mr==='UTR'||mr==='NB');
    S.pity[poolKey] = reset ? 0 : S.pity[poolKey]+1;

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
  if(count===10 && !cards.some(c=>['SR','SSR','UR','UTR','NB'].includes(MMAP[c.m].r))){
    // 十连保底：跳过幻觉伪装卡，避免把幻觉UR当有效保底
    let idx = cards.length-1; while(idx>=0 && cards[idx]._halluc) idx--;
    // 二次校验：确保被替换的不是幻觉衍生的真实R（双重保险）
    if(idx>=0 && cards[idx]._halluc) idx=-1;
    if(idx>=0){ const old = cards[idx];
    S.stats.byR[MMAP[old.m].r]--;
    if(S.dex[old.m]){ S.dex[old.m]--; if(S.dex[old.m]<=0) delete S.dex[old.m]; }
    cards[idx] = makeCard(poolKey,'SR');
    cards[idx]._pool = poolKey;
    S.pity[poolKey]=0; // 十连保底实际出货 SR+, 该池保底计数清零
    const c=cards[idx];
    S.stats.byR.SR++;
    S.dex[c.m]=(S.dex[c.m]||0)+1;
    maybeBest(c);
}
  }
  S.inv.push(...cards);
  recordHist(cards);
  if(typeof afterPulls==='function') afterPulls(cards); // 皮肤掉落 hook
  save();
  return cards;
}

/* ---------- 工作核心 ---------- */
function taskPayout(model, stars){
  stars = stars||0;
  if(model && model.stars!=null && !stars) stars=model.stars;
  let pay = RARITY[model.r].basePay*payFactor(model);
  const allLimited = (typeof LIMITED_ALL!=='undefined'?LIMITED_ALL:LIMITED_IDS);
  const boosted = allLimited.has(model.id);
  if(boosted) pay *= 2; // 限定卡加成: 永久限定集合，跨季不失效
  if(stars) pay *= (1 + stars*0.05); // 星级 +5%/星
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
    if(c.tokens<TASK_TOKENS || c.locked) continue;
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
// 消耗 n 单（按稀有度优先，锁定卡不消耗），返回明细
// 大单量优化: 一次性排序可用卡 + 指针按序消耗, 避免每单全表扫描与 splice
function consumeTasks(n){
  const items=[];
  const usable = S.inv.filter(c=>c.tokens>=TASK_TOKENS && !c.locked)
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
    items.push({m, card:c, res:taskPayout(m, c.stars||0)});
    if(c.tokens<TASK_TOKENS) pos++; // 余量不足一单: 换下一张, 最后统一过滤
    if(m.vendor==='Anthropic' && Math.random() < ANTH_BAN_CHANCE){
      banClaudeCards();
      items._ccBan = true;
      break;
    }
  }
  if(pos>0) S.inv=S.inv.filter(c=>c.tokens>=TASK_TOKENS); // 耗尽卡与不足一单的残卡统一移除(残卡永远接不了单, 防卡死列表)
  return items;
}
