import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const analytics = fs.readFileSync(path.resolve("js/analytics.js"), "utf8");
const craft = fs.readFileSync(path.resolve("js/craft.js"), "utf8");
const market = fs.readFileSync(path.resolve("js/market.js"), "utf8");
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
const html = fs.readFileSync(path.resolve("index.html"), "utf8");
const css = fs.readFileSync(path.resolve("css/style.css"), "utf8");

describe("P1-1 数据页修复", () => {
  it("余额走势去重尾点且截断提示", () => {
    expect(analytics).toContain("pts[pts.length-1]!==S.money");
    expect(analytics).not.toContain("pts.push(S.money);\n  pts.push(S.money)");
    expect(analytics).toContain("仅最近80条");
  });
  it("空状态占位：柱状/环形/厂商", () => {
    expect(analytics).toContain("暂无出货");
    expect(analytics).toContain("暂无占比");
    expect(analytics).toContain("暂无厂商数据");
  });
  it("CSV 导出函数齐全", () => {
    expect(analytics).toContain("exportLedgerCSV");
    expect(analytics).toContain("exportHistCSV");
    expect(analytics).toContain("_downloadCSV");
    expect(analytics).toContain("_csvEscape");
  });
  it("数据页有导出按钮", () => {
    expect(html).toContain("btn-export-ledger");
    expect(html).toContain("btn-export-hist");
  });
});

describe("P1-2 合成台/黑市修复", () => {
  it("合成产出过滤 bannerOnly", () => {
    expect(craft).toContain("!m.bannerOnly");
    expect(craft).toContain("限定卡（bannerOnly）不可被合成");
  });
  it("合成厂商需有可产出", () => {
    expect(craft).toContain("craftOutputCands(recipe, v).length>0");
  });
  it("黑市已含限定×2提示", () => {
    expect(market).toContain("已含限定×2");
    expect(market).toContain("LIMITED_ALL");
    expect(html).toContain("已含限定×2/星级");
  });
});

describe("P1-3 卡库批量", () => {
  it("批量按钮与工具栏存在", () => {
    expect(html).toContain("btn-batch-toggle");
    expect(html).toContain("inv-batch-bar");
    expect(html).toContain("btn-batch-lock");
    expect(html).toContain("btn-batch-destroy");
  });
  it("批量样式与隐藏规则", () => {
    expect(css).toContain(".inv-card.batched");
    expect(css).toContain("#inv-batch-bar[hidden]");
  });
  it("ui.js 批量逻辑齐全", () => {
    expect(ui).toContain("_batchMode");
    expect(ui).toContain("_batchSet");
    expect(ui).toContain("btn-confirm-batch-destroy");
    expect(ui).toContain("updateBatchBar");
  });
});

describe("P1-4 体验收敛", () => {
  it("SEO meta 齐全", () => {
    expect(html).toContain('name="description"');
    expect(html).toContain('property="og:title"');
    expect(html).toContain('name="theme-color"');
  });
  it("外置样式保持双击可用", () => {
    expect(html).toContain('href="css/style.css?v=2"');
    expect(css).toContain(".pool-card");
  });
});
