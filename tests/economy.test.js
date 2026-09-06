import { describe, it, expect } from "vitest";

// 经济公式单一数据源：直接 import economy.js 真函数断言，
// payoutParams 是 taskPayout(core.js) 抽样与 expectedTaskPay 期望的共同来源
import {
  payFactor,
  payoutParams,
  taskPayEvents,
  expectedTaskPay,
  poolExpectedValue,
  poolRTP,
  estValue,
  usableEstValue,
} from "../js/economy.js";
import { RARITY, TASK_TOKENS, MMAP, POOLS, PROBS, LIMITED_ALL } from "../js/config.js";
import { S, defaultState, setState } from "../js/state.js";
import { taskPayout } from "../js/core.js";

describe("payFactor 档位线性", () => {
  it("档位边界内为 0.8~1.2", () => {
    for (const r of Object.keys(RARITY)) {
      const t = RARITY[r];
      expect(payFactor({ r, idx: t.min })).toBeCloseTo(0.8, 2);
      expect(payFactor({ r, idx: t.max })).toBeCloseTo(1.2, 2);
      expect(payFactor({ r, idx: (t.min + t.max) / 2 })).toBeCloseTo(1.0, 1);
    }
  });
});

describe("payoutParams 单一数据源", () => {
  it("概率随智能指数单调变化且落在定义域", () => {
    const low = payoutParams({ idx: 7 });
    const high = payoutParams({ idx: 72 });
    expect(low.pGreat).toBeCloseTo(0.02 + 7 / 800);
    expect(high.pGreat).toBeCloseTo(0.02 + 72 / 800);
    // pRework: clamp 在 0.04~0.25, idx=7 → 0.25-0.028=0.222
    expect(low.pRework).toBeCloseTo(0.25 - 7 / 250);
    expect(low.pRework).toBeLessThanOrEqual(0.25);
    expect(high.pRework).toBeCloseTo(0.04);
    // pDisaster: 高分无事故
    expect(low.pDisaster).toBeGreaterThan(0);
    expect(high.pDisaster).toBe(0);
    // 四事件概率和 ≤ 1
    for (const p of [low, high]) {
      expect(p.pGreat + p.pRework + p.pDisaster).toBeLessThanOrEqual(1);
    }
  });
  it("taskPayEvents: 限定×2、星级 +5%/星", () => {
    const base = taskPayEvents({ id: "opus5", r: "UR", idx: 63 });
    const star3 = taskPayEvents({ id: "opus5", r: "UR", idx: 63, stars: 3 });
    expect(star3.ok).toBeCloseTo(base.ok * 1.15, 6);
    const lim = taskPayEvents({ id: "dsv5pro", r: "UTR", idx: 72 });
    const nonLim = taskPayEvents({ r: "UTR", idx: 72, id: "fake-nonlim" });
    expect(lim.ok).toBeCloseTo(nonLim.ok * 2, 6);
    expect(taskPayEvents({ id: "gpt4", r: "N", idx: 7 }).disaster).toBe(-50 * 1.3);
  });
  it("expectedTaskPay = Σ p×amt（与 taskPayEvents 同源）", () => {
    for (const m of [
      { id: "gpt4", r: "N", idx: 7 },
      { id: "opus5", r: "UR", idx: 63 },
    ]) {
      const p = payoutParams(m);
      const ev = taskPayEvents(m);
      const pOk = 1 - p.pGreat - p.pRework - p.pDisaster;
      const manual = pOk * ev.ok + p.pGreat * ev.great + p.pRework * ev.rework + p.pDisaster * ev.disaster;
      expect(expectedTaskPay(m)).toBeCloseTo(manual, 10);
    }
  });
});

describe("expectedTaskPay 数值回归", () => {
  it("限定卡翻倍、星级+5%/星", () => {
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

  it("抽样均值收敛到 expectedTaskPay（同源验证, 含删库修正后一致）", () => {
    const m = { id: "dsv4fl", r: "SR", idx: 42 };
    const ev = expectedTaskPay(m);
    let sum = 0;
    const N = 60000;
    for (let i = 0; i < N; i++) sum += taskPayout(m).amt;
    const mean = sum / N;
    // 大样本下均值与期望偏差 < 1.5%
    expect(Math.abs(mean - ev) / Math.abs(ev)).toBeLessThan(0.015);
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
});

describe("卡池期望与回本率", () => {
  it("poolExpectedValue/RTP 为正且白银池 RTP 已公示区间", () => {
    for (const k of Object.keys(POOLS)) {
      const ev = poolExpectedValue(k);
      expect(ev).toBeGreaterThan(0);
      const rtp = poolRTP(k);
      expect(rtp).toBeGreaterThan(0.3);
      expect(rtp).toBeLessThan(2.5);
    }
  });
  it("0731 独立出货计入期望（关掉 PROBS.DSV73 则期望下降）", () => {
    const with73 = poolExpectedValue("standard");
    const keep = PROBS.DSV73;
    PROBS.DSV73 = 0;
    const without73 = poolExpectedValue("standard");
    PROBS.DSV73 = keep;
    expect(with73).toBeGreaterThan(without73);
  });
});

describe("估值层", () => {
  it("estValue/usableEstValue 与卡库 token 一致且锁定卡被剔除", () => {
    setState(defaultState());
    S.inv.push(
      {
        uid: 1,
        m: "opus5",
        tokens: 20 * TASK_TOKENS,
        max: 20 * TASK_TOKENS,
        half: false,
        stars: 0,
        locked: false,
      },
      {
        uid: 2,
        m: "gpt4",
        tokens: 10 * TASK_TOKENS,
        max: 10 * TASK_TOKENS,
        half: false,
        stars: 0,
        locked: true,
      }
    );
    const full = ((20 * TASK_TOKENS) / TASK_TOKENS) * expectedTaskPay(MMAP.opus5);
    expect(estValue()).toBeCloseTo(full + ((10 * TASK_TOKENS) / TASK_TOKENS) * expectedTaskPay(MMAP.gpt4), 6);
    expect(usableEstValue()).toBeCloseTo(full, 6);
    expect(LIMITED_ALL.has("dsv5pro")).toBe(true);
  });
});
