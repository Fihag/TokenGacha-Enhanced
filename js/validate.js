/* ================================================================
   TokenGacha · 校验层 (validate.js)
   运行时轻量校验（浏览器）+ 导出供 Node 单测直接 import
   ================================================================ */
import { MODELS, POOLS, MMAP, RARITY, RORDER, MILESTONES, TASK_TOKENS } from "./config.js";

/**
 * 轻量校验 MODELS/RARITY/POOLS，供浏览器启动时自检
 * @returns {{ok:boolean, errors:string[]}}
 */
export function validateConfig() {
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
    else {
      const t = RARITY[m.r];
      if (m.idx < t.min || m.idx > t.max) errors.push(`Model ${m.id} 指数 ${m.idx} 不在 ${m.r} 档 ${t.min}~${t.max} 区间`);
    }
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
  // 单调递增（仅余额型 at 成就; 谓词型成就无 at）
  const ats = MILESTONES.filter(m => m.at != null);
  for (let i = 1; i < ats.length; i++) if (ats[i].at <= ats[i-1].at) errors.push(`MILESTONES 非递增: ${ats[i-1].id} -> ${ats[i].id}`);
  for (const m of MILESTONES) {
    if (m.at == null && typeof m.check !== "function") errors.push(`MILESTONES ${m.id} 既无 at 也无 check`);
  }
  return { ok: errors.length === 0, errors };
}

// 浏览器启动自检（失败仅 console.error，不阻断）；结果同时导出供数据页展示
export const validateResult = (() => {
  try {
    const res = validateConfig();
    if (!res.ok) console.error("[validate] config errors:", res.errors);
    else console.debug("[validate] config ok", { models: MODELS.length, pools: Object.keys(POOLS).length, milestones: MILESTONES.length });
    return res;
  } catch (e) {
    console.error("[validate] exception", e);
    return { ok: false, errors: [String(e)] };
  }
})();
