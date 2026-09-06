"use strict";
/* TokenGacha · Service Worker (PWA) — 离线缓存静态资源，零构建 */
const CACHE = "tokengacha-v4";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css?v=2",
  "./js/main.js",
  "./js/config.js",
  "./js/validate.js",
  "./js/fx.js",
  "./js/state.js",
  "./js/economy.js",
  "./js/core.js",
  "./js/craft.js",
  "./js/market.js",
  "./js/banner.js",
  "./js/daily.js",
  "./js/skins.js",
  "./js/analytics.js",
  "./js/ui/router.js",
  "./js/ui/render.js",
  "./js/ui/gacha.js",
  "./js/ui/work.js",
  "./js/ui/modals.js",
  "./js/ui/share.js",
  "./js/ui/boot.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./og.png",
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
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
