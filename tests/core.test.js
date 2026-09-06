import { describe, it, expect } from "vitest";

// core.js 抽卡/工作核心的函数级行为测试
import { POOLS, PITY_MAX, MODELS, MMAP, RARITY, TASK_TOKENS, LIMITED_IDS } from "../js/config.js";
import { S, defaultState, setState } from "../js/state.js";
import {
  drawRarity,
  makeCard,
  makeLimited,
  doPulls,
  taskPayout,
  consumeTasks,
  banClaudeCards,
  bestCard,
  maybeHallucinate,
} from "../js/core.js";

function fresh(extra = {}) {
  setState(defaultState());
  Object.assign(S, extra);
}

describe("抽卡保底", () => {
  it("普通池 pity 计满后必出 SSR/UR", () => {
    fresh();
    S.pity.standard = PITY_MAX - 1;
    for (let i = 0; i < 50; i++) {
      const r = drawRarity("standard");
      expect(["SSR", "UR"]).toContain(r);
    }
  });
  it("限定池大保底必出当期限定 UTR 且 pity 清零", () => {
    fresh();
    S.pity.banner = 99;
    for (let i = 0; i < 30; i++) {
      const c = makeLimited("banner");
      expect(MMAP[c.m].r).toBe("UTR");
      expect(LIMITED_IDS.has(c.m)).toBe(true);
    }
    doPulls("banner", 1);
    expect(S.pity.banner).toBe(0);
  });
  it("限定池普通 SSR/UR 不清零 pity（100 抽内必出限定 UTR）", () => {
    fresh();
    S.pity.banner = 50;
    // 强制走非保底路径: 随机抽到非限定卡时 pity 必须递增或因限定清零
    for (let i = 0; i < 200; i++) {
      const before = S.pity.banner;
      const cards = doPulls("banner", 1);
      const m = MMAP[cards[0].m];
      const isCurLimited = m.r === "UTR" && LIMITED_IDS.has(cards[0].m);
      if (isCurLimited || m.r === "NB") expect(S.pity.banner).toBe(0);
      else expect(S.pity.banner).toBe(before + 1);
      S.pity.banner = 50; // 固定中间态反复验证
    }
  });
  it("十连保底：无 SR+ 时最后一张被替换为 SR", () => {
    fresh();
    // 用可控随机: 直接验证替换逻辑——构造全 N/R 抽取结果不可控, 改为统计验证
    let sawForced = false;
    for (let round = 0; round < 40 && !sawForced; round++) {
      const cards = doPulls("standard", 10);
      if (!cards.slice(0, 9).some(c => ["SR", "SSR", "UR", "UTR", "NB"].includes(MMAP[c.m].r))) {
        sawForced = true;
      }
      expect(cards.some(c => ["SR", "SSR", "UR", "UTR", "NB"].includes(MMAP[c.m].r))).toBe(true);
      fresh();
    }
    expect(sawForced).toBe(true);
  });
  it("0731 独立出货记入 SSR 且 quota 规整到 TASK_TOKENS 倍数", () => {
    fresh();
    for (let i = 0; i < 300; i++) {
      const c = makeCard("standard", "SSR", true);
      expect(c.m).toBe("dsv4fl73");
      expect(c.tokens % TASK_TOKENS).toBe(0);
      expect(c.tokens).toBe(5400000);
    }
  });
  it("幻觉仅发生在非 UR+ 且补偿使 tokens 为 TASK_TOKENS 整倍数", () => {
    fresh();
    for (let i = 0; i < 500; i++) {
      const c = makeCard("standard", "R", false);
      maybeHallucinate(c, "standard");
      if (c._halluc) {
        expect(c.tokens % TASK_TOKENS).toBe(0);
        expect(MMAP[c.m].r).toBe("R");
        break;
      }
    }
  });
});

describe("工作消耗", () => {
  it("consumeTasks 高稀有度优先消耗且跳过锁定卡", () => {
    fresh();
    S.inv.push(
      {
        uid: 1,
        m: "gpt4",
        tokens: 4 * TASK_TOKENS,
        max: 4 * TASK_TOKENS,
        half: false,
        stars: 0,
        locked: false,
      },
      {
        uid: 2,
        m: "opus5",
        tokens: 2 * TASK_TOKENS,
        max: 2 * TASK_TOKENS,
        half: false,
        stars: 0,
        locked: false,
      },
      {
        uid: 3,
        m: "fable5",
        tokens: 9 * TASK_TOKENS,
        max: 9 * TASK_TOKENS,
        half: false,
        stars: 0,
        locked: true,
      }
    );
    const items = consumeTasks(4);
    // 前 2 单来自 opus5（非锁定中最高稀有度, 恰好耗尽）, 后 2 单回落到 gpt4
    expect(items.slice(0, 2).every(it => it.m.id === "opus5")).toBe(true);
    expect(items.slice(2).every(it => it.m.id === "gpt4")).toBe(true);
    const opus = S.inv.find(c => c.uid === 2);
    expect(opus).toBeUndefined(); // 2 单后耗尽移除
    // 剩余: gpt4 2 单 + 锁定 fable5
    expect(S.inv.find(c => c.uid === 1).tokens).toBe(2 * TASK_TOKENS);
    expect(S.inv.find(c => c.uid === 3).tokens).toBe(9 * TASK_TOKENS);
  });
  it("残卡与耗尽卡被清理，不会卡死卡库", () => {
    fresh();
    S.inv.push({
      uid: 1,
      m: "gpt4",
      tokens: 4 * TASK_TOKENS,
      max: 4 * TASK_TOKENS,
      half: false,
      stars: 0,
      locked: false,
    });
    consumeTasks(4);
    expect(S.inv.filter(c => c.uid === 1).length).toBe(0);
  });
  it("banClaudeCards 清空全部 Anthropic 卡", () => {
    fresh();
    S.inv.push(
      {
        uid: 1,
        m: "opus5",
        tokens: 2 * TASK_TOKENS,
        max: 2 * TASK_TOKENS,
        half: false,
        stars: 0,
        locked: false,
      },
      {
        uid: 2,
        m: "gpt4",
        tokens: 2 * TASK_TOKENS,
        max: 2 * TASK_TOKENS,
        half: false,
        stars: 0,
        locked: false,
      }
    );
    banClaudeCards();
    expect(S.inv.map(c => c.uid)).toEqual([2]);
  });
  it("bestCard 取未锁定最高稀有度", () => {
    fresh();
    S.inv.push(
      {
        uid: 1,
        m: "gpt4",
        tokens: 4 * TASK_TOKENS,
        max: 4 * TASK_TOKENS,
        half: false,
        stars: 0,
        locked: false,
      },
      {
        uid: 2,
        m: "opus5",
        tokens: 2 * TASK_TOKENS,
        max: 2 * TASK_TOKENS,
        half: false,
        stars: 0,
        locked: true,
      }
    );
    expect(bestCard().m).toBe("gpt4");
  });
});

describe("taskPayout 事件分布", () => {
  it("四事件齐全且 disaster 为负", () => {
    const m = MMAP.gpt4;
    const seen = new Set();
    for (let i = 0; i < 50000; i++) {
      const r = taskPayout(m);
      seen.add(r.evt);
      expect(r.amt).not.toBeNaN();
    }
    for (const e of ["great", "ok", "rework", "disaster"]) expect(seen.has(e)).toBe(true);
  });
  it("限定卡 boosted 标记与星级加成", () => {
    const lim = taskPayout(MMAP.dsv5pro);
    expect(lim.boosted).toBe(true);
    const nonLim = taskPayout(MMAP.opus5);
    expect(nonLim.boosted).toBe(false);
    // ok 事件: 3 星收益应为同卡无星的 1.15 倍
    let r0 = 0,
      r3 = 0;
    for (let i = 0; i < 20000; i++) {
      const a = taskPayout(MMAP.opus5, 0);
      const b = taskPayout(MMAP.opus5, 3);
      if (a.evt === "ok") r0 += a.amt;
      if (b.evt === "ok") r3 += b.amt;
    }
    expect(r3 / r0).toBeGreaterThan(1.05);
    expect(r3 / r0).toBeLessThan(1.25);
  });
});
