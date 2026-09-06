#!/usr/bin/env node
/* ================================================================
   TokenGacha · 单文件离线版构建 (tools/build-standalone.mjs, 零依赖)
   把 js/main.js 的 ES Module import 图按求值顺序拼接为一个经典
   <script>，连同样式内联进 standalone.html —— 双击即可游玩（file://）。

   转换规则（本项目约定，不做通用打包器）：
   - import 语句整行删除
   - 行首 `export ` 前缀删除（const/let/function）
   - `export { ... }` 整行删除
   - 顶层声明重名即报错（拼接后共享作用域，静默覆盖是 bug）
   模块拼接顺序 = main.js import 图的 DFS 后序（与 ESM 求值顺序一致，
   保证 state.js 等模块的顶层初始化代码看到的依赖已完成求值）。
   每次改动 js 后运行: npm run build:standalone
   ================================================================ */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

/* ---------- 收集顶层声明名（重名检测用） ---------- */
function topLevelNames(src) {
  const names = [];
  // 跳过字符串/注释的粗略策略：本项目的顶层声明都是简单行, 逐行匹配即可
  const re = /^(?:const|let|function|class)\s+([A-Za-z_$][\w$]*)/gm;
  let m;
  while ((m = re.exec(src))) names.push(m[1]);
  return names;
}

/* ---------- ESM → 经典脚本 转换 ---------- */
function toClassic(src) {
  return src
    .split("\n")
    .filter((line) => {
      const t = line.trim();
      if (t.startsWith("import ") && /from\s*['"]\./.test(t)) return false; // import ... from './x.js'
      if (/^import\s+['"]/.test(t)) return false; // 裸副作用 import '...' / "..."
      if (t.startsWith("export {")) return false; // export { a, b }
      return true;
    })
    .map((line) => {
      const m = line.match(/^(export\s+)(const|let|function|class)\b/);
      return m ? line.replace(/^export\s+/, "") : line;
    })
    .join("\n");
}

/* ---------- DFS 后序求值顺序遍历 import 图 ---------- */
const order = [];
const seen = new Set();
function walk(relFile) {
  const norm = relFile.replace(/\\/g, "/");
  if (seen.has(norm)) return;
  seen.add(norm);
  const src = read(norm);
  const dir = path.posix.dirname(norm);
  const re = /(?:from|import)\s+['"](\.[^'"]+\.js)['"]/g;
  let m;
  const deps = [];
  while ((m = re.exec(src))) {
    deps.push(path.posix.normalize(path.posix.join(dir, m[1])));
  }
  for (const d of deps) walk(d); // 先求依赖
  order.push({ file: norm, src });
}
walk("js/main.js");

/* ---------- 重名检测 ---------- */
const owner = new Map();
for (const { file, src } of order) {
  for (const name of topLevelNames(src)) {
    if (owner.has(name)) {
      console.error(`✗ 顶层声明重名: ${name} 同时在 ${owner.get(name)} 与 ${file}`);
      process.exit(1);
    }
    owner.set(name, file);
  }
}

/* ---------- 拼接 ---------- */
const banner = (f) => `\n/* ================= ${f} ================= */\n`;
const bundle = order.map(({ file, src }) => banner(file) + toClassic(src).trim()).join("\n");
if (bundle.includes("</script")) {
  console.error("✗ 模块代码含 </script>, 无法安全内联");
  process.exit(1);
}

/* ---------- 生成 standalone.html ---------- */
const html = read("index.html");
let out = html
  // standalone 自身可在 file:// 运行, 剔除 index.html 的 file:// 提示层
  .replace(
    /\s*<script>\s*\/\/ file:\/\/ 直开时 ES Module 受 CORS 限制无法运行[\s\S]*?<\/script>/,
    "",
  )
  // 外链样式内联
  .replace(
    /<link rel="stylesheet" href="css\/[^"]*"\s*\/?>/,
    () => `<style>\n${read("css/style.css")}\n</style>`,
  )
  // module 入口替换为内联 bundle
  .replace(
    /\s*<script type="module" src="js\/main\.js"><\/script>/,
    () => `\n    <script>\n/* 由 tools/build-standalone.mjs 生成 —— 双击即可游玩, 勿手改 */\n"use strict";${bundle}\n    </script>`,
  )
  // file:// 下 SW 不可用, 移除注册脚本
  .replace(
    /\s*<script>\s*\/\/ PWA\s*if \("serviceWorker" in navigator\) \{[\s\S]*?\}\s*\/\/ 埋点[^\n]*\n\s*<\/script>/,
    "\n    <!-- 离线单文件版不注册 Service Worker (file:// 不支持) -->",
  );

if (out.includes('src="js/main.js"')) {
  console.error("✗ standalone.html 生成失败: module 入口未被替换");
  process.exit(1);
}
if (out.includes('href="css/style.css')) {
  console.error("✗ standalone.html 生成失败: 外链样式未被内联");
  process.exit(1);
}

fs.writeFileSync(path.join(root, "standalone.html"), out);
const kb = (Buffer.byteLength(out) / 1024).toFixed(1);
console.log(`build-standalone: ${order.length} 个模块按求值序拼接 -> standalone.html (${kb} KB)`);
