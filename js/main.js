/* ================================================================
   TokenGacha · 主入口 (main.js)
   ES Module 引导：初始化顺序与三个每秒定时器集中在此
   ================================================================ */
import { $, S, pick } from "./state.js";
import "./validate.js"; // 数据层自检（结果供数据页展示）
import { setMuted } from "./fx.js";
import { NOTICES } from "./config.js";
import { syncBanner, bannerSlot, bannerCountdownText } from "./banner.js";
import { ensureMarket, marketTick } from "./market.js";
import { renderAll } from "./ui/render.js";
import { initRouter } from "./ui/router.js";
import { bindUI, boot, bannerCountdownTick } from "./ui/boot.js";
import { applySkin } from "./skins.js";

/* ---------- 启动序列（与原 script 加载顺序等价） ---------- */
setMuted(!!S.flags.muted); // 静音偏好先于任何音效调用
syncBanner();              // 限定池对齐当前赛季后再进渲染
ensureMarket();            // 黑市首刷
initRouter();              // 顶部导航 + hash 直链
bindUI();                  // 全局事件代理

/* ---------- 每秒 tick ---------- */
setInterval(()=>{
  // 赛季切换检测（原 banner.js）
  if(syncBanner()) renderAll();
  // 黑市到期刷新与倒计时（原 market.js）
  marketTick();
  // 限定池倒计时文本（原 boot.js）
  bannerCountdownTick();
}, 1000);
// 公告倒计时刷新（每60s，原 boot.js；仅购买页可见时刷新）
setInterval(()=>{
  const el=$('notice-text');
  if(!el) return;
  const page=$('page-buy');
  if(!(page && page.classList.contains('active'))) return;
  el.textContent = `${bannerSlot().season.name} · ${bannerCountdownText()} ｜ ` + pick(NOTICES);
}, 60000);

/* ---------- 皮肤应用 + 启动 ---------- */
applySkin(S.skin||'classic');
boot();
