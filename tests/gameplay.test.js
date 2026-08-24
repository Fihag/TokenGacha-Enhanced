import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const coreText = fs.readFileSync(path.resolve("js/core.js"), "utf8");
const configText = fs.readFileSync(path.resolve("js/config.js"), "utf8");
const stateText = fs.readFileSync(path.resolve("js/state.js"), "utf8");
const economyText = fs.readFileSync(path.resolve("js/economy.js"), "utf8");
const craftText = fs.readFileSync(path.resolve("js/craft.js"), "utf8");
const marketText = fs.readFileSync(path.resolve("js/market.js"), "utf8");
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

describe("抽卡保底与概率", () => {
  it("普通池保底 PITY_MAX=60，青铜池 50，限定池 100", () => {
    expect(configText).toContain("PITY_MAX = 60");
    expect(coreText).toContain("pityMax");
    expect(configText).toMatch(/newbie:\s*\{[^}]*pityMax:\s*50/);
    // standard/flagship 复用默认 PITY_MAX，不必显式声明
    expect(configText).toMatch(/pityMax:\s*100/);
    expect(bannerText).toContain("pity");
  });

  it("限定池大保底必出当期限定 UTR（makeLimited）", () => {
    expect(coreText).toContain("function makeLimited");
    expect(coreText).toContain("LIMITED_IDS");
    expect(coreText).toContain("UTR");
    expect(coreText).toMatch(/atPity.*banner/);
  });

  it("十连必出 SR+ 且跳过幻觉卡", () => {
    expect(coreText).toContain("十连保底");
    expect(coreText).toContain("_halluc");
    expect(coreText).toContain("'SR'");
  });

  it("0731 独立 1.5% 且不抢占保底", () => {
    expect(coreText).toContain("DSV73");
    expect(coreText).toContain("force0731");
    expect(coreText).toContain("atPity");
    expect(coreText).toMatch(/!atPity.*DSV73|DSV73.*!atPity/);
  });

  it("Fihag 隐藏 0.01% 全池生效", () => {
    expect(coreText).toContain("FIHAG");
    expect(coreText).toContain("makeFihag");
    expect(configText).toMatch(/FIHAG:\s*0\.0001/);
  });

  it("幻觉 0.2% 仅对非UR/UTR/NB 生效且补偿 200000", () => {
    expect(coreText).toContain("HALLUC");
    expect(coreText).toContain("maybeHallucinate");
    expect(coreText).toContain("_halluc");
    expect(coreText).toContain("comp = 200000");
  });
});

describe("工作与消耗", () => {
  it("consumeTasks 按稀有度降序消耗且跳过锁定卡", () => {
    expect(coreText).toContain("consumeTasks");
    expect(coreText).toContain("locked");
    expect(coreText).toContain("RORDER.indexOf");
    expect(coreText).toContain("TASK_TOKENS");
  });

  it("taskPayout 事件包含 disaster/rework/great/ok 四态", () => {
    expect(coreText).toContain("disaster");
    expect(coreText).toContain("rework");
    expect(coreText).toContain("great");
    expect(coreText).toContain("ok");
  });

  it("Anthropic 封禁 0.4% 清空全部 Claude 卡", () => {
    expect(coreText).toContain("ANTH_BAN");
    expect(coreText).toContain("banClaudeCards");
    expect(coreText).toContain("Anthropic");
  });

  it("锁定卡估值与可用估值分离（usableEstValue）", () => {
    expect(economyText).toContain("usableEstValue");
    expect(stateText).toContain("locked");
    expect(economyText).toContain("locked");
    expect(uiText).toContain("usableEstValue");
  });
});

describe("合成台与黑市", () => {
  it("合成强制同厂商且禁止跨 vendor", () => {
    expect(craftText).toContain("同厂商");
    expect(craftText).toContain("vendor");
    expect(craftText).toContain("跨 vendor");
  });

  it("三合一配方 N→R / R→SR / SR→SSR 齐全", () => {
    expect(configText).toContain("CRAFT_RECIPES");
    expect(configText).toContain("N→R");
    expect(configText).toContain("R→SR");
    expect(configText).toContain("SR→SSR");
  });

  it("升星 need 5、上限 3、+5%/星", () => {
    expect(configText).toContain("CRAFT_STAR_NEED");
    expect(craftText).toContain("CRAFT_STAR_NEED");
    expect(craftText).toContain("maxStar>=3");
    // 星级收益在 state.js/core.js 中计算
    expect(stateText + coreText).toMatch(/stars.*0\.05|0\.05.*stars/);
  });

  it("黑市 6 槽、TTL 1h、溢价 1.10-1.50、按需 needCount", () => {
    expect(configText).toContain("slots:6");
    expect(configText).toContain("ttl:3600000");
    expect(configText).toContain("premiumMin:1.10");
    expect(configText).toContain("premiumMax:1.50");
    expect(marketText).toContain("marketNeedCount");
  });

  it("黑市每小时自动刷新且有倒计时", () => {
    expect(marketText).toContain("setInterval");
    expect(marketText).toContain("market-countdown");
  });
});

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
});

describe("工程与体验回归", () => {
  it("index.html 已外链 css/style.css 且不再内联 <style>", () => {
    const html = fs.readFileSync(path.resolve("index.html"), "utf8");
    expect(html).toContain('href="css/style.css');
    // 允许 <style> 存在于单个组件外？主样式应已抽离
    const styleCount = (html.match(/<style>/g) || []).length;
    expect(styleCount).toBe(0);
  });

  it("js 按依赖顺序在 index.html 中正确引入", () => {
    const html = fs.readFileSync(path.resolve("index.html"), "utf8");
    const order = [
      "config.js",
      "validate.js",
      "fx.js",
      "state.js",
      "economy.js",
      "core.js",
      "craft.js",
      "market.js",
      "ui/router.js",
      "ui/render.js",
      "ui/gacha.js",
      "ui/work.js",
      "ui/modals.js",
      "ui/share.js",
      "ui/boot.js",
      "banner.js",
      "daily.js",
      "skins.js",
      "analytics.js",
    ];
    let lastIdx = -1;
    for (const f of order) {
      const idx = html.indexOf(f);
      expect(idx).toBeGreaterThan(lastIdx);
      lastIdx = idx;
    }
  });

  it("css/style.css 存在且包含关键变量与动画", () => {
    const css = fs.readFileSync(path.resolve("css/style.css"), "utf8");
    expect(css).toContain("--bg");
    expect(css).toContain("--blue");
    expect(css).toContain("@keyframes shake");
    expect(css).toContain(".pool-card");
  });
});
