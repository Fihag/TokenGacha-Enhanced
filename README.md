# TokenGacha-Enhanced · LLM API 抽卡模拟器

> 🎰 基于 [Animnia/TokenGacha](https://github.com/Animnia/TokenGacha) 开发的增强版。原项目是核心玩法与设计框架的来源,本项目在其基础上重构了代码结构并新增大量功能,感谢原作者提供的代码

**在线体验**:https://tokengacha.pages.dev

## 这是什么

一家虚构的「LLM API 中转站」——它不按量计费,只卖**盲盒**。你花真金白银(游戏货币)抽卡,抽到顶级模型还是电子垃圾全看命;抽到的模型卡会变成 token 额度,拿去接 vibe coding 私活变现,形成「抽卡 → 工作 → 赚钱 → 再抽卡」的循环

稀有度依据 [Artificial Analysis Intelligence Index v4.1](https://artificialanalysis.ai/evaluations/artificial-analysis-intelligence-index) 分档,模型数据为实测/估算智能指数

## 与原始项目的区别

本项目为深度重构版,亮点包括:

### 全新内容
- **UTR 超神话档位**(智能指数 ≥64):高于 UR 的新稀有度,专属红金配色与音效
- **限定活动卡池「限定池」**:每赛季 1 天自动轮换,到期自动换下一批限定模型(DeepSeek 赛季单抽已涨价至 ¥900,十连 ¥8600,卡面会显示划掉的原价)。赛季按 **DeepSeek V5 系列 → 神话回响 Claude Opus 6 / Gemini 4 Pro** 循环;100 抽大保底必出当期限定 UTR
- **限定卡加成**:使用限定模型接单,该单收入 **×2**(删库赔偿不翻倍)
- **每日签到**:21 天循环奖励 ¥200 → ¥10000,断签重置
- **日常任务**:抽卡 100 次 / 工作 800 单 / 日入 ¥25000,每日 0 点刷新
- **皮肤系统**:5 套主题(经典蓝/暗夜紫/赛博霓虹/金色传说/粉甜梦境),抽卡 1.5% 概率掉落,皮肤券可兑换
- **数据分析页**:抽卡分布柱状图、余额走势折线图、稀有度占比环形图、图鉴进度、厂商分布,全部 canvas 手绘

### 模型与数值更新
- 模型库扩充至 **61 个**(新增 Grok 4.6、Muse Spark 1.1/1.2、Gemini 3.7 Flash、DeepSeek V4 Pro 0813、Qwen3.8 27B、限定 Claude Opus 6 / Gemini 4 Pro、神秘 NB 神卡 Fihag V1、GLM-5.3 及 9 张 R 档补强卡等),智能指数按 2026-08 最新数据校准(卡面指数取整显示)
- DeepSeek V4 Flash 拆分为 **Preview(R)** 与 **0731** 两张卡
- 卡池概率、价格、回本率全部按概率公式重新计算并公示

### 工程重构
- 单文件 1425 行拆分为 **9 个模块化 JS 文件**(config / fx / state / core / ui / banner / daily / skins / analytics)
- 存档升级至 v4,旧存档自动迁移

## 玩法速览

| 卡池 | 价格 | 特点 |
|---|---|---|
| 青铜盲盒 | ¥30 / 十连 ¥285 | 新手体验,额度减半 |
| 白银盲盒 | ¥150 / 十连 ¥1425 | 主力卡池,期望回本率最高 |
| 王者盲盒 | ¥500 / 十连 ¥4700 | 不出 N 垃圾,UR 5.5% |
| 限定池(轮换) | DeepSeek 赛季 ¥900(原¥800)/¥8600(原¥7600)；神话回响赛季 ¥800/¥7600 | 限定 UP,100 抽大保底必出当期限定 |

- 普通池 60 抽(青铜盲盒 50 抽)无 SSR+ 触发保底(80% SSR / 20% UR),限定池 100 抽大保底;十连必出 SR+
- 工作收入 = 模型报价 × 事件倍率(大成功 ×2.5 / 返工 ×0.4 / 删库赔 ¥65)
- 约 7 成玩家最终破产——庄家永远赢,除非……你抽到那张卡

## 技术栈

纯前端,无构建步骤,无依赖:

```
index.html            页面骨架 + 样式
js/config.js          数据层:模型/卡池/皮肤/任务定义
js/fx.js              特效层:图标 CDN/音效/粒子
js/state.js           存档(v4)+ 期望计算 + 回本率
js/core.js            抽卡/工作核心逻辑
js/ui.js              渲染/路由/弹窗/事件
js/banner.js          限定活动池
js/daily.js           签到/日常任务
js/skins.js           皮肤系统
js/analytics.js       数据图表 + 启动
```

## 本地运行

直接双击打开 `index.html` 即可(存档存于 localStorage)。或用任意静态服务器:

```bash
npx serve .
# 或
python -m http.server 8123
```

## 许可证

本项目为 [Animnia/TokenGacha](https://github.com/Animnia/TokenGacha)(Apache-2.0)的衍生作品,继续遵循 **Apache License 2.0**。

模型图标来自 [@lobehub/icons](https://lobehub.com/icons),智能指数参考 [Artificial Analysis](https://artificialanalysis.ai)。
