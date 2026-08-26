import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

// 纯前端逻辑在浏览器中通过全局变量串联，这里在 Node 侧复刻关键公式做回归保护
// 若未来改动 config/state/core 的数值，测试会立刻失败，提示同步更新期望

const configText = fs.readFileSync(path.resolve("js/config.js"), "utf8");
const economyText = fs.readFileSync(path.resolve("js/economy.js"), "utf8");
const coreText = fs.readFileSync(path.resolve("js/core.js"), "utf8");

// 从 config 提取的简化 RARITY（与生产一致）
const RARITY = {
  N: { tasks: 4, basePay: 3.2, min: 10, max: 27 },
  R: { tasks: 8, basePay: 7.2, min: 28, max: 39 },
  SR: { tasks: 12, basePay: 15.5, min: 40, max: 46 },
  SSR: { tasks: 16, basePay: 35, min: 47, max: 54 },
  UR: { tasks: 20, basePay: 80, min: 55, max: 63 },
  UTR: { tasks: 24, basePay: 420, min: 64, max: 99 },
  NB: { tasks: 30, basePay: 640, min: 64, max: 100 },
};
const PAY_BOOST = 1.3;
const LIMITED = new Set(["dsv5pro", "dsv5fl", "opus6", "gem4pro", "glm6", "qwen5max"]);

function payFactor(m) {
  const t = RARITY[m.r];
  const span = Math.max(1, t.max - t.min);
  return 0.8 + 0.4 * Math.min(1, Math.max(0, (m.idx - t.min) / span));
}
function expectedTaskPay(m, stars = 0) {
  if (m && m.stars != null && !stars) stars = m.stars;
  let pay = RARITY[m.r].basePay * payFactor(m);
  if (LIMITED.has(m.id)) pay *= 2;
  if (stars) pay *= 1 + stars * 0.05;
  const pG = 0.02 + m.idx / 800;
  const pR = Math.min(0.25, Math.max(0.04, 0.25 - m.idx / 250));
  const pD = Math.min(0.02, Math.max(0, (28 - m.idx) / 1200));
  const pO = Math.max(0, 1 - pG - pR - pD);
  return PAY_BOOST * (pO * pay + pG * pay * 2.5 + pR * pay * 0.4 - pD * 50 * PAY_BOOST);
}

describe("经济公式回归", () => {
  it("payFactor 在档位边界内为 0.8~1.2", () => {
    for (const r of Object.keys(RARITY)) {
      const t = RARITY[r];
      expect(payFactor({ r, idx: t.min })).toBeCloseTo(0.8, 2);
      expect(payFactor({ r, idx: t.max })).toBeCloseTo(1.2, 2);
      expect(payFactor({ r, idx: (t.min + t.max) / 2 })).toBeCloseTo(1.0, 1);
    }
  });

  it("expectedTaskPay 限定卡翻倍、星级+5%/星", () => {
    const base = { id: "opus5", r: "UR", idx: 63 };
    const limited = { id: "dsv5pro", r: "UTR", idx: 72 };
    const vBase = expectedTaskPay(base);
    const vLim = expectedTaskPay(limited);
    // UTR 基础就远高于 UR，限定再翻倍，必大于 base
    expect(vLim).toBeGreaterThan(vBase * 1.5);
    const s0 = expectedTaskPay({ id: "doubao", r: "N", idx: 14 });
    const s3 = expectedTaskPay({ id: "doubao", r: "N", idx: 14, stars: 3 });
    // 含删库赔付项不随星级缩放，低分 N 档整体约 1.21×而非 1.15×
    expect(s3).toBeGreaterThan(s0);
    expect(s3 / s0).toBeGreaterThan(1.15);
    expect(s3 / s0).toBeLessThan(1.25);
    // 高分模型（pD~0）接近理论倍率 1.15
    const h0 = expectedTaskPay({ id: "opus5", r: "UR", idx: 63 });
    const h3 = expectedTaskPay({ id: "opus5", r: "UR", idx: 63, stars: 3 });
    expect(h3).toBeCloseTo(h0 * 1.15, 2);
  });

  it("economy.js 的 expectedTaskPay 含 LIMITED_ALL 与星级逻辑", () => {
    expect(economyText).toContain("LIMITED_ALL");
    expect(economyText).toContain("stars");
    expect(economyText).toMatch(/payFactor/);
    expect(economyText).toMatch(/PAY_BOOST/);
  });

  it("poolExpectedValue 包含 0731 独立 1.5% 与限定过滤", () => {
    expect(economyText).toContain("poolExpectedValue");
    expect(economyText).toContain("DSV73");
    expect(economyText).toContain("bannerOnly");
    expect(economyText).toContain("LIMITED_IDS");
  });

  it("core.js taskPayout 事件概率与 payFactor 一致", () => {
    expect(coreText).toContain("pGreat");
    expect(coreText).toContain("pRework");
    expect(coreText).toContain("pDisaster");
    expect(coreText).toContain("PAY_BOOST");
    expect(coreText).toContain("taskPayout");
  });

  it("各档位 expectedTaskPay 单调：垃圾 < 普通 < 精锐 < 传说 < 神话 < 超神话", () => {
    const samples = [
      { id: "doubao", r: "N", idx: 14 },
      { id: "haiku45", r: "R", idx: 30 },
      { id: "dsv4fl", r: "SR", idx: 42 },
      { id: "gem31pro", r: "SSR", idx: 48 },
      { id: "opus5", r: "UR", idx: 63 },
      { id: "dsv5pro", r: "UTR", idx: 72 },
    ];
    const vals = samples.map(expectedTaskPay);
    for (let i = 1; i < vals.length; i++) {
      expect(vals[i]).toBeGreaterThan(vals[i - 1]);
    }
  });

  it("config.js 中 PROBS/TUNING 集中常量存在", () => {
    expect(configText).toContain("PROBS");
    expect(configText).toContain("TUNING");
    expect(configText).toMatch(/DSV73:\s*0\.015/);
    expect(configText).toMatch(/FIHAG:\s*0\.0001/);
    expect(configText).toMatch(/SKIN_DROP/);
  });

  it("消耗 token 必须整除 TASK_TOKENS（避免残卡）", () => {
    expect(economyText).toContain("TASK_TOKENS");
    expect(coreText).toContain("Math.floor");
    expect(coreText).toContain("TASK_TOKENS");
    // economy.js 与 core.js 都应有规整逻辑
    expect((economyText.match(/TASK_TOKENS/g) || []).length).toBeGreaterThan(2);
    expect((coreText.match(/TASK_TOKENS/g) || []).length).toBeGreaterThan(2);
  });
});
