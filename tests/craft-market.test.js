import { describe, it, expect } from "vitest";

// 合成台与黑市的函数级行为测试
import {
  MODELS,
  MMAP,
  RARITY,
  TASK_TOKENS,
  CRAFT_RECIPES,
  CRAFT_STAR_NEED,
  MARKET_CFG,
} from "../js/config.js";
import { S, defaultState, setState } from "../js/state.js";
import {
  craftVendorsFor,
  craftOutputCands,
  craftAvailable,
  doCraft,
  canStarUpgrade,
  doStarUpgrade,
} from "../js/craft.js";
import {
  genMarketOrder,
  ensureMarket,
  marketCanFulfill,
  marketMatchingCards,
  marketEstForCards,
  doMarketSell,
} from "../js/market.js";

function card(mid, opts = {}) {
  const m = MMAP[mid];
  const quota = m.quota || RARITY[m.r].quota;
  return { uid: S.uid++, m: mid, tokens: quota, max: quota, half: false, stars: 0, locked: false, ...opts };
}

describe("合成规则", () => {
  it("配方表 N→R/R→SR/SR→SSR 齐全且产出过滤 bannerOnly", () => {
    expect(CRAFT_RECIPES.map(r => r.id)).toEqual(["n3r", "r3sr", "sr3ssr"]);
    for (const r of CRAFT_RECIPES) {
      // 每个配方的可产出候选里不允许 bannerOnly
      for (const m of MODELS.filter(x => x.r === r.to && x.bannerOnly)) {
        for (const vendor of [...new Set(MODELS.filter(x => x.r === r.to).map(x => x.vendor))]) {
          expect(craftOutputCands(r, vendor).some(x => x.id === m.id)).toBe(false);
        }
      }
    }
  });
  it("craftVendorsFor 只统计未锁定且同稀有度数量达标的厂商", () => {
    setState(defaultState());
    S.inv.push(
      card("gpt4"),
      card("oss120"),
      card("llama4m"), // OpenAI/N ×2, Meta/N ×1
      card("gpt4", { locked: true })
    );
    const recipe = { need: 3, from: "N", to: "R" };
    const vendors = craftVendorsFor(recipe);
    expect(vendors).toEqual([]);
    S.inv.push(card("oss120")); // OpenAI/N ×3
    expect(craftVendorsFor(recipe)).toContain("OpenAI");
  });
  it("doCraft 校验: 数量/跨厂商/稀有度/锁定卡", () => {
    setState(defaultState());
    const a = card("gpt4"),
      b = card("oss120"),
      c = card("llama4m"); // OpenAI, OpenAI, Meta
    S.inv.push(a, b, c);
    expect(doCraft("n3r", [a.uid, b.uid]).ok).toBe(false);
    expect(doCraft("n3r", [a.uid, b.uid, c.uid]).ok).toBe(false); // 跨厂商
    const locked = card("gpt4", { locked: true });
    S.inv.push(locked, card("oss120"));
    expect(doCraft("n3r", [locked.uid, a.uid, b.uid]).ok).toBe(false); // 锁定卡
    expect(doCraft("nope", [a.uid, b.uid, c.uid]).ok).toBe(false); // 未知配方
  });
  it("doCraft 成功: 产出高一档、记账、统计回写", () => {
    setState(defaultState());
    const ids = [];
    for (let i = 0; i < 3; i++) {
      const c = card("gpt4");
      S.inv.push(c);
      ids.push(c.uid);
    }
    const res = doCraft("n3r", ids);
    expect(res.ok).toBe(true);
    expect(MMAP[res.card.m].r).toBe("R");
    expect(MMAP[res.card.m].vendor).toBe("OpenAI");
    expect(res.card.tokens % TASK_TOKENS).toBe(0);
    expect(S.inv.find(c => c.uid === res.card.uid)).toBeTruthy();
    expect(S.inv.filter(c => ids.includes(c.uid)).length).toBe(0);
    expect(S.crafts.count).toBe(1);
    expect(S.crafts.last).toBe(res.card.m);
    expect(S.daily.crafts).toBe(1);
    expect(S.stats.byR.R).toBe(1);
    expect(S.dex[res.card.m]).toBe(1);
    // ledger 记录合成
    expect(S.ledger[0].label).toContain("合成");
  });
  it("升星: 同模型×5, 星级继承最高+1, 满 3 星拒绝", () => {
    setState(defaultState());
    const mids = [];
    for (let i = 0; i < CRAFT_STAR_NEED; i++) {
      const c = card("opus5");
      S.inv.push(c);
      mids.push(c.uid);
    }
    expect(canStarUpgrade(mids)).toBe(true);
    const r1 = doStarUpgrade(mids);
    expect(r1.ok).toBe(true);
    expect(r1.card.stars).toBe(1);
    expect(S.crafts.stars).toBe(1);
    // 再凑 4 张 1 星 + 1 张 0 星 → 升到 2 星
    const batch = [];
    for (let i = 0; i < 4; i++) {
      const c = card("opus5", { stars: 1 });
      S.inv.push(c);
      batch.push(c.uid);
    }
    const c0 = card("opus5");
    S.inv.push(c0);
    batch.push(c0.uid);
    const r2 = doStarUpgrade(batch);
    expect(r2.ok).toBe(true);
    expect(r2.card.stars).toBe(2);
    // 满 3 星后拒绝
    const full = [];
    for (let i = 0; i < CRAFT_STAR_NEED; i++) {
      const c = card("opus5", { stars: 3 });
      S.inv.push(c);
      full.push(c.uid);
    }
    const r3 = doStarUpgrade(full);
    expect(r3.ok).toBe(false);
    expect(r3.msg).toContain("满 3 星");
  });
  it("craftAvailable 汇总配方与升星入口", () => {
    setState(defaultState());
    for (let i = 0; i < CRAFT_STAR_NEED; i++) S.inv.push(card("opus5"));
    const list = craftAvailable();
    expect(list.some(x => x.recipe.id === "star")).toBe(true);
  });
});

describe("黑市做市", () => {
  it("genMarketOrder 结构与区间", () => {
    for (let i = 0; i < 200; i++) {
      const o = genMarketOrder(i);
      expect(o.r).not.toBe("NB");
      expect(["N", "R", "SR", "SSR", "UR", "UTR"]).toContain(o.r);
      expect(o.premium).toBeGreaterThanOrEqual(MARKET_CFG.premiumMin);
      expect(o.premium).toBeLessThanOrEqual(MARKET_CFG.premiumMax);
      expect(o.need).toBeGreaterThanOrEqual(1);
      expect(MODELS.some(m => m.vendor === o.vendor && m.r === o.r)).toBe(true);
    }
  });
  it("ensureMarket 到期才刷新, 未到期不重掷", () => {
    setState(defaultState());
    ensureMarket();
    const first = S.market.orders.map(o => o.id);
    ensureMarket(); // next 未到
    expect(S.market.orders.map(o => o.id)).toEqual(first);
    S.market.next = Date.now() - 1; // 过期
    ensureMarket();
    expect(S.market.orders.map(o => o.id)).not.toEqual(first);
  });
  it("doMarketSell: 优先卖低星低 token, 收益=估值×溢价, 订单移除", () => {
    setState(defaultState());
    // 先让 ensureMarket 进入未过期状态, 再手放受控订单
    S.market.next = Date.now() + 3600000;
    const o = { id: "mtest", r: "UR", vendor: "Anthropic", need: 1, premium: 1.5, ts: Date.now() };
    S.market.orders = [o];
    const low = card("opus5", { stars: 0 });
    const high = card("opus5", { stars: 2 });
    S.inv.push(high, low);
    const money0 = S.money;
    const est = Math.round(marketEstForCards([low]) * 1.5);
    const res = doMarketSell("mtest");
    expect(res.ok).toBe(true);
    expect(res.payout).toBe(est);
    expect(S.money).toBeCloseTo(money0 + est, 6);
    expect(S.inv.some(c => c.uid === low.uid)).toBe(false); // 低星被卖
    expect(S.inv.some(c => c.uid === high.uid)).toBe(true);
    expect(S.daily.markets).toBe(1);
    expect(S.market.orders.some(x => x.id === "mtest")).toBe(false);
  });
  it("doMarketSell 失败路径: 缺卡/过期订单", () => {
    setState(defaultState());
    S.market.next = Date.now() + 3600000;
    const money0 = S.money;
    expect(doMarketSell("gone").ok).toBe(false);
    const o = { id: "m2", r: "UTR", vendor: "智谱 Z.ai", need: 1, premium: 1.2, ts: Date.now() };
    S.market.orders = [o];
    expect(marketCanFulfill(o)).toBe(false);
    expect(doMarketSell("m2").ok).toBe(false);
    expect(S.money).toBe(money0);
    expect(S.daily.markets).toBe(0);
  });
});
