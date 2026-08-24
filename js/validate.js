"use strict";
/* ================================================================
   TokenGacha · 校验层 (validate.js)
   运行时轻量校验（浏览器）+ 为 Node 单测暴露 zod schema
   ================================================================ */

/**
 * 轻量校验 MODELS/RARITY/POOLS，供浏览器启动时自检
 * @returns {{ok:boolean, errors:string[]}}
 */
function validateConfig() {
  const errors = [];
  const ids = new Set();
  for (const m of MODELS) {
    if (!m.id || typeof m.id !== "string") errors.push(`Model 缺 id: ${JSON.stringify(m)}`);
    if (ids.has(m.id)) errors.push(`Model 重复 id: ${m.id}`);
    ids.add(m.id);
    if (!m.name) errors.push(`Model ${m.id} 缺 name`);
    if (!m.vendor) errors.push(`Model ${m.id} 缺 vendor`);
    if (typeof m.idx !== "number" || m.idx < 0 || m.idx > 100) errors.push(`Model ${m.id} idx 非法: ${m.idx}`);
    if (!RORDER.includes(m.r)) errors.push(`Model ${m.id} 稀有度非法: ${m.r}`);
    if (m.quota != null && (m.quota % TASK_TOKENS !== 0)) errors.push(`Model ${m.id} quota 非 ${TASK_TOKENS} 倍数: ${m.quota}`);
  }
  for (const [k, p] of Object.entries(POOLS)) {
    const sum = Object.values(p.rates || {}).reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1) > 0.001) errors.push(`Pool ${k} rates 和非1: ${sum}`);
    for (const fid of p.featured || []) if (!MMAP[fid]) errors.push(`Pool ${k} featured 不存在: ${fid}`);
    for (const lid of p.limited || []) if (!MMAP[lid]) errors.push(`Pool ${k} limited 不存在: ${lid}`);
  }
  for (const r of RORDER) if (!RARITY[r]) errors.push(`RARITY 缺 ${r}`);
  if (MILESTONES.length === 0) errors.push("MILESTONES 为空");
  // 单调递增
  for (let i = 1; i < MILESTONES.length; i++) if (MILESTONES[i].at <= MILESTONES[i-1].at) errors.push(`MILESTONES 非递增: ${MILESTONES[i-1].id} -> ${MILESTONES[i].id}`);
  return { ok: errors.length === 0, errors };
}

// 浏览器启动自检（失败仅 console.error，不阻断）
try {
  const res = validateConfig();
  if (!res.ok) console.error("[validate] config errors:", res.errors);
  else console.debug("[validate] config ok", { models: MODELS.length, pools: Object.keys(POOLS).length, milestones: MILESTONES.length });
} catch (e) {
  console.error("[validate] exception", e);
}

// 暴露给 Node 单测（若支持 module.exports）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { validateConfig };
}
