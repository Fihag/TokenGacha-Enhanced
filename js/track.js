/* ================================================================
   TokenGacha · 埋点 (track.js)
   极简埋点：控制台可见；配置 TG_CF_TOKEN 后转发 Cloudflare Web Analytics
   自定义事件（beacon 动态注入，无 token 时零网络请求）
   ================================================================ */
import { TG_CF_TOKEN } from "./config.js";

let beaconInjected = false;
function injectBeacon(){
  if(beaconInjected || !TG_CF_TOKEN || typeof document==='undefined') return;
  beaconInjected = true;
  const s=document.createElement('script');
  s.defer=true;
  s.src='https://static.cloudflareinsights.com/beacon.min.js';
  s.setAttribute('data-cf-beacon', JSON.stringify({ token: TG_CF_TOKEN, spa: false }));
  document.head.appendChild(s);
}
// beacon 就绪后上报自定义事件；API 不可用时静默跳过
function reportCustom(name){
  try{
    const b=window.beacon;
    if(b && typeof b.report==='function') b.report({ name });
  }catch(e){}
}

export function initTrack(){
  window.tgTrack = function(evt, data){
    try{
      console.debug('[TG]', evt, data||'');
    }catch(e){}
    if(!TG_CF_TOKEN) return; // 未配置 token: 纯控制台埋点, 零网络请求
    injectBeacon();
    // 自定义事件命名带 tg_ 前缀, 避免与 CF 自动 pageview 冲突
    reportCustom('tg_'+evt);
  };
  // 初始 page_view（模块 defer 执行早于 DOMContentLoaded, 直接发）
  window.tgTrack('page_view', { hash: location.hash || '#buy' });
  window.addEventListener('hashchange', () => window.tgTrack('nav', { hash: location.hash }));
}
