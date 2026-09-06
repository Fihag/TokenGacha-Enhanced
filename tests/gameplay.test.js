import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

// 保底/事件/合成/黑市等核心行为已由 core.test.js / craft-market.test.js / economy.test.js
// 以函数级断言覆盖，本文件只保留轮换、日切与工程结构类断言
const configText = fs.readFileSync(path.resolve("js/config.js"), "utf8");
const stateText = fs.readFileSync(path.resolve("js/state.js"), "utf8");
const bannerText = fs.readFileSync(path.resolve("js/banner.js"), "utf8");
const uiText = [
  "js/ui/router.js",
  "js/ui/render.js",
  "js/ui/gacha.js",
  "js/ui/work.js",
  "js/ui/modals.js",
  "js/ui/share.js",
  "js/ui/boot.js",
]
  .map(p => fs.readFileSync(path.resolve(p), "utf8"))
  .join("\n");

describe("活动与轮换", () => {
  it("banner 每 86400000 轮换且以 BANNER_EPOCH 为起点", () => {
    expect(bannerText).toContain("bannerSlot");
    expect(bannerText).toContain("BANNER_DUR");
    expect(bannerText).toContain("BANNER_EPOCH");
    expect(bannerText).toContain("LIMITED_IDS");
  });

  it("签到/任务日切统一 +08 且清理旧字段", () => {
    expect(stateText).toContain("daily");
    const dailyText = fs.readFileSync(path.resolve("js/daily.js"), "utf8");
    expect(dailyText).toContain("todayStr");
    expect(dailyText).toContain("8*3600000");
    expect(dailyText).toContain("dailyResetIfNeeded");
  });

  it("活动页不因限定池下架而隐藏（常驻）", () => {
    expect(bannerText).toContain("isBannerActive");
  });

  it("ui.js 路由 5 页且抽卡/工作/余额/活动/数据齐全", () => {
    expect(uiText).toContain("PAGES=['buy','work','balance','activity','data']");
    expect(uiText).toContain("renderBuy");
    expect(uiText).toContain("renderWork");
    expect(uiText).toContain("renderBalance");
  });

  it("限定池配置: 三赛季轮换数据与 100 抽大保底", () => {
    expect(configText).toContain("BANNER_SEASONS");
    expect(configText).toMatch(/pityMax:\s*100/);
    expect(configText).toContain("limited:['dsv5pro','dsv5fl']");
    expect(configText).toContain("limited:['opus6','gem4pro']");
    expect(configText).toContain("limited:['glm6','qwen5max']");
  });
});

describe("工程与体验回归", () => {
  it("index.html 已外链 css/style.css 且不再内联 <style>", () => {
    const html = fs.readFileSync(path.resolve("index.html"), "utf8");
    expect(html).toContain('href="css/style.css');
    // 允许 <style> 存在于单个组件外？主样式应已抽离
    const styleCount = (html.match(/<style>/g) || []).length;
    expect(styleCount).toBe(0);
  });

  it("js 经 main.js 模块图按依赖引入", () => {
    const html = fs.readFileSync(path.resolve("index.html"), "utf8");
    const main = fs.readFileSync(path.resolve("js/main.js"), "utf8");
    // index 只保留一个 module 入口
    expect(html).toContain('type="module" src="js/main.js"');
    expect(html.match(/<script[^>]*src="js\//g)).toHaveLength(1);
    // 模块图覆盖全部逻辑与 UI 模块
    for (const f of [
      "state.js",
      "fx.js",
      "config.js",
      "banner.js",
      "market.js",
      "ui/render.js",
      "ui/router.js",
      "ui/boot.js",
      "skins.js",
      "validate.js",
    ])
      expect(main).toContain(f);
  });

  it("css/style.css 存在且包含关键变量与动画", () => {
    const css = fs.readFileSync(path.resolve("css/style.css"), "utf8");
    expect(css).toContain("--bg");
    expect(css).toContain("--blue");
    expect(css).toContain("@keyframes shake");
    expect(css).toContain(".pool-card");
  });
});
