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
    dex:{}, flags:{welcomed:false,ms:{},muted:false,cheated:false,autoSkip:false},
    daily:{lastSign:null,streak:0,day:null,earnToday:0,pulls:0,tasks:0,crafts:0,markets:0,claimed:{}},
    skin:'classic', skinsOwned:['classic'], skinTickets:0,
    bannerPulls:0, bannerLimited:0, bannerSeason:null, hist:[],
    crafts:{count:0,stars:0,last:null}, market:{orders:[],next:0} };
}
function save(){ try{ const j=JSON.stringify(S); localStorage.setItem('tokengacha_v2', j); try{ localStorage.setItem('tokengacha_v4', j);}catch(e){} }catch(e){} }
function load(){
  try{
    const raw = localStorage.getItem('tokengacha_v4') || localStorage.getItem('tokengacha_v2');
    const s=JSON.parse(raw);
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
      if(s.flags.autoSkip==null) s.flags.autoSkip=false;
      // 迁移: token 单位 ×10 + 清除耗尽卡
      if(!s.ver || s.ver<3){ for(const c of s.inv){ c.tokens*=10; c.max*=10; } }
      s.inv=s.inv.filter(c=>c.tokens>0);
      // 迁移: 规整 token 到 TASK_TOKENS 倍数，避免 270w 残卡 (540w半价) 永远卡库
      if(Array.isArray(s.inv)){
        for(const c of s.inv){
          c.tokens = Math.floor(c.tokens / TASK_TOKENS) * TASK_TOKENS;
          c.max = Math.floor((c.max||c.tokens) / TASK_TOKENS) * TASK_TOKENS;
          if(c.max < TASK_TOKENS) c.max = c.tokens;
        }
        s.inv = s.inv.filter(c=>c.tokens>=TASK_TOKENS);
      }
      // 清理死字段
      if(s.daily && s.daily.signDay!=null) delete s.daily.signDay;
      // v3 → v4: 新增 UTR / banner / daily / skin
      if(!s.stats.byR.UTR) s.stats.byR.UTR=0;
      if(!s.stats.byR.NB) s.stats.byR.NB=0;
      if(!s.pity || typeof s.pity!=='object') s.pity={};
      for(const k of ['newbie','standard','flagship']) if(!s.pity[k]) s.pity[k]=0;
      if(!s.pity.banner) s.pity.banner=0;
      if(s.freeTen==null) s.freeTen=1;
      if(!s.bannerPulls) s.bannerPulls=0;
      if(!s.bannerLimited) s.bannerLimited=0;
      if(s.bannerSeason==null) s.bannerSeason=null;
      if(!s.daily) s.daily={lastSign:null,streak:0,day:null,earnToday:0,claimed:{}};
      if(s.daily.claimed==null) s.daily.claimed={};
      if(s.daily.earnToday==null) s.daily.earnToday=0;
      if(s.daily.pulls==null) s.daily.pulls=0;
      if(s.daily.tasks==null) s.daily.tasks=0;
      if(s.daily.crafts==null) s.daily.crafts=0;
      if(s.daily.markets==null) s.daily.markets=0;
      if(s.daily.signDay!=null) delete s.daily.signDay;
      // 旧任务 id 兼容：work800→work300, earn25000→earn18000
      if(s.daily.claimed.work800!=null && s.daily.claimed.work300==null) s.daily.claimed.work300 = s.daily.claimed.work800;
      if(s.daily.claimed.earn25000!=null && s.daily.claimed.earn18000==null) s.daily.claimed.earn18000 = s.daily.claimed.earn25000;
      if(!s.skin) s.skin='classic';
      if(!Array.isArray(s.skinsOwned)) s.skinsOwned=['classic'];
      if(s.skinTickets==null) s.skinTickets=0;
      if(!Array.isArray(s.hist)) s.hist=[];
      // hist 补 season 字段（旧存档仅 pool:'banner'，补当前赛季）
      if(Array.isArray(s.hist)) for(const h of s.hist){ if(h.pool==='banner' && !h.season) h.season = s.bannerSeason||null; }
      if(!s.crafts || typeof s.crafts!=='object') s.crafts={count:0,stars:0,last:null};
      if(s.crafts.count==null) s.crafts.count=0;
      if(s.crafts.stars==null) s.crafts.stars=0;
      if(!s.market || typeof s.market!=='object') s.market={orders:[],next:0};
      if(!Array.isArray(s.market.orders)) s.market.orders=[];
      if(s.market.next==null) s.market.next=0;
      // 清理远征残留字段
      if(s.expedition) delete s.expedition;
      // 卡片星级/锁定字段兼容
      if(Array.isArray(s.inv)) for(const c of s.inv){ if(c.stars==null) c.stars=0; if(c.locked==null) c.locked=false; }
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
const usableTokens = () => S.inv.filter(c=>!c.locked).reduce((s,c)=>s+c.tokens,0);
const usableTasks = () => Math.floor(usableTokens()/TASK_TOKENS);
const lockedTokens = () => S.inv.filter(c=>c.locked).reduce((s,c)=>s+c.tokens,0);
const pick = arr => arr[Math.floor(Math.random()*arr.length)];
function addLedger(label, amt){
  const t=new Date();
  const ts=`${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`;
  S.ledger.unshift({ts,label,amt});
  if(S.ledger.length>80) S.ledger.length=80;
}
