# TokenGacha · LLM API 抽卡模拟器

> 🎰 基于 [Animnia/TokenGacha](https://github.com/Animnia/TokenGacha) 衍生。原项目提供了核心玩法与设计框架，本项目在其基础上做了重构与内容扩展，感谢原作者。

**在线体验**:https://tokengacha.pages.dev

## 这是什么

一家虚构的「LLM API 中转站」——它不按量计费,只卖**盲盒**。你花真金白银(游戏货币)抽卡,抽到顶级模型还是电子垃圾全看命;抽到的模型卡会变成 token 额度,拿去接 vibe coding 私活变现,形成「抽卡 → 工作 → 赚钱 → 再抽卡」的循环

稀有度依据 [Artificial Analysis Intelligence Index v4.3](https://artificialanalysis.ai/evaluations/artificial-analysis-intelligence-index) 分档，模型数据取榜单 `intelligenceIndex` 真实值（卡面指数保留两位）。v4.3 相对旧 v4.1.1 为非均匀压缩（榜首 63.05 → 53.37），分段线按实测压缩曲线折算，档位分布与旧版基本一致

## 与原始项目的区别

本项目为深度重构版，亮点包括：

### 全新内容

- **UTR 超神话档位**(智能指数 ≥50.5):高于 UR 的新稀有度,专属红金配色与音效
- **限定活动卡池「限定池」**:每赛季 1 天自动轮换,到期自动换下一批限定模型(DeepSeek 赛季单抽已涨价至 ¥950,十连 ¥9025,卡面会显示划掉的原价)。赛季按 **DeepSeek V5 系列 → 神话回响 Claude Opus 6 / Gemini 4 Pro → 开源之光 GLM-6 / Qwen5 Max** 循环;100 抽大保底必出当期限定 UTR
- **限定卡加成**:使用限定模型接单,该单收入 **×2**（永久限定集，跨季不失效，删库赔偿不翻倍）
- **黑市双边做市**:除「求购」收卡（估值 ×1.10~~1.50 溢价）外,新增「挂单」买入侧——庄家每小时挂 3 单出货,定价随行就市（估值 ×0.9~~1.4）,余额可直接买卡,买卖均计入黑市成交任务
- **SSR→UR 跨厂商特批**:任意厂商 SSR×5 可合 1 张随机厂商 UR（UR+ 不再只能靠抽,高门槛合成路线）
- **工匠成就**:成就墙在 10 档余额里程碑之外新增谓词型成就——🔧 工匠入门（累计合成 10 次）与 ⭐ 铸星者（累计升星 5 次）
- **赛季统计**:限定池卡面实时显示本赛季已抽数/大保底剩余/限定已出张数;数据页新增「交易工坊统计」卡（累计合成/升星/最近产出/黑市买卖笔数）
- **每日签到**:21 天循环奖励 ¥200 → ¥5000,断签重置，曲线更平滑
  - **日常任务**:抽卡 100 次 / 工作 300 单 / 日入 ¥18000 / 合成 2 次 / 黑市成交 2 单，每日 0 点（+08）刷新
  - **皮肤系统**:6 套主题(经典蓝/暗夜紫/赛博霓虹/金色传说/粉甜梦境/**薄荷白茶**),抽卡 1.5% 概率掉落,皮肤券可兑换
  - **数据分析页**:抽卡分布柱状图、余额走势折线图（悬浮/长按显值+范围）、稀有度占比环形图、图鉴进度、厂商分布,全部 canvas 手绘，支持 CSV 导出

### 模型与数值更新

- 模型库扩充至 **70 个**(新增 Claude Fable 5.1、GPT-6 Astra、Muse Spark 1.3、GLM-5.3-Flash、Gemini 3.8 Flash、Qwen3.8-Flash-Next、DeepSeek V4.1 Flash),全卡池切换到 AA v4.3 标定:52 张有榜单出处的卡取真实分数,6 张自创限定卡与 4 张非榜单国产卡按压缩曲线折算,稀有度分段同步重划为 UTR≥50.5 / UR 38.3-50.5 / SSR 32-38.3 / SR 26-32 / R 15-26 / N<15(卡面指数保留两位)
- DeepSeek V4 Flash 拆分为 **Preview(R)** 与 **0731** 两张卡
- 卡池概率、价格、回本率全部按概率公式重新计算并公示

### 工程重构

- 单文件 1425 行拆分为 **21 个 ES Module**（`config`+`validate`+`fx`+`state`+`economy`+`core`+`craft`+`market`+`banner`+`daily`+`skins`+`analytics`+`track`+`ui/{router,render,gacha,work,modals,share,boot}`）,由 `js/main.js` 统一入口按序初始化;`ui.js` 1233 行巨石已拆为 7 子模块,逻辑层剥离 UI 副作用（合成/黑市/签到返回结果,音效渲染归调用方）
- 存档升级至 v4，旧存档自动迁移；`config` 新增 JSDoc + `validate.js` 运行时校验（结果展示于数据页页脚）;工作事件概率/倍率收敛到 `economy.payoutParams` 单一数据源（`core.taskPayout` 抽样与 `expectedTaskPay` 期望同源）
- 本地化测试与 lint 基建:`npm test` **115 用例**,其中保底/消耗/合成/黑市/存档迁移链为直接 import 的真函数级测试;`sw.js` 资产清单由 `npm run sync:sw` 从模块图自动生成（缓存版本号跟随 package.json）;埋点统一走 `js/track.js`（配置 `TG_CF_TOKEN` 后转发 Cloudflare Web Analytics,留空零网络请求）

## 玩法速览

| 卡池         | 价格                                                                                        | 特点                             |
| ------------ | ------------------------------------------------------------------------------------------- | -------------------------------- |
| 青铜盲盒     | ¥30 / 十连 ¥285                                                                             | 新手体验,额度减半                |
| 白银盲盒     | ¥150 / 十连 ¥1425                                                                           | 主力卡池,期望回本率最高          |
| 王者盲盒     | ¥500 / 十连 ¥4750                                                                           | 不出 N 垃圾,UR 5.5%              |
| 限定池(轮换) | DeepSeek 赛季 ¥950(原¥900)/¥9025(原¥8600)；神话回响赛季 ¥900/¥8550；开源之光赛季 ¥900/¥8550 | 限定 UP,100 抽大保底必出当期限定 |

- 普通池 60 抽(青铜盲盒 50 抽)无 SSR+ 触发保底(80% SSR / 20% UR),限定池 100 抽大保底;十连必出 SR+
- 工作收入 = 模型报价 × 事件倍率(大成功 ×2.5 / 返工 ×0.4 / 删库赔 ¥65)
- 约 7 成玩家最终破产——庄家永远赢,除非……你抽到那张卡

## 技术栈

纯前端,零构建可双击运行；开发期可选工具链（不影响产出）：

```
index.html            页面骨架
css/style.css         全局样式（外置，原内联 450 行已拆分）
js/config.js          数据层:模型/卡池/皮肤/任务定义（JSDoc + zod 校验）
js/validate.js        运行时校验（MODELS/RARITY/POOLS）
js/fx.js              特效层:图标 CDN/音效/粒子
js/state.js           存档(v4) + 通用工具（S 全局，迁移集中）
js/economy.js         经济层:期望计算/估值/回本率（纯函数）
js/core.js            抽卡/工作核心逻辑
js/craft.js           合成台（同厂商 3 合 1 + 5 升星）
js/market.js          黑市双边做市（求购 6 槽+挂单 3 槽/1h 刷新）
js/ui/router.js       路由
js/ui/render.js       购买/工作/余额/成就/头部渲染
js/ui/gacha.js        抽卡流程 + 模拟抽卡器
js/ui/work.js         工作流（批量 + 自动）
js/ui/modals.js       弹窗/彩蛋/销毁
js/ui/share.js        分享/充值/概率/图鉴弹窗
js/ui/boot.js         事件绑定 + 启动
js/banner.js          限定活动池
js/daily.js           签到/日常任务
js/skins.js           皮肤系统
js/analytics.js       数据图表（含悬浮/长按数值）
js/track.js           埋点（console + 可选 Cloudflare Web Analytics）
js/main.js            ES Module 统一入口（启动序列与定时器集中于此）
tools/sync-sw.mjs     sw.js 资产清单生成器（npm run sync:sw）
standalone.html       单文件离线版产物（双击即玩,由 tools/build-standalone.mjs 生成）
tests/                单测（vitest, 115 用例含真函数级行为测试）
```

## 本地运行

**双击即玩**:直接打开根目录的 `standalone.html`（单文件离线版,全部模块与样式已内联,存档存于 localStorage,与在线版通用）。

开发/部署用 `index.html`（ES Module 版,需 HTTP 访问,`file://` 直开会显示引导提示）:

```bash
npm run dev
# 或任意静态服务器
npx serve .
python -m http.server 8123
```

```bash
npx serve .
# 或
python -m http.server 8123
```

开发校验（可选，不影响线上）：

```bash
npm install
npm run lint      # eslint
npm test          # vitest 115 用例
npm run format    # prettier
npm run sync:sw   # 发版前同步 sw.js 资产清单与缓存版本
npm run build:standalone  # 改完 js 后重新生成 standalone.html 离线版
```

## 许可证

本项目为 [Animnia/TokenGacha](https://github.com/Animnia/TokenGacha)(Apache-2.0)的衍生作品,继续遵循 **Apache License 2.0**。

模型图标来自 [@lobehub/icons](https://lobehub.com/icons),智能指数参考 [Artificial Analysis](https://artificialanalysis.ai)。
