import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const config = fs.readFileSync(path.resolve("js/config.js"), "utf8");
const html = fs.readFileSync(path.resolve("index.html"), "utf8");
const css = fs.readFileSync(path.resolve("css/style.css"), "utf8");
const ui = [
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
const state = fs.readFileSync(path.resolve("js/state.js"), "utf8");
const daily = fs.readFileSync(path.resolve("js/daily.js"), "utf8");
const craft = fs.readFileSync(path.resolve("js/craft.js"), "utf8");
const market = fs.readFileSync(path.resolve("js/market.js"), "utf8");

describe("P2-1 成就墙", () => {
  it("MILESTONES 10 档且含下一档提示", () => {
    expect((config.match(/id:'m\d+k'/g) || []).length).toBe(10);
    expect(config).toContain("m5k");
    expect(config).toContain("m500k");
    expect(ui).toContain("renderAchievements");
    expect(ui).toContain("achieve-grid");
    expect(html).toContain("achieve-panel");
    expect(css).toContain(".achieve-grid");
  });
  it("state 初始成就为空，checkEnd 遍历 MILESTONES", () => {
    expect(state).toContain("ms:{}");
    expect(ui).toContain("for(const ms of MILESTONES)");
  });
});

describe("P2-2 模拟抽卡器", () => {
  it("购买页有模拟器面板与选择器", () => {
    expect(html).toContain("模拟抽卡");
    expect(html).toContain("sim-pool");
    expect(html).toContain("sim-count");
    expect(html).toContain("btn-sim");
    expect(html).toContain("sim-result");
  });
  it("ui.js 含 simOne/doSim 且处理保底与成本", () => {
    expect(ui).toContain("function simOne");
    expect(ui).toContain("function doSim");
    expect(ui).toContain("poolExpectedValue");
    expect(ui).toContain("十连保底");
  });
});

describe("P2-3 日常与皮肤", () => {
  it("DAILY 增加 craft2/market2", () => {
    expect(config).toContain("craft2");
    expect(config).toContain("market2");
    expect(daily).toContain("crafts");
    expect(daily).toContain("markets");
    expect(daily).toContain("dailyTaskProgress");
  });
  it("state daily 含 crafts/markets 并重置", () => {
    expect(state).toContain("crafts:0");
    expect(state).toContain("markets:0");
    expect(daily).toContain("S.daily.crafts=0");
    expect(daily).toContain("S.daily.markets=0");
  });
  it("craft/market 递增 daily 计数", () => {
    expect(craft).toContain("S.daily.crafts");
    expect(market).toContain("S.daily.markets");
  });
  it("新增薄荷白茶皮肤", () => {
    expect(config).toContain("mint");
    expect(config).toContain("薄荷白茶");
    expect(config).toContain("--bg':'#f0fdf6");
  });
});
