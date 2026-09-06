import { describe, it, expect, beforeEach } from "vitest";

// state.js 存档迁移链的函数级测试（localStorage 由 jsdom 提供）
import { load, defaultState, setState, S, totalTasks, usableTasks, addLedger, save } from "../js/state.js";
import { TASK_TOKENS, START_MONEY } from "../js/config.js";

describe("存档迁移链", () => {
  beforeEach(() => localStorage.clear());

  it("无存档返回 null（由调用方落到 defaultState）", () => {
    expect(load()).toBeNull();
  });
  it("v2 旧档: token ×10、gpt4o→gpt4、规整 TASK_TOKENS 倍数", () => {
    const old = {
      money: 1000,
      inv: [
        { uid: 1, m: "gpt4o", tokens: 160000, max: 160000 }, // ×10 → 160万 → 规整 160万 = 8 单
        { uid: 2, m: "gpt4", tokens: 30000, max: 30000 }, // ×10 → 30万 → 30万/20万 = 1.5 → 规整 20万
      ],
      dex: { gpt4o: 2 },
      stats: {
        best: "gpt4o",
        byR: { N: 1, R: 0, SR: 0, SSR: 0, UR: 0 },
        pulls: 5,
        earn: 0,
        spent: 0,
        tasks: 0,
        disasters: 0,
      },
      flags: { rich: true, welcomed: true },
      daily: { signDay: 3, claimed: { work800: true, earn25000: true } },
      expedition: { x: 1 },
    };
    localStorage.setItem("tokengacha_v2", JSON.stringify(old));
    const s = load();
    expect(s).not.toBeNull();
    expect(s.inv.map(c => c.m)).toEqual(["gpt4", "gpt4"]);
    expect(s.inv[0].tokens).toBe(1600000);
    expect(s.inv[1].tokens).toBe(200000);
    expect(s.dex.gpt4).toBe(2);
    expect(s.stats.best).toBe("gpt4");
    expect(s.flags.ms.m50k).toBe(true); // rich → 成就迁移
    expect(s.flags.cheated).toBe(false);
    expect(s.flags.autoSkip).toBe(false);
    expect(s.daily.signDay).toBeUndefined();
    expect(s.daily.claimed.work300).toBe(true);
    expect(s.daily.claimed.earn18000).toBe(true);
    expect(s.expedition).toBeUndefined();
    expect(s.ver).toBe(4);
    // v4 迁移补齐字段
    expect(s.pity.banner).toBe(0);
    expect(s.bannerPulls).toBe(0);
    expect(s.crafts).toEqual({ count: 0, stars: 0, last: null });
    expect(s.market).toEqual({ orders: [], listings: [], next: 0 });
  });
  it("残卡(不足一单)在迁移中被清除", () => {
    localStorage.setItem(
      "tokengacha_v4",
      JSON.stringify({
        ver: 4,
        money: 500,
        inv: [{ uid: 1, m: "gpt4", tokens: 100000, max: 100000, stars: 0, locked: false }], // 半单
        stats: { byR: {} },
        flags: {},
        pity: {},
      })
    );
    const s = load();
    expect(s.inv.length).toBe(0);
  });
  it("defaultState 基线与工具函数", () => {
    setState(defaultState());
    expect(S.money).toBe(START_MONEY);
    expect(S.freeTen).toBe(1);
    expect(totalTasks()).toBe(0);
    expect(usableTasks()).toBe(0);
    addLedger("测试", 100);
    expect(S.ledger[0].label).toBe("测试");
    // 80 条截断
    for (let i = 0; i < 100; i++) addLedger(`#${i}`, 0);
    expect(S.ledger.length).toBe(80);
  });
  it("save/load 往返一致", () => {
    localStorage.clear();
    setState(defaultState());
    S.money = 4321;
    S.stats.pulls = 9;
    save();
    const s2 = load();
    expect(s2.money).toBe(4321);
    expect(s2.stats.pulls).toBe(9);
  });
});
