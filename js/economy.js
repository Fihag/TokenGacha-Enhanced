/* ================================================================
   TokenGacha · 经济层 (economy.js)
   期望计算 / 估值 / 回本率（纯函数，除估值外不依赖存档）
   从 state.js 拆出，降低状态与计算耦合
   ================================================================ */
import { RARITY, PAY_BOOST, LIMITED_IDS, LIMITED_ALL, POOLS, MODELS, MMAP, PROBS, RORDER, TASK_TOKENS } from "./config.js";
import { S } from "./state.js";

/* ---------- 期望计算 ---------- */
/**
 * 稀有度内线性 payFactor 0.8~1.2
 * @param {{r:Rarity, idx:number}} m
 */
export function payFactor(m){
  const t=RARITY[m.r], span=Math.max(1,t.max-t.min);
  return .8 + .4*Math.min(1,Math.max(0,(m.idx-t.min)/span));
}

/**
 * 工作事件参数单一数据源：
 * 概率与倍率只在此定义，taskPayout(core.js) 据此抽样、
 * expectedTaskPay 据此求期望、单测直接 import 断言。
 * @param {{idx:number}} m
 */
export function payoutParams(m){
  return {
    pGreat: .02 + m.idx/800,
    pRework: Math.min(.25, Math.max(.04, .25 - m.idx/250)),
    // 15 = N 档上限(AA v4.3 分段)，除数按新旧跨度等比缩放，保持"只有垃圾档会删库"
    pDisaster: Math.min(.02, Math.max(0, (15 - m.idx)/500)),
    mult: { great: 2.5, rework: .4 },
    okRange: [.85, 1.15],          // ok 事件随机区间（期望取中点 1.0）
    disasterPenalty: 50 * PAY_BOOST,
    boost: PAY_BOOST,
  };
}

/**
 * 各事件的固定结算额（ok 取区间中点），含限定×2 与星级 +5%/星。
 * 期望 = Σ p_e × amt_e，由 expectedTaskPay 保证与抽样公式同源。
 * @param {{id:string,r:Rarity,idx:number,stars?:number}} m
 * @param {number} [stars]
 */
export function taskPayEvents(m, stars){
  stars = stars||0;
  if(m && m.stars!=null && !stars) stars=m.stars;
  let pay=RARITY[m.r].basePay*payFactor(m);
  if(LIMITED_ALL.has(m.id)) pay*=2;
  if(stars) pay *= (1 + stars*0.05);
  const {mult, okRange, disasterPenalty, boost} = payoutParams(m);
  return {
    ok:      pay * ((okRange[0]+okRange[1])/2) * boost,
    great:   pay * mult.great * boost,
    rework:  pay * mult.rework * boost,
    disaster: -disasterPenalty,
  };
}

/**
 * 单任务期望收益（与 taskPayout 抽样同源）
 * @param {{id:string,r:Rarity,idx:number,stars?:number}} m
 * @param {number} [stars]
 */
export function expectedTaskPay(m, stars){
  stars = stars||0;
  if(m && m.stars!=null && !stars) stars=m.stars;
  const {pGreat, pRework, pDisaster, boost} = payoutParams(m);
  const ev = taskPayEvents(m, stars);
  const pOk = Math.max(0, 1-pGreat-pRework-pDisaster);
  return pOk*ev.ok + pGreat*ev.great + pRework*ev.rework + pDisaster*ev.disaster;
}
export const estValue = () => S.inv.reduce((s,c)=> s + (c.tokens/TASK_TOKENS)*expectedTaskPay(MMAP[c.m], c.stars||0), 0);
export const usableEstValue = () => S.inv.filter(c=>!c.locked).reduce((s,c)=> s + (c.tokens/TASK_TOKENS)*expectedTaskPay(MMAP[c.m], c.stars||0), 0);

/* ---------- 卡池真实回本率(按概率公式计算) ---------- */
// 单抽期望价值 = 1.5%×0731卡价值 + 98.5%×(各稀有度概率×该档平均卡价值)
export function poolExpectedValue(poolKey){
  const p = POOLS[poolKey];
  let ev = 0;
  const d73 = MMAP.dsv4fl73;
  let d73q = p.half ? Math.round((d73.quota||RARITY.SSR.quota)/2) : (d73.quota||RARITY.SSR.quota);
  d73q = Math.floor(d73q / TASK_TOKENS) * TASK_TOKENS;
  const d73Rate = PROBS.DSV73;
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
    const restRate = 1 - PROBS.DSV73;
    ev += restRate * pr * avg;
  }
  return ev;
}
export function poolRTP(poolKey){
  const p = POOLS[poolKey];
  const cost = p.price;
  return poolExpectedValue(poolKey) / cost;
}
