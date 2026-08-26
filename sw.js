"use strict";
/* TokenGacha · Service Worker (PWA) — 离线缓存静态资源，零构建 */
const CACHE = "tokengacha-v3";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css?v=2",
  "./js/config.js?v=2",
  "./js/validate.js?v=2",
  "./js/fx.js?v=2",
  "./js/state.js?v=2",
  "./js/economy.js?v=2",
  "./js/core.js?v=2",
  "./js/craft.js?v=2",
  "./js/market.js?v=2",
  "./js/ui/router.js?v=2",
  "./js/ui/render.js?v=2",
  "./js/ui/gacha.js?v=2",
  "./js/ui/work.js?v=2",
  "./js/ui/modals.js?v=2",
  "./js/ui/share.js?v=2",
  "./js/ui/boot.js?v=2",
  "./js/banner.js?v=2",
  "./js/daily.js?v=2",
  "./js/skins.js?v=2",
  "./js/analytics.js?v=2",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./og.png"
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
  // 图标 CDN 不缓存（跨域）
  if (req.url.includes("unpkg.com") || req.url.includes("npmmirror.com")) return;
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
