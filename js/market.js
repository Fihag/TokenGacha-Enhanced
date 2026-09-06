/* ================================================================
   TokenGacha · 黑市做市 (market.js)
   求购（黑市收卡，溢价 1.10-1.50×）+ 挂单（庄家出货，随行就市）
   每小时统一刷新；逻辑函数返回结果，音效/渲染由调用层处理；定时器在 main.js
   ================================================================ */
import { MODELS, MMAP, RARITY, MARKET_CFG, TASK_TOKENS, LIMITED_ALL } from "./config.js";
import { S, save, $, fmt, fmtK, addLedger, pick } from "./state.js";
import { expectedTaskPay } from "./economy.js";
import { SFX, burst, toast } from "./fx.js";
import { renderAll } from "./ui/render.js";

/* ---------- 求购（黑市收卡） ---------- */
export function marketPremium(){ return (Math.random()*(MARKET_CFG.premiumMax-MARKET_CFG.premiumMin)+MARKET_CFG.premiumMin); }
export function marketNeedCount(r){
  if(r==='N'||r==='R') return 3;
  if(r==='SR') return 3;
  if(r==='SSR') return 2;
  return 1;
}
export function marketVendorsForRarity(r){
  const set=new Set(MODELS.filter(m=>m.r===r).map(m=>m.vendor));
  return [...set];
}
export function genMarketOrder(idx){
  // 权重：N/R 多，UTR 极少
  const roll=Math.random();
  let r='R';
  if(roll<0.25) r='N';
  else if(roll<0.55) r='R';
  else if(roll<0.75) r='SR';
  else if(roll<0.90) r='SSR';
  else if(roll<0.97) r='UR';
  else r='UTR';
  const vendors=marketVendorsForRarity(r);
  const vendor=vendors.length? vendors[Math.floor(Math.random()*vendors.length)] : null;
  if(!vendor) return genMarketOrder(idx);
  const need=marketNeedCount(r);
  const premium=Math.round(marketPremium()*100)/100;
  return {id:'m'+Date.now()+'_'+idx+'_'+Math.floor(Math.random()*1e6), r, vendor, need, premium, ts:Date.now()};
}

/* ---------- 挂单（庄家出货, 买入侧） ---------- */
export function listingPrice(m){
  const quota = Math.floor((m.quota||RARITY[m.r].quota) / TASK_TOKENS) * TASK_TOKENS;
  const est = (quota/TASK_TOKENS) * expectedTaskPay(m);
  const factor = MARKET_CFG.buyMin + Math.random()*(MARKET_CFG.buyMax-MARKET_CFG.buyMin);
  return Math.max(20, Math.round(est * factor / 10) * 10); // 10 元取整, 最低 20 元
}
export function genMarketListing(idx){
  // 权重：R/SR 为主, UR 偶有, UTR 稀少; N 太垃圾不挂, NB 永不
  const roll=Math.random();
  let r='SR';
  if(roll<0.25) r='R';
  else if(roll<0.60) r='SR';
  else if(roll<0.85) r='SSR';
  else if(roll<0.97) r='UR';
  else r='UTR';
  const cands = MODELS.filter(m=>m.r===r && !m.bannerOnly);
  if(!cands.length) return genMarketListing(idx);
  const m = pick(cands);
  return {id:'L'+Date.now()+'_'+idx+'_'+Math.floor(Math.random()*1e6), mid:m.id, price:listingPrice(m), ts:Date.now()};
}

export function ensureMarket(){
  const now=Date.now();
  if(!S.market) S.market={orders:[],listings:[],next:0};
  if(!Array.isArray(S.market.orders)) S.market.orders=[];
  if(!Array.isArray(S.market.listings)) S.market.listings=[];
  if(S.market.next==null) S.market.next=0;
  if((S.market.orders.length||S.market.listings.length) && now < S.market.next){
    // 未过期; 但升级老档可能缺挂单（历史版本无买入侧）, 单独补齐
    if(!S.market.listings.length){
      for(let i=0;i<MARKET_CFG.listSlots;i++) S.market.listings.push(genMarketListing(i));
      save();
    }
    return;
  }
  const orders=[], listings=[];
  for(let i=0;i<MARKET_CFG.slots;i++) orders.push(genMarketOrder(i));
  for(let i=0;i<MARKET_CFG.listSlots;i++) listings.push(genMarketListing(i));
  S.market.orders=orders;
  S.market.listings=listings;
  S.market.next=now+MARKET_CFG.ttl;
  save();
}
export function refreshMarket(force){
  const now=Date.now();
  if(!force && now < (S.market.next||0)) return false;
  if(!force){
    ensureMarket(); // will regen if expired
    renderMarket();
    renderAll();
    return true;
  }
  const orders=[], listings=[];
  for(let i=0;i<MARKET_CFG.slots;i++) orders.push(genMarketOrder(i));
  for(let i=0;i<MARKET_CFG.listSlots;i++) listings.push(genMarketListing(i));
  S.market.orders=orders;
  S.market.listings=listings;
  S.market.next=now+MARKET_CFG.ttl;
  save();
  renderMarket();
  renderAll();
  return true;
}

/* ---------- 求购成交（卖卡给黑市） ---------- */
export function marketMatchingCards(order){
  return S.inv.filter(c=> !c.locked && MMAP[c.m].r===order.r && MMAP[c.m].vendor===order.vendor);
}
export function marketCanFulfill(order){
  return marketMatchingCards(order).length >= order.need;
}
export function marketEstForCards(cards){
  return cards.reduce((s,c)=> s + (c.tokens/TASK_TOKENS)*expectedTaskPay(MMAP[c.m], c.stars||0), 0);
}
export function doMarketSell(orderId){
  ensureMarket();
  const order=S.market.orders.find(o=>o.id===orderId);
  if(!order) return {ok:false, msg:'订单已过期'};
  const pool=marketMatchingCards(order).sort((a,b)=>{
    // 优先卖低星、低 token、低 idx 的
    const sa=a.stars||0, sb=b.stars||0;
    if(sa!==sb) return sa-sb;
    if(a.tokens!==b.tokens) return a.tokens-b.tokens;
    return MMAP[a.m].idx - MMAP[b.m].idx;
  });
  if(pool.length < order.need) return {ok:false, msg:'卡不够，无法成交'};
  const toSell=pool.slice(0, order.need);
  const est=marketEstForCards(toSell);
  const payout=Math.round(est * order.premium);
  // 移除
  for(const c of toSell){
    const idx=S.inv.findIndex(x=>x.uid===c.uid);
    if(idx>=0) S.inv.splice(idx,1);
  }
  // 移除订单
  S.market.orders=S.market.orders.filter(o=>o.id!==orderId);
  S.money+=payout;
  S.stats.earn+=payout;
  S.stats.markets=(S.stats.markets||0)+1;
  S.daily.earnToday=(S.daily.earnToday||0)+payout;
  S.daily.markets=(S.daily.markets||0)+1;
  addLedger(`🏦 黑市成交 · ${order.vendor} ${order.r}×${order.need} 溢价×${order.premium}`, payout);
  save();
  return {ok:true, payout, order, cards:toSell};
}

/* ---------- 挂单成交（向庄家买卡） ---------- */
export function doMarketBuy(listingId){
  ensureMarket();
  const li=(S.market.listings||[]).find(l=>l.id===listingId);
  if(!li) return {ok:false, msg:'挂单已过期'};
  const m=MMAP[li.mid];
  if(S.money < li.price) return {ok:false, msg:'余额不足，买不起'};
  S.money-=li.price;
  S.stats.spent+=li.price;
  S.stats.buys=(S.stats.buys||0)+1;
  const quota=Math.floor((m.quota||RARITY[m.r].quota)/TASK_TOKENS)*TASK_TOKENS;
  const nc={uid:S.uid++, m:m.id, tokens:quota, max:quota, half:false, stars:0, locked:false};
  S.inv.push(nc);
  S.market.listings=S.market.listings.filter(l=>l.id!==listingId);
  S.daily.markets=(S.daily.markets||0)+1;
  addLedger(`🛒 黑市购入 · ${m.name}`, -li.price);
  save();
  return {ok:true, listing:li, card:nc, model:m};
}

/* ---------- 渲染 ---------- */
export function renderMarket(){
  const box=$('market-list');
  const listBox=$('market-listings');
  const cd=$('market-countdown');
  if(!box && !listBox) return;
  ensureMarket();
  if(cd){
    const ms=(S.market.next||0)-Date.now();
    if(ms<=0) cd.textContent='刷新中…';
    else{ const m=Math.floor(ms/60000), s=Math.floor(ms%60000/1000); cd.textContent=`刷新 ${m}分${s}秒后`; }
  }
  // 求购区
  if(box){
    if(!S.market.orders.length){ box.innerHTML='<div style="color:var(--faint);font-size:12.5px;padding:8px 2px">暂无订单</div>'; }
    else{
      box.innerHTML='';
      for(const o of S.market.orders){
        const have=marketMatchingCards(o).length;
        const can=have>=o.need;
        const limitedHint = MODELS.some(m=> m.vendor===o.vendor && m.r===o.r && LIMITED_ALL.has(m.id)) ? ' · 已含限定×2' : '';
        const est = have? Math.round(marketEstForCards(marketMatchingCards(o).slice(0,o.need))*o.premium) : 0;
        const row=document.createElement('div');
        row.className='market-order';
        row.style.opacity=can?'1':'.55';
        row.innerHTML=`<div class="mo-main"><div class="mo-title">🏦 求购 ${o.vendor} · ${o.r} ×${o.need}</div><div class="mo-desc">溢价 ×${o.premium.toFixed(2)}${limitedHint} · 持有 ${have}/${o.need} · 预估 ${have?fmt(est):'—'}</div></div><button class="mini-btn" data-market="${o.id}" ${can?'':'disabled'}>${can?'卖出':'不足'}</button>`;
        row.title = limitedHint ? '该求购涉及限定模型，预估已含限定×2加成，溢价为额外倍率' : '溢价在卡面估值（含星级/限定加成）基础上额外×';
        box.appendChild(row);
      }
      box.querySelectorAll('[data-market]').forEach(b=> b.onclick=()=>{
        SFX.click();
        const res=doMarketSell(b.dataset.market);
        if(!res.ok){ toast(res.msg); SFX.bad(); return; }
        renderAll();
        renderMarket();
        SFX.coin();
        burst(innerWidth/2, innerHeight/3, ['#16a34a','#f59e0b','#fff'], 80, 7);
        toast(`🏦 成交 +${fmt(res.payout)} (溢价×${res.order.premium})`, 2600);
        if(window.tgTrack) window.tgTrack('market_sell', {premium:res.order.premium, payout:res.payout});
      });
    }
  }
  // 挂单区
  if(listBox){
    if(!(S.market.listings||[]).length){ listBox.innerHTML='<div style="color:var(--faint);font-size:12.5px;padding:8px 2px">暂无挂单</div>'; }
    else{
      listBox.innerHTML='';
      for(const li of S.market.listings){
        const m=MMAP[li.mid];
        const r=RARITY[m.r];
        const afford=S.money>=li.price;
        const row=document.createElement('div');
        row.className='market-order';
        row.style.opacity=afford?'1':'.55';
        row.innerHTML=`<div class="mo-main"><div class="mo-title">🛒 出售 <b style="color:${r.hex}">${m.name}</b></div><div class="mo-desc">${m.r} · ${m.vendor} · 指数 ${Math.round(m.idx)} · 满额 ${fmtK(quotaOf(m))} tok</div></div><button class="mini-btn" data-listing="${li.id}" ${afford?'':'disabled'}>${fmt(li.price)}</button>`;
        row.title=`庄家挂牌价已含随机浮动（估值×${MARKET_CFG.buyMin}~${MARKET_CFG.buyMax}）· ${m.quote}`;
        listBox.appendChild(row);
      }
      listBox.querySelectorAll('[data-listing]').forEach(b=> b.onclick=()=>{
        SFX.click();
        const res=doMarketBuy(b.dataset.listing);
        if(!res.ok){ toast(res.msg); SFX.bad(); return; }
        renderAll();
        renderMarket();
        SFX.coin();
        burst(innerWidth/2, innerHeight/3, ['#3b82f6','#f59e0b','#fff'], 70, 6);
        toast(`🛒 已购入 ${res.model.name}（- ${fmt(res.listing.price)}）`, 2600);
        if(window.tgTrack) window.tgTrack('market_buy', {mid:res.model.id, price:res.listing.price});
      });
    }
  }
  const btn=$('btn-market-refresh');
  if(btn && !btn.dataset.bound){
    btn.dataset.bound='1';
    btn.onclick=()=>{
      if(Date.now() < (S.market.next||0)){ toast('还没到刷新时间'); SFX.bad(); return; }
      refreshMarket(true);
      toast('🏦 黑市已刷新');
      SFX.click();
    };
  }
}
function quotaOf(m){ return Math.floor((m.quota||RARITY[m.r].quota)/TASK_TOKENS)*TASK_TOKENS; }
// 每秒检查刷新与倒计时（由 main.js 的 tick 调用）
export function marketTick(){
  const now=Date.now();
  if(S && S.market && now >= (S.market.next||0)){
    ensureMarket();
    const page=document.getElementById('page-balance');
    if(page && page.classList.contains('active')) renderMarket();
  }
  const cd=$('market-countdown');
  if(cd && S.market && S.market.next){
    const ms=S.market.next-Date.now();
    if(ms>0){ const m=Math.floor(ms/60000), s=Math.floor(ms%60000/1000); cd.textContent=`刷新 ${m}分${s}秒后`; }
  }
}
