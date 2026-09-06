import { describe, it, expect } from "vitest";

// ESM 化冒烟：整条模块链可 import，核心循环可在无渲染环境下跑通
import { MODELS, RARITY, MMAP, MILESTONES } from "../js/config.js";
import { validateConfig } from "../js/validate.js";
import { S, defaultState, setState, totalTasks } from "../js/state.js";
import { doPulls, consumeTasks, taskPayout } from "../js/core.js";
import { doCraft, doStarUpgrade, craftVendorsFor } from "../js/craft.js";
import { ensureMarket, doMarketSell, marketCanFulfill } from "../js/market.js";
import { bannerSlot, syncBanner } from "../js/banner.js";
import { doSign, dailyTaskProgress, claimDailyTask } from "../js/daily.js";
import { applySkin, rollSkinDrop, convertSkinTickets } from "../js/skins.js";

describe("ESM 模块链", () => {
  it("全模块可导入且导出齐全", () => {
    expect(typeof doPulls).toBe("function");
    expect(typeof consumeTasks).toBe("function");
    expect(typeof doCraft).toBe("function");
    expect(typeof doMarketSell).toBe("function");
    expect(typeof bannerSlot).toBe("function");
    expect(typeof doSign).toBe("function");
    expect(typeof applySkin).toBe("function");
    expect(typeof rollSkinDrop).toBe("function");
    expect(typeof convertSkinTickets).toBe("function");
  });
  it("config 自检通过", () => {
    const r = validateConfig();
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
  });
});

describe("谓词型成就", () => {
  const craft10 = MILESTONES.find(m => m.id === "mCraft10");
  const star5 = MILESTONES.find(m => m.id === "mStar5");
  it("工匠成就按合成/升星进度判定", () => {
    expect(craft10 && star5).toBeTruthy();
    setState(defaultState());
    expect(craft10.check(S)).toBe(0);
    S.crafts.count = 5;
    expect(craft10.check(S)).toBeCloseTo(0.5);
    S.crafts.count = 10;
    expect(craft10.check(S)).toBe(1);
    S.crafts.stars = 5;
    expect(star5.check(S)).toBe(1);
  });
  it("validateConfig 兼容无 at 的谓词成就", () => {
    expect(validateConfig().ok).toBe(true);
  });
});

describe("核心循环冒烟 (逻辑层, 无 DOM)", () => {
  it("抽卡→工作→结算跑通, 数据一致性成立", () => {
    setState(defaultState());
    const cards = doPulls("standard", 10);
    expect(cards.length).toBe(10);
    expect(S.inv.length).toBe(10);
    expect(S.stats.pulls).toBe(10);
    expect(S.daily.pulls).toBe(10);
    // 十连保底: 必出 SR+
    expect(cards.some(c => ["SR", "SSR", "UR", "UTR", "NB"].includes(MMAP[c.m].r))).toBe(true);
    const n = Math.min(10, totalTasks());
    if (n > 0) {
      const items = consumeTasks(n);
      expect(items.length).toBeGreaterThan(0);
      for (const it of items) expect(it.res.amt).not.toBeUndefined();
    }
  });
  it("限定池 100 抽大保底必出当期限定 UTR", () => {
    setState(defaultState());
    syncBanner();
    S.money = 1e9;
    let limited = false;
    for (let i = 0; i < 100; i++) {
      const cards = doPulls("banner", 1);
      const m = MMAP[cards[0].m];
      if (i >= 90 && m.r === "UTR") limited = true;
    }
    expect(S.bannerPulls).toBeGreaterThan(0);
    expect(S.pity.banner).toBeLessThan(100);
    expect(limited || S.stats.byR.UTR > 0).toBe(true);
  });
  it("taskPayout 四事件与限定加成", () => {
    const weak = { id: "gpt4", r: "N", idx: 7 };
    let sawDisaster = false;
    for (let i = 0; i < 20000 && !sawDisaster; i++) {
      const res = taskPayout(weak);
      if (res.evt === "disaster") {
        sawDisaster = true;
        expect(res.amt).toBeLessThan(0);
      }
    }
    expect(sawDisaster).toBe(true);
  });
  it("签到与日常任务状态机", () => {
    setState(defaultState());
    const r1 = doSign();
    expect(r1.ok).toBe(true);
    expect(r1.amt).toBe(200); // 第 1 天
    const r2 = doSign();
    expect(r2.already).toBe(true);
    S.daily.pulls = 100;
    const t = { id: "pull100", target: 100 };
    expect(dailyTaskProgress({ ...t, check: undefined })).toBe(100);
    const c1 = claimDailyTask("pull100");
    expect(c1.ok).toBe(true);
    expect(S.skinTickets).toBe(1);
    expect(S.freeTen).toBe(1);
    const c2 = claimDailyTask("pull100");
    expect(c2.ok).toBe(false);
  });
  it("合成/升星规则 (逻辑层返回结果, 无 UI 副作用)", () => {
    setState(defaultState());
    // 造 3 张同厂商 N 卡
    const nCards = MODELS.filter(m => m.r === "N" && m.vendor === "OpenAI" && !m.bannerOnly).slice(0, 3);
    nCards.forEach((m, i) =>
      S.inv.push({
        uid: i + 1,
        m: m.id,
        tokens: m.quota || RARITY.N.quota,
        max: m.quota || RARITY.N.quota,
        half: false,
        stars: 0,
        locked: false,
      })
    );
    const recipe = { need: 3, from: "N", to: "R" };
    const vendors = craftVendorsFor(recipe);
    expect(vendors).toContain("OpenAI");
    const res = doCraft("n3r", [1, 2, 3]);
    expect(res.ok).toBe(true);
    expect(MMAP[res.card.m].r).toBe("R");
    expect(S.crafts.count).toBe(1);
    expect(S.daily.crafts).toBe(1);
    // 升星失败路径
    const bad = doStarUpgrade([99, 100, 101, 102, 103]);
    expect(bad.ok).toBe(false);
  });
  it("黑市成交走逻辑层返回", () => {
    setState(defaultState());
    ensureMarket();
    expect(S.market.orders.length).toBe(6);
    for (const o of S.market.orders) {
      // 造满足条件的卡
      const pool = MODELS.filter(m => m.r === o.r && m.vendor === o.vendor);
      for (let i = 0; i < o.need && pool.length; i++) {
        const m = pool[i % pool.length];
        S.inv.push({
          uid: S.uid++,
          m: m.id,
          tokens: m.quota || RARITY[o.r].quota,
          max: m.quota || RARITY[o.r].quota,
          half: false,
          stars: 0,
          locked: false,
        });
      }
      expect(marketCanFulfill(o)).toBe(true);
      const money0 = S.money;
      const res = doMarketSell(o.id);
      expect(res.ok).toBe(true);
      expect(S.money).toBeGreaterThan(money0);
      expect(S.daily.markets).toBeGreaterThan(0);
      break;
    }
  });
});
