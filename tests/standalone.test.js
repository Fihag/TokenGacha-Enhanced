import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

// standalone.html 单文件离线版防漂移: 模块更新后须重新 npm run build:standalone
const standalone = fs.readFileSync(path.resolve("standalone.html"), "utf8");
const html = fs.readFileSync(path.resolve("index.html"), "utf8");

const jsFiles = [];
(function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (f.endsWith(".js")) jsFiles.push(full.split(path.sep).join("/"));
  }
})("js");

describe("standalone 单文件离线版", () => {
  it("无残留 import/export, 无 module 入口", () => {
    expect(/^import /m.test(standalone)).toBe(false);
    expect(/^export /m.test(standalone)).toBe(false);
    expect(standalone).not.toContain('type="module"');
    expect(standalone).not.toContain('src="js/main.js"');
  });
  it("包含全部 js 模块与内联样式", () => {
    for (const f of jsFiles) expect(standalone).toContain("===== " + f);
    expect(standalone).toContain("<style>");
    expect(standalone).not.toContain('href="css/style.css');
  });
  it("不注册 Service Worker, 不含 file:// 提示层", () => {
    expect(standalone).not.toContain("serviceWorker");
    expect(standalone).not.toContain("file:// 直开");
  });
  it("index.html 保留 module 入口与 file:// 提示层", () => {
    expect(html).toContain('type="module" src="js/main.js"');
    expect(html).toContain("standalone.html");
  });
});
