#!/usr/bin/env node
/* ================================================================
   TokenGacha · sw.js 资产清单同步工具 (tools/sync-sw.mjs, 零依赖)
   从 js/main.js 的 import 图 + index.html 的 css 引用生成 sw.js 的
   ASSETS 列表, 缓存版本号取 package.json version
   发版前运行: npm run sync:sw
   ================================================================ */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = p => fs.readFileSync(path.join(root, p), "utf8");

const pkg = JSON.parse(read("package.json"));
const html = read("index.html");

/* ---------- 递归解析 main.js 的相对 import 模块图 ---------- */
const jsAssets = [];
const seen = new Set();
function walkModule(relFromMain) {
  const file = path.normalize(path.join("js", relFromMain));
  if (seen.has(file)) return;
  seen.add(file);
  jsAssets.push(file);
  const src = read(file.replace(/\\/g, "/"));
  // import ... from './x.js' / export ... from './x.js' / import './x.js'
  const re = /(?:from|import)\s+['"](\.[^'"]+\.js)['"]/g;
  let m;
  const dir = path.dirname(file);
  while ((m = re.exec(src))) {
    const rel = path.normalize(path.join(dir, m[1]));
    walkModule(path.relative("js", rel).replace(/\\/g, "/"));
  }
}
walkModule("main.js"); // 入口自身也是资产
jsAssets.sort();

/* ---------- index.html 引用的样式 ---------- */
const cssAssets = [...html.matchAll(/href="(css\/[^"]+)"/g)].map(m => m[1]);

/* ---------- 固定资产 ---------- */
const staticAssets = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./og.png",
];

/* ---------- 生成新的 sw.js ---------- */
const swPath = path.join(root, "sw.js");
const swSrc = read("sw.js");
const cacheName = `tokengacha-v${pkg.version.split(".").join("")}`;

const assets = [
  ...staticAssets,
  ...cssAssets.map(p => `./${p}`),
  ...jsAssets.map(p => `./${p.replace(/\\/g, "/")}`),
];

const sw = `\"use strict\";
/* TokenGacha · Service Worker (PWA) — 离线缓存静态资源
   ⚠️ 本文件由 tools/sync-sw.mjs 生成资产清单, 发版前运行 npm run sync:sw */
const CACHE = \"${cacheName}\";
const ASSETS = [
${assets.map(a => `  \"${a}\"`).join(",\n")}
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
`;

const before = swSrc.length;
fs.writeFileSync(swPath, sw);
console.log(
  `sync-sw: CACHE=${cacheName}, ${assets.length} 项资产 (${jsAssets.length} 模块, ${cssAssets.length} 样式), ${before} -> ${sw.length} 字节`
);
