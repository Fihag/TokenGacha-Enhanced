"use strict";
/* ================================================================
   TokenGacha · 限定池轮换 (banner.js)
   每赛季 21 天自动轮换 · 90 抽大保底出当期限定 · 赛季倒计时
   ================================================================ */

// 当前赛季槽位: 从 BANNER_EPOCH 起每 BANNER_DUR 轮换一个赛季
function bannerSlot(now){
  now = now ?? Date.now();
  const i = Math.max(0, Math.floor((now - BANNER_EPOCH) / BANNER_DUR));
  const idx = i % BANNER_SEASONS.length;
  return { season: BANNER_SEASONS[idx], start: BANNER_EPOCH + i*BANNER_DUR, end: BANNER_EPOCH + (i+1)*BANNER_DUR, i };
}

// 同步 POOLS.banner 到当前赛季; 赛季切换时重置该池保底/抽数/限定计数
function syncBanner(){
  const slot = bannerSlot();
  const p = POOLS.banner;
  let switched = false;
  if(p._seasonId !== slot.season.id || p._end !== slot.end){
    Object.assign(p, slot.season);
    p._seasonId = slot.season.id;
    p._end = slot.end;
    switched = true;
  }
  // 当前赛季限定卡集合
  const cur = [...LIMITED_IDS].slice().sort().join(',');
  const want = slot.season.limited.slice().sort().join(',');
  if(cur !== want){
    LIMITED_IDS.clear();
    slot.season.limited.forEach(id => LIMITED_IDS.add(id));
    switched = true;
  }
  if(switched && S.bannerSeason !== slot.season.id){
    S.pity = S.pity || {}; S.pity.banner = 0;
    S.bannerPulls = 0; S.bannerLimited = 0; S.bannerSeason = slot.season.id;
    save();
  }
  return switched;
}

// 轮换池常年在线, 不再下架
function isBannerActive(){ return !!(POOLS.banner && POOLS.banner.banner); }

function bannerCountdownText(){
  const p = POOLS.banner;
  if(!p || !p._end) return '';
  const ms = p._end - Date.now();
  if(ms <= 0) return '轮换中…';
  const d = Math.floor(ms/86400000), h = Math.floor(ms%86400000/3600000), m = Math.floor(ms%3600000/60000);
  return d > 0 ? `${p.name} 剩余 ${d}天${h}小时` : `${p.name} 剩余 ${h}小时${m}分`;
}

// 皮肤掉落 hook: 抽卡结束后调用 (core.js doPulls 尾部)
function afterPulls(cards){
  if(typeof rollSkinDrop==='function') rollSkinDrop(cards);
}

// 启动对齐 + 每秒监听轮换
syncBanner();
setInterval(()=>{ if(syncBanner() && typeof renderAll==='function') renderAll(); }, 1000);
