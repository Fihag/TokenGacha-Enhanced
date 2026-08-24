import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const html = fs.readFileSync(path.resolve("index.html"), "utf8");
const css = fs.readFileSync(path.resolve("css/style.css"), "utf8");
const sw = fs.readFileSync(path.resolve("sw.js"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.resolve("manifest.json"), "utf8"));

describe("P3-1 PWA", () => {
  it("manifest.json 合法且含 icons", () => {
    expect(manifest.name).toContain("TokenGacha");
    expect(manifest.icons.length).toBe(2);
    expect(manifest.icons[0].sizes).toBe("192x192");
    expect(manifest.theme_color).toBe("#2f6bff");
  });
  it("sw.js 缓存列表含核心资源", () => {
    expect(sw).toContain("CACHE");
    expect(sw).toContain("css/style.css");
    expect(sw).toContain("js/config.js");
    expect(sw).toContain("og.png");
  });
  it("index.html 引入 manifest 与 sw 注册", () => {
    expect(html).toContain('rel="manifest"');
    expect(html).toContain("serviceWorker");
    expect(html).toContain("sw.js");
  });
  it("icons 与 og.png 存在", () => {
    expect(fs.existsSync(path.resolve("icons/icon-192.png"))).toBe(true);
    expect(fs.existsSync(path.resolve("icons/icon-512.png"))).toBe(true);
    expect(fs.existsSync(path.resolve("og.png"))).toBe(true);
  });
});

describe("P3-2 SEO/运营", () => {
  it("robots/sitemap/_headers 存在且正确", () => {
    expect(fs.existsSync(path.resolve("robots.txt"))).toBe(true);
    expect(fs.existsSync(path.resolve("sitemap.xml"))).toBe(true);
    expect(fs.existsSync(path.resolve("_headers"))).toBe(true);
    const robots = fs.readFileSync(path.resolve("robots.txt"), "utf8");
    expect(robots).toContain("Sitemap:");
    const sitemap = fs.readFileSync(path.resolve("sitemap.xml"), "utf8");
    expect(sitemap).toContain("tokengacha.pages.dev");
    const headers = fs.readFileSync(path.resolve("_headers"), "utf8");
    expect(headers).toContain("Cache-Control");
  });
  it("og meta 与 analytics 钩子", () => {
    expect(html).toContain('property="og:image"');
    expect(html).toContain("og.png");
    expect(html).toContain("tgTrack");
    expect(html).toContain("serviceWorker");
  });
});

describe("P3-3 可访问性", () => {
  it("skip-link 与 aria 完整", () => {
    expect(html).toContain("skip-link");
    expect(html).toContain('aria-label="主导航"');
    expect(html).toContain("aria-current");
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('role="dialog"');
    expect(css).toContain(":focus-visible");
  });
  it("toast 含 aria-live", () => {
    const fx = fs.readFileSync(path.resolve("js/fx.js"), "utf8");
    expect(fx).toContain("aria-live");
    expect(fx).toContain("role");
  });
});

describe("拆分与校验", () => {
  it("ui.js 已拆为 7 模块且 index 按序引入", () => {
    for (const f of [
      "js/ui/router.js",
      "js/ui/render.js",
      "js/ui/gacha.js",
      "js/ui/work.js",
      "js/ui/modals.js",
      "js/ui/share.js",
      "js/ui/boot.js",
    ])
      expect(fs.existsSync(path.resolve(f))).toBe(true);
    expect(html).toContain("ui/router.js");
    expect(html).toContain("ui/boot.js");
    expect(sw).toContain("ui/router.js");
    expect(sw).toContain("ui/boot.js");
  });
  it("validate.js 与 economy.js 存在且被 index/sw 引入", () => {
    expect(fs.existsSync(path.resolve("js/validate.js"))).toBe(true);
    expect(fs.existsSync(path.resolve("js/economy.js"))).toBe(true);
    expect(html).toContain("validate.js");
    expect(html).toContain("economy.js");
    expect(sw).toContain("validate.js");
    expect(sw).toContain("economy.js");
  });
  it("config JSDoc 与校验", () => {
    const cfg = fs.readFileSync(path.resolve("js/config.js"), "utf8");
    expect(cfg).toContain("@typedef");
    expect(cfg).toContain("@type {Model[]}");
    const v = fs.readFileSync(path.resolve("js/validate.js"), "utf8");
    expect(v).toContain("validateConfig");
    expect(v).toContain("MODELS");
  });
});
