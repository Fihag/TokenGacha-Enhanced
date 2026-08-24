# TokenGacha · LLM API 抽卡模拟器

> 🎰 基于 [Animnia/TokenGacha](https://github.com/Animnia/TokenGacha) 衍生。原项目提供了核心玩法与设计框架，本项目在其基础上做了重构与内容扩展，感谢原作者。

**在线体验**:https://tokengacha.pages.dev

## 这是什么

一家虚构的「LLM API 中转站」——它不按量计费,只卖**盲盒**。你花真金白银(游戏货币)抽卡,抽到顶级模型还是电子垃圾全看命;抽到的模型卡会变成 token 额度,拿去接 vibe coding 私活变现,形成「抽卡 → 工作 → 赚钱 → 再抽卡」的循环

稀有度依据 [Artificial Analysis Intelligence Index v4.1.1](https://artificialanalysis.ai/evaluations/artificial-analysis-intelligence-index) 分档，模型数据为实测/估算智能指数

## 与原始项目的区别

本项目为深度重构版，亮点包括：

### 全新内容

- **UTR 超神话档位**(智能指数 ≥64):高于 UR 的新稀有度,专属红金配色与音效
- **限定活动卡池「限定池」**:每赛季 1 天自动轮换,到期自动换下一批限定模型(DeepSeek 赛季单抽已涨价至 ¥950,十连 ¥9025,卡面会显示划掉的原价)。赛季按 **DeepSeek V5 系列 → 神话回响 Claude Opus 6 / Gemini 4 Pro → 开源之光 GLM-6 / Qwen5 Max** 循环;100 抽大保底必出当期限定 UTR
- **限定卡加成**:使用限定模型接单,该单收入 **×2**（永久限定集，跨季不失效，删库赔偿不翻倍）
- **每日签到**:21 天循环奖励 ¥200 → ¥5000,断签重置，曲线更平滑
  - **日常任务**:抽卡 100 次 / 工作 300 单 / 日入 ¥18000 / 合成 2 次 / 黑市成交 2 单，每日 0 点（+08）刷新
  - **皮肤系统**:6 套主题(经典蓝/暗夜紫/赛博霓虹/金色传说/粉甜梦境/**薄荷白茶**),抽卡 1.5% 概率掉落,皮肤券可兑换
  - **数据分析页**:抽卡分布柱状图、余额走势折线图（悬浮/长按显值+范围）、稀有度占比环形图、图鉴进度、厂商分布,全部 canvas 手绘，支持 CSV 导出

### 模型与数值更新

- 模型库扩充至 **63 个**(新增 Grok 4.6、Muse Spark 1.1/1.2、Gemini 3.7 Flash、DeepSeek V4 Pro 0813、Qwen3.8 27B、限定 Claude Opus 6 / Gemini 4 Pro / GLM-6 / Qwen5 Max、GLM-5.3 及 9 张 R 档补强卡等),智能指数按 2026-08 最新数据校准(卡面指数取整显示)
- DeepSeek V4 Flash 拆分为 **Preview(R)** 与 **0731** 两张卡
- 卡池概率、价格、回本率全部按概率公式重新计算并公示

### 工程重构

- 单文件 1425 行拆分为 **19 个模块化 JS 文件**（`config`+`validate`+`fx`+`state`+`economy`+`core`+`craft`+`market`+`ui/{router,render,gacha,work,modals,share,boot}`+`banner`+`daily`+`skins`+`analytics`）+ `css/style.css` 外置样式，`ui.js` 1233 行巨石已拆为 7 子模块，`state` 经济计算已抽至 `economy.js`
- 存档升级至 v4，旧存档自动迁移；`config` 新增 JSDoc + `validate.js` 运行时校验（`zod` 仅单测），`state`/`core` 通过全局 `S` 解耦（`economy` 纯函数化）
- 新增本地化单测与 lint 基建（`npm test` 82 用例覆盖 `config/economy/gameplay/validate` + `npm run lint`），`banner/skins/analytics/ui` 已补 8+ 用例，`ui` 拆分后 `renderBalance` 单函数 <180 行

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
js/market.js          黑市做市（6 槽/1h 刷新/1.10-1.50×溢价）
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
js/analytics.js       数据图表 + 启动（含悬浮/长按数值）
tests/                单测（vitest, 82 用例覆盖 config/economy/gameplay/validate 等）
```

## 本地运行

直接双击打开 `index.html` 即可(存档存于 localStorage)。或用任意静态服务器:

```bash
npx serve .
# 或
python -m http.server 8123
```

开发校验（可选，不影响线上）：

```bash
npm install
npm run lint      # eslint
npm test          # vitest 82 用例
npm run format    # prettier
```

## 许可证

本项目为 [Animnia/TokenGacha](https://github.com/Animnia/TokenGacha)(Apache-2.0)的衍生作品,继续遵循 **Apache License 2.0**。

模型图标来自 [@lobehub/icons](https://lobehub.com/icons),智能指数参考 [Artificial Analysis](https://artificialanalysis.ai)。
