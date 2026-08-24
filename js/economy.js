"use strict";
/* ================================================================
   TokenGacha · 经济层 (economy.js)
   期望计算 / 估值 / 回本率（纯函数，依赖全局 S/RARITY 等）
   从 state.js 拆出，降低状态与计算耦合
   ================================================================ */

/* ---------- 期望计算 ---------- */
/**
 * 稀有度内线性 payFactor 0.8~1.2
 * @param {{r:Rarity, idx:number}} m
 */
function payFactor(m){
  const t=RARITY[m.r], span=Math.max(1,t.max-t.min);
  return .8 + .4*Math.min(1,Math.max(0,(m.idx-t.min)/span));
}
/**
 * 单任务期望收益（含限定×2与星级）
 * @param {{id:string,r:Rarity,idx:number,stars?:number}} m
 * @param {number} [stars]
 */
function expectedTaskPay(m, stars){
  stars = stars||0;
  if(m && m.stars!=null && !stars) stars=m.stars;
  let pay=RARITY[m.r].basePay*payFactor(m);
  const allLim = (typeof LIMITED_ALL!=='undefined'?LIMITED_ALL:LIMITED_IDS);
  if(allLim.has(m.id)) pay*=2;
  if(stars) pay *= (1 + stars*0.05);
  const pG=.02+m.idx/800, pR=Math.min(.25,Math.max(.04,.25-m.idx/250)), pD=Math.min(.02,Math.max(0,(28-m.idx)/1200));
  const pO=Math.max(0,1-pG-pR-pD);
  return PAY_BOOST*(pO*pay + pG*pay*2.5 + pR*pay*.4 - pD*50*PAY_BOOST);
}
const estValue = () => S.inv.reduce((s,c)=> s + (c.tokens/TASK_TOKENS)*expectedTaskPay(MMAP[c.m], c.stars||0), 0);
const usableEstValue = () => S.inv.filter(c=>!c.locked).reduce((s,c)=> s + (c.tokens/TASK_TOKENS)*expectedTaskPay(MMAP[c.m], c.stars||0), 0);

/* ---------- 卡池真实回本率(按概率公式计算) ---------- */
// 单抽期望价值 = 1.5%×0731卡价值 + 98.5%×(各稀有度概率×该档平均卡价值)
function poolExpectedValue(poolKey){
  const p = POOLS[poolKey];
  let ev = 0;
  const d73 = MMAP.dsv4fl73;
  let d73q = p.half ? Math.round((d73.quota||RARITY.SSR.quota)/2) : (d73.quota||RARITY.SSR.quota);
  d73q = Math.floor(d73q / TASK_TOKENS) * TASK_TOKENS;
  const d73Rate = (typeof PROBS!=='undefined'?PROBS.DSV73:0.015);
  ev += d73Rate * (d73q/TASK_TOKENS) * expectedTaskPay(d73);
  for(const r of RORDER){
    const pr = p.rates[r]||0;
    if(!pr) continue;
    const cands = p.banner
      ? MODELS.filter(m=>m.r===r && m.id!=='dsv4fl73' && (!m.bannerOnly || LIMITED_IDS.has(m.id)))
      : MODELS.filter(m=>m.r===r && m.id!=='dsv4fl73' && !m.bannerOnly);
    if(!cands.length) continue;
    const avg = cands.reduce((s,m)=>{
      let q = p.half ? Math.round((m.quota||RARITY[r].quota)/2) : (m.quota||RARITY[r].quota);
      q = Math.floor(q / TASK_TOKENS) * TASK_TOKENS;
      return s + (q/TASK_TOKENS)*expectedTaskPay(m);
    },0)/cands.length;
    const restRate = 1 - (typeof PROBS!=='undefined'?PROBS.DSV73:0.015);
    ev += restRate * pr * avg;
  }
  return ev;
}
function poolRTP(poolKey){
  const p = POOLS[poolKey];
  const cost = p.price;
  return poolExpectedValue(poolKey) / cost;
}
