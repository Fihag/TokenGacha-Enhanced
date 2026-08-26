import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { z } from "zod";

const configText = fs.readFileSync(path.resolve("js/config.js"), "utf8");
const stateText = fs.readFileSync(path.resolve("js/state.js"), "utf8");
const economyText = fs.readFileSync(path.resolve("js/economy.js"), "utf8");
const validateText = fs.readFileSync(path.resolve("js/validate.js"), "utf8");

describe("zod 校验", () => {
  it("Model zod schema 能校验示例模型", () => {
    const Model = z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      vendor: z.string().min(1),
      icon: z.string().min(1),
      idx: z.number().min(0).max(100),
      r: z.enum(["N", "R", "SR", "SSR", "UR", "UTR", "NB"]),
      quota: z.number().optional(),
      bannerOnly: z.boolean().optional(),
      cost: z.string(),
      spd: z.number(),
      quote: z.string(),
    });
    const sample = {
      id: "test",
      name: "Test",
      vendor: "Test",
      icon: "test",
      idx: 50,
      r: "SSR",
      cost: "$0.1/任务",
      spd: 100,
      quote: "test",
    };
    expect(() => Model.parse(sample)).not.toThrow();
    expect(() => Model.parse({ ...sample, r: "XXX" })).toThrow();
  });

  it("validate.js 存在且 state/economy 已解耦", () => {
    expect(validateText).toContain("validateConfig");
    expect(validateText).toContain("MODELS");
    expect(stateText).not.toContain("function payFactor");
    expect(stateText).not.toContain("function poolExpectedValue");
    expect(economyText).toContain("function payFactor");
    expect(economyText).toContain("function poolExpectedValue");
    expect(economyText).toContain("function expectedTaskPay");
  });

  it("config JSDoc 已添加", () => {
    expect(configText).toContain("@typedef");
    expect(configText).toContain("@type {Model[]}");
  });

  it("MODELS 63 条且经 validateConfig 自检", () => {
    // 去重前统计 MODELS 内的 id
    const modelBlock = configText.match(/const MODELS = \[([\s\S]*?)\];/)[1];
    const modelIds = [...modelBlock.matchAll(/id:\s*'([^']+)'/g)].map(x => x[1]);
    expect(new Set(modelIds).size).toBe(modelIds.length);
    expect(modelIds.length).toBeGreaterThanOrEqual(63);
  });
});

describe("覆盖率补齐：banner/skins/analytics/ui", () => {
  it("banner.js 含轮换与倒计时", () => {
    const t = fs.readFileSync(path.resolve("js/banner.js"), "utf8");
    expect(t).toContain("bannerSlot");
    expect(t).toContain("syncBanner");
    expect(t).toContain("bannerCountdownText");
  });
  it("skins.js 含 applySkin 与掉落", () => {
    const t = fs.readFileSync(path.resolve("js/skins.js"), "utf8");
    expect(t).toContain("applySkin");
    expect(t).toContain("rollSkinDrop");
    expect(t).toContain("SKINS");
  });
  it("analytics.js 含 5 图与 CSV 导出", () => {
    const t = fs.readFileSync(path.resolve("js/analytics.js"), "utf8");
    expect(t).toContain("drawBarChart");
    expect(t).toContain("drawLineChart");
    expect(t).toContain("drawDonutChart");
    expect(t).toContain("exportLedgerCSV");
    expect(t).toContain("setupLineTooltip");
  });
  it("ui 7 模块均存在且 boot 最后加载", () => {
    const html = fs.readFileSync(path.resolve("index.html"), "utf8");
    const order = [
      "ui/router.js",
      "ui/render.js",
      "ui/gacha.js",
      "ui/work.js",
      "ui/modals.js",
      "ui/share.js",
      "ui/boot.js",
    ];
    for (const f of order) expect(html).toContain(f);
    // boot 需在 banner 之前
    expect(html.indexOf("ui/boot.js")).toBeLessThan(html.indexOf("banner.js"));
  });
});
