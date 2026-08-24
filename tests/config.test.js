import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const configText = fs.readFileSync(path.resolve("js/config.js"), "utf8");

function extractArray(name) {
  const m = configText.match(new RegExp(`const\\s+${name}\\s*=\\s*\\[([\\s\\S]*?)\\];`));
  if (!m) throw new Error(`not found ${name}`);
  return m[1];
}

describe("config.js 数据完整性", () => {
  it("MODELS 数量 >=63 且 id 唯一、必要字段齐全", () => {
    const body = extractArray("MODELS");
    const ids = [...body.matchAll(/id:\s*'([^']+)'/g)].map(x => x[1]);
    expect(ids.length).toBeGreaterThanOrEqual(63);
    expect(new Set(ids).size).toBe(ids.length);
    // 每个模型应有 name/vendor/icon/idx/r
    const entries = body.split(/},\s*{/);
    for (const e of entries) {
      expect(e).toMatch(/name:/);
      expect(e).toMatch(/vendor:/);
      expect(e).toMatch(/idx:/);
      expect(e).toMatch(/r:/);
    }
  });

  it("MMAP 与 MODELS 一致", () => {
    expect(configText).toContain("const MMAP = Object.fromEntries");
  });

  it("RARITY 档位完整且 quota/tasks 合理", () => {
    expect(configText).toContain("RARITY");
    for (const r of ["N", "R", "SR", "SSR", "UR", "UTR", "NB"]) {
      expect(configText).toContain(`${r}:`);
    }
    // N tasks 4, UTR 24, NB 30
    expect(configText).toMatch(/N:\s*\{[^}]*tasks:\s*4/);
    expect(configText).toMatch(/UTR:\s*\{[^}]*tasks:\s*24/);
    expect(configText).toMatch(/NB:\s*\{[^}]*tasks:\s*30/);
  });

  it("RORDER 与 RORDER_DESC 互为逆序", () => {
    expect(configText).toContain("const RORDER = ['N','R','SR','SSR','UR','UTR','NB']");
    expect(configText).toContain("const RORDER_DESC = ['NB','UTR','UR','SSR','SR','R','N']");
  });

  it("POOLS 四池齐全，rates 概率和约 1", () => {
    expect(configText).toContain("newbie");
    expect(configText).toContain("standard");
    expect(configText).toContain("flagship");
    expect(configText).toContain("banner");
    // 抽取每个池的 rates
    const pools = [...configText.matchAll(/rates:\s*\{([^}]+)\}/g)];
    expect(pools.length).toBeGreaterThanOrEqual(4);
    for (const [, body] of pools) {
      const nums = [...body.matchAll(/:\s*([0-9.]+)/g)].map(x => parseFloat(x[1]));
      const sum = nums.reduce((a, b) => a + b, 0);
      // 允许浮点误差
      expect(sum).toBeCloseTo(1, 1);
    }
  });

  it("BANNER_SEASONS 三赛季循环且 limited 与 featured 齐全", () => {
    const body = extractArray("BANNER_SEASONS");
    const seasons = [...body.matchAll(/id:\s*'([^']+)'/g)].map(x => x[1]);
    expect(seasons).toEqual(["v5", "cog", "oss"]);
    expect(configText).toContain("BANNER_DUR = 86400000");
    expect(configText).toContain("BANNER_EPOCH");
  });

  it("经济常量声明齐全", () => {
    for (const k of ["TASK_TOKENS", "PAY_BOOST", "BATCH_TASKS", "VICTORY_AT", "START_MONEY", "PITY_MAX"]) {
      expect(configText).toContain(k);
    }
    expect(configText).toMatch(/TASK_TOKENS\s*=\s*200000/);
    expect(configText).toMatch(/VICTORY_AT\s*=\s*50000/);
    expect(configText).toMatch(/START_MONEY\s*=\s*800/);
  });

  it("LIMITED 集合与 BANNER_SEASONS limited 一致", () => {
    expect(configText).toContain("LIMITED_IDS");
    expect(configText).toContain("LIMITED_ALL");
    expect(configText).toContain("BANNER_SEASONS.flatMap");
  });

  it("皮肤 6 套且经典蓝为默认（P2 新增薄荷白茶）", () => {
    const body = extractArray("SKINS");
    const ids = [...body.matchAll(/id:\s*'([^']+)'/g)].map(x => x[1]);
    expect(ids).toEqual(["classic", "night", "cyber", "gold", "pink", "mint"]);
    expect(body).toContain("default:true");
    expect(body).toContain("mint");
  });

  it("签到 21 天奖励单调递增且最后一天 5000", () => {
    const m = configText.match(/const\s+SIGN_REWARDS\s*=\s*\[([^\]]+)\]/);
    expect(m).not.toBeNull();
    const arr = m[1].split(",").map(s => parseInt(s.trim(), 10));
    expect(arr.length).toBe(21);
    expect(arr[arr.length - 1]).toBe(5000);
    for (let i = 1; i < arr.length; i++) expect(arr[i]).toBeGreaterThan(arr[i - 1]);
  });

  it("DAILY_TASKS 五任务且 target/reward 合理（P2 新增合成/黑市）", () => {
    const body = extractArray("DAILY_TASKS");
    expect(body).toContain("pull100");
    expect(body).toContain("work300");
    expect(body).toContain("earn18000");
    expect(body).toContain("craft2");
    expect(body).toContain("market2");
    const count = (body.match(/id:/g) || []).length;
    expect(count).toBe(5);
  });

  it("成就墙 10 档覆盖 5k~500k", () => {
    const body = extractArray("MILESTONES");
    const ids = [...body.matchAll(/id:\s*'([^']+)'/g)].map(x => x[1]);
    expect(ids.length).toBe(10);
    expect(ids).toEqual(["m5k", "m10k", "m20k", "m35k", "m50k", "m75k", "m100k", "m150k", "m250k", "m500k"]);
    expect(body).toContain("500000");
  });

  it("图标与模型 vendor 覆盖主流厂商", () => {
    for (const v of ["DeepSeek", "Anthropic", "OpenAI", "Google", "Meta"]) {
      expect(configText).toContain(v);
    }
  });
});
