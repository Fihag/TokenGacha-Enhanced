"use strict";
/* ================================================================
   TokenGacha · 状态层 (state.js)
   存档 (ver 4) / 工具函数 / 期望计算
   ================================================================ */

/* ---------- 状态 ---------- */
let S = null;
function defaultState(){
  return { ver:4, money:START_MONEY, inv:[], uid:1, freeTen:1,
    pity:{newbie:0,standard:0,flagship:0,banner:0}, ledger:[],
    stats:{pulls:0,earn:0,spent:0,tasks:0,best:'',disasters:0,greats:0,byR:{N:0,R:0,SR:0,SSR:0,UR:0,UTR:0,NB:0}},
    dex:{}, flags:{welcomed:false,ms:{},muted:false,cheated:false},
    daily:{lastSign:null,streak:0,day:null,earnToday:0,pulls:0,tasks:0,claimed:{},signDay:null},
    skin:'classic', skinsOwned:['classic'], skinTickets:0,
    bannerPulls:0, bannerLimited:0, bannerSeason:null, hist:[] };
}
function save(){ try{ localStorage.setItem('tokengacha_v2', JSON.stringify(S)); }catch(e){} }
function load(){
  try{
    const s=JSON.parse(localStorage.getItem('tokengacha_v2'));
    if(s&&typeof s.money==='number'){
      if(!Array.isArray(s.ledger)) s.ledger=[];
      if(!s.stats.byR) s.stats.byR={N:0,R:0,SR:0,SSR:0,UR:0};
      if(s.stats.greats==null) s.stats.greats=0;
      delete s.sel;
      // 迁移: GPT-4o → GPT-4
      if(Array.isArray(s.inv)) for(const c of s.inv) if(c.m==='gpt4o') c.m='gpt4';
      if(s.dex && s.dex.gpt4o!=null){ s.dex.gpt4=(s.dex.gpt4||0)+s.dex.gpt4o; delete s.dex.gpt4o; }
      if(s.stats && s.stats.best==='gpt4o') s.stats.best='gpt4';
      if(!s.flags.ms){ s.flags.ms={}; if(s.flags.rich) s.flags.ms.m50k=true; }
      delete s.flags.rich;
      if(s.flags.cheated==null) s.flags.cheated=false;
      // 迁移: token 单位 ×10 + 清除耗尽卡
      if(!s.ver || s.ver<3){ for(const c of s.inv){ c.tokens*=10; c.max*=10; } }
      s.inv=s.inv.filter(c=>c.tokens>0);
      // v3 → v4: 新增 UTR / banner / daily / skin
      if(!s.stats.byR.UTR) s.stats.byR.UTR=0;
      if(!s.stats.byR.NB) s.stats.byR.NB=0;
      if(!s.pity.banner) s.pity.banner=0;
      if(!s.bannerPulls) s.bannerPulls=0;
      if(!s.bannerLimited) s.bannerLimited=0;
      if(s.bannerSeason==null) s.bannerSeason=null;
      if(!s.daily) s.daily={lastSign:null,streak:0,day:null,earnToday:0,claimed:{},signDay:null};
      if(s.daily.claimed==null) s.daily.claimed={};
      if(s.daily.earnToday==null) s.daily.earnToday=0;
      if(s.daily.pulls==null) s.daily.pulls=0;
      if(s.daily.tasks==null) s.daily.tasks=0;
      if(!s.skin) s.skin='classic';
      if(!Array.isArray(s.skinsOwned)) s.skinsOwned=['classic'];
      if(s.skinTickets==null) s.skinTickets=0;
      if(!Array.isArray(s.hist)) s.hist=[];
      s.ver=4;
      return s;
    }
  }catch(e){}
  return null;
}
S = load() || defaultState();
muted = !!S.flags.muted;

const $ = id => document.getElementById(id);
const fmt = n => '¥' + Math.round(n).toLocaleString('zh-CN');
const fmt2 = n => '¥' + n.toLocaleString('zh-CN',{maximumFractionDigits:1});
const fmtK = n => n>=10000 ? (n/10000).toLocaleString('zh-CN',{maximumFractionDigits:1})+'万' : n>=1000 ? (n/1000).toLocaleString('zh-CN',{maximumFractionDigits:1})+'K' : Math.round(n);
const fmtTok = n => n>=100000000 ? (n/100000000).toLocaleString('zh-CN',{maximumFractionDigits:2})+'亿' : fmtK(n); // 1 亿级 token 显示为「1亿」
const totalTokens = () => S.inv.reduce((s,c)=>s+c.tokens,0);
const totalTasks = () => Math.floor(totalTokens()/TASK_TOKENS);
const pick = arr => arr[Math.floor(Math.random()*arr.length)];
function addLedger(label, amt){
  const t=new Date();
  const ts=`${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`;
  S.ledger.unshift({ts,label,amt});
  if(S.ledger.length>80) S.ledger.length=80;
}

/* ---------- 期望计算 ---------- */
function payFactor(m){
  const t=RARITY[m.r], span=Math.max(1,t.max-t.min);
  return .8 + .4*Math.min(1,Math.max(0,(m.idx-t.min)/span));
}
function expectedTaskPay(m){
  let pay=RARITY[m.r].basePay*payFactor(m);
  if(LIMITED_IDS.has(m.id)) pay*=2; // 与 taskPayout 结算保持一致: 限定卡接单收入翻倍
  const pG=.02+m.idx/800, pR=Math.min(.25,Math.max(.04,.25-m.idx/250)), pD=Math.min(.02,Math.max(0,(28-m.idx)/1200));
  const pO=Math.max(0,1-pG-pR-pD);
  return PAY_BOOST*(pO*pay + pG*pay*2.5 + pR*pay*.4 - pD*50*PAY_BOOST);
}
const estValue = () => S.inv.reduce((s,c)=> s + (c.tokens/TASK_TOKENS)*expectedTaskPay(MMAP[c.m]), 0);

/* ---------- 卡池真实回本率(按概率公式计算) ---------- */
// 单抽期望价值 = 1.5%×0731卡价值 + 98.5%×(各稀有度概率×该档平均卡价值)
function poolExpectedValue(poolKey){
  const p = POOLS[poolKey];
  let ev = 0;
  // 0731 独立 1.5%: 固定出 dsv4fl73(540万 token, 青铜池减半)
  const d73 = MMAP.dsv4fl73;
  const d73q = p.half ? Math.round((d73.quota||RARITY.SSR.quota)/2) : (d73.quota||RARITY.SSR.quota);
  ev += 0.015 * (d73q/TASK_TOKENS) * expectedTaskPay(d73);
  // 其余 98.5% 走稀有度概率
  for(const r of RORDER){
    const pr = p.rates[r]||0;
    if(!pr) continue;
    const cands = p.banner
      ? MODELS.filter(m=>m.r===r && m.id!=='dsv4fl73' && (!m.bannerOnly || LIMITED_IDS.has(m.id)))
      : MODELS.filter(m=>m.r===r && m.id!=='dsv4fl73' && !m.bannerOnly);
    if(!cands.length) continue;
    const avg = cands.reduce((s,m)=>{
      const q = p.half ? Math.round((m.quota||RARITY[r].quota)/2) : (m.quota||RARITY[r].quota);
      return s + (q/TASK_TOKENS)*expectedTaskPay(m);
    },0)/cands.length;
    ev += 0.95 * pr * avg;
  }
  return ev;
}
function poolRTP(poolKey){
  const p = POOLS[poolKey];
  const cost = p.price;
  return poolExpectedValue(poolKey) / cost;
}
