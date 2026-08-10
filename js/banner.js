"use strict";
/* ================================================================
   TokenGacha · 限定活动卡池 (banner.js)
   流光限定池 / DeepSeek V5 限定 / 90 抽大保底 / 活动倒计时
   ================================================================ */

function isBannerActive(){
  const p=POOLS.banner;
  if(!p || !p.endsAt) return false;
  return Date.now() < new Date(p.endsAt).getTime();
}

function bannerCountdownText(){
  const p=POOLS.banner;
  if(!p || !p.endsAt) return '';
  const ms = new Date(p.endsAt).getTime() - Date.now();
  if(ms<=0) return '已结束';
  const d=Math.floor(ms/86400000), h=Math.floor(ms%86400000/3600000), m=Math.floor(ms%3600000/60000);
  return d>0 ? `剩余 ${d}天${h}小时` : `剩余 ${h}小时${m}分`;
}

// 皮肤掉落 hook: 抽卡结束后调用 (core.js doPulls 尾部)
function afterPulls(cards){
  if(typeof rollSkinDrop==='function') rollSkinDrop(cards);
}
