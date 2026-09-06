"use strict";
/* TokenGacha · Service Worker (PWA) — 离线缓存静态资源
   ⚠️ 本文件由 tools/sync-sw.mjs 生成资产清单, 发版前运行 npm run sync:sw */
const CACHE = "tokengacha-v411";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./og.png",
  "./css/style.css?v=2",
  "./js/analytics.js",
  "./js/banner.js",
  "./js/config.js",
  "./js/core.js",
  "./js/craft.js",
  "./js/daily.js",
  "./js/economy.js",
  "./js/fx.js",
  "./js/main.js",
  "./js/market.js",
  "./js/skins.js",
  "./js/state.js",
  "./js/track.js",
  "./js/ui/boot.js",
  "./js/ui/gacha.js",
  "./js/ui/modals.js",
  "./js/ui/render.js",
  "./js/ui/router.js",
  "./js/ui/share.js",
  "./js/ui/work.js",
  "./js/validate.js"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  // 仅缓存 GET 且同源
  if (req.method !== "GET" || !req.url.startsWith(self.location.origin)) return;
  // 图标/埋点 beacon 等跨域资源不缓存
  if (req.url.includes("unpkg.com") || req.url.includes("npmmirror.com") || req.url.includes("cloudflareinsights.com")) return;
  e.respondWith(
    caches.match(req).then(cached => {
      const fetchPromise = fetch(req)
        .then(res => {
          // 成功则更新缓存（仅 200 且 basic）
          if (res && res.status === 200 && res.type === "basic") {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(req, clone));
          }
          return res;
        })
        .catch(() => cached);
      // 缓存优先，命中则立即返回，否则等待网络
      return cached || fetchPromise;
    })
  );
});
