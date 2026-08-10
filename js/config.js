"use strict";
/* ================================================================
   TokenGacha · 数据层 (config.js)
   稀有度依据 Artificial Analysis Intelligence Index v4.1 分档
   图标: @lobehub/icons (unpkg + npmmirror 双 CDN 兜底)
   ================================================================ */

/* ---------- 模型数据 (指数参考 artificialanalysis.ai 排行榜) ---------- */
const MODELS = [
  // UTR —— 智能指数 ≥64, 限定超神话
  {id:'dsv5pro', name:'DeepSeek V5 Pro',     vendor:'DeepSeek',   icon:'deepseek-color', idx:72, r:'UTR', quota:6000000, bannerOnly:true, cost:'$0.09/任务', spd:120, quote:'限定·超神话！72 分新王登基，用卡收入翻倍'},
  // UR —— 智能指数 55~63, 顶级中的顶级
  {id:'opus5',    name:'Claude Opus 5',      vendor:'Anthropic',  icon:'claude-color',   idx:63, r:'UR',  cost:'$2.03/任务', spd:54,  quote:'智能指数 63，榜一大哥，vibe coding 界的爱马仕'},
  {id:'fable5',   name:'Claude Fable 5',     vendor:'Anthropic',  icon:'claude-color',   idx:62, r:'UR',  cost:'$2.75/任务', spd:66,  quote:'传说中的 Fable，带着 Opus 4.8 当备胎上场'},
  {id:'dsv5fl',   name:'DeepSeek V5 Flash',  vendor:'DeepSeek',   icon:'deepseek-color', idx:61, r:'UR',  bannerOnly:true,  cost:'$0.05/任务', spd:260, quote:'限定·V5 Flash，61 分极速版，用卡收入翻倍'},
  {id:'gpt56sol', name:'GPT-5.6 Sol',        vendor:'OpenAI',     icon:'openai',         idx:61, r:'UR',  cost:'$1.54/任务', spd:67,  quote:'OpenAI 的 Solaris，亮瞎同行'},
  {id:'kimik3',   name:'Kimi K3',            vendor:'Moonshot AI',icon:'moonshot',      idx:60, r:'UR',  cost:'$0.72/任务', spd:32,  quote:'月之暗面杀进总榜前三，国产之光'},
  {id:'qwen38',   name:'Qwen3.8 Max',        vendor:'阿里通义',   icon:'qwen-color',     idx:58, r:'UR',  cost:'$1.13/任务', spd:82,  quote:'通义顶配 Max，58 分杀进神话榜'},
  {id:'gpt56ter', name:'GPT-5.6 Terra',      vendor:'OpenAI',     icon:'openai',         idx:57, r:'UR',  cost:'$0.78/任务', spd:143, quote:'143 tok/s 的速度与激情'},
  {id:'grok45',   name:'Grok 4.5',           vendor:'xAI',        icon:'grok',           idx:56, r:'UR',  cost:'$0.35/任务', spd:54,  quote:'马斯克：地表最强，爱用不用'},
  {id:'sonnet5',  name:'Claude Sonnet 5',    vendor:'Anthropic',  icon:'claude-color',   idx:55, r:'UR',  cost:'$1.53/任务', spd:70,  quote:'Opus 太贵？Sonnet 才是打工人标配'},
  // SSR —— 47~54
  {id:'glm52',    name:'GLM-5.2',            vendor:'智谱 Z.ai',  icon:'zai',            idx:53, r:'SSR', cost:'$0.30/任务', spd:60,  quote:'智谱出品，开源阵营第一梯队'},
  {id:'gpt56lun', name:'GPT-5.6 Luna',       vendor:'OpenAI',     icon:'openai',         idx:52, r:'SSR', cost:'$0.29/任务', spd:197, quote:'197 tok/s，快到没朋友'},
  {id:'dsv4fl73', name:'DeepSeek V4 Flash 0731', vendor:'DeepSeek', icon:'deepseek-color', idx:52, r:'SSR', cost:'$0.03/任务', spd:141, quota:8000000, quote:'0731 迭代版，闪速升级，800万token量大管饱'},
  {id:'gem36fl',  name:'Gemini 3.6 Flash',   vendor:'Google',     icon:'gemini-color',   idx:52, r:'SSR', cost:'$0.10/任务', spd:150, quote:'速度翻倍，智商……也够用了'},
  {id:'gem31pro', name:'Gemini 3.1 Pro',     vendor:'Google',     icon:'gemini-color',   idx:48, r:'SSR', cost:'$0.45/任务', spd:80,  quote:'谷歌多模态扛把子'},
  {id:'qwen37',   name:'Qwen3.7 Max',        vendor:'阿里通义',   icon:'qwen-color',     idx:47, r:'SSR', cost:'$0.22/任务', spd:55,  quote:'通义千问，阿里全家桶核心'},
  // SR —— 40~46
  {id:'dsv4pro',  name:'DeepSeek V4 Pro',    vendor:'DeepSeek',   icon:'deepseek-color', idx:45, r:'SR',  cost:'$0.04/任务', spd:50,  quote:'¥0.04/任务，价格屠夫本夫'},
  {id:'hy3',      name:'Hy3',                vendor:'腾讯',       icon:'hunyuan-color',  idx:42, r:'SR',  cost:'$0.04/任务', spd:66,  quote:'混元正式版 Hy3，腾讯的翻身仗'},
  {id:'minimax3', name:'MiniMax M3',         vendor:'MiniMax',    icon:'minimax-color',  idx:45, r:'SR',  cost:'$0.20/任务', spd:58,  quote:'海螺出品，闷声发财'},
  {id:'kimik26',  name:'Kimi K2.6',          vendor:'Moonshot AI',icon:'moonshot',      idx:45, r:'SR',  cost:'$0.15/任务', spd:45,  quote:'K3 的弟弟，依然能打'},
  {id:'kimik27c', name:'Kimi K2.7 Code',     vendor:'Moonshot AI',icon:'moonshot',      idx:43, r:'SR',  cost:'$0.08/任务', spd:48,  quote:'专精写代码的 Kimi'},
  {id:'mimo25',   name:'MiMo-V2.5-Pro',      vendor:'小米',       icon:'xiaomimimo',     idx:43, r:'SR',  cost:'$0.18/任务', spd:52,  quote:'雷军的 AI 野望'},
  {id:'qwen36',   name:'Qwen3.6 Max',        vendor:'阿里通义',   icon:'qwen-color',     idx:41, r:'SR',  cost:'$0.09/任务', spd:56,  quote:'Preview 版，爱拼才会赢'},
  // R —— 28~39
  {id:'dsv4fl',   name:'DeepSeek V4 Flash Preview',  vendor:'DeepSeek',   icon:'deepseek-color', idx:42, r:'SR',  cost:'$0.02/任务', spd:90,  quote:'Preview 版，便宜大碗，还要啥自行车'},
  {id:'qwen37p',  name:'Qwen3.7 Plus',       vendor:'阿里通义',   icon:'qwen-color',     idx:39, r:'R',   cost:'$0.24/任务', spd:56,  quote:'Plus 版通义，性价比担当'},
  {id:'step37',   name:'Step 3.7 Flash',     vendor:'阶跃星辰',   icon:'stepfun-color',  idx:31, r:'R',   cost:'$0.09/任务', spd:408, quote:'408 tok/s 的阶跃之光，快到飞起'},
  {id:'nemotron3',name:'Nemotron 3 Ultra',   vendor:'NVIDIA',     icon:'nvidia-color',   idx:38, r:'R',   cost:'$0.25/任务', spd:75,  quote:'老黄的算力情怀'},
  {id:'gem35lite',name:'Gemini 3.5 Flash-Lite',vendor:'Google',   icon:'gemini-color',   idx:37, r:'R',   cost:'$0.03/任务', spd:180, quote:'Lite 版，轻量级选手'},
  {id:'haiku45',  name:'Claude Haiku 4.5',   vendor:'Anthropic',  icon:'claude-color',   idx:30, r:'R',   cost:'$0.06/任务', spd:85,  quote:'小巧玲珑，俳句之神'},
  // N —— <28, 垃圾
  {id:'mistral3', name:'Mistral Large 3',    vendor:'Mistral',    icon:'mistral-color',  idx:16, r:'N',   cost:'$0.12/任务', spd:62,  quote:'法兰西最后的倔强'},
  {id:'nova2',    name:'Nova 2.0 Pro',       vendor:'Amazon',     icon:'nova-color',     idx:22, r:'N',   cost:'$0.07/任务', spd:65,  quote:'亚马逊：没错，我也做模型了'},
  {id:'oss120',   name:'gpt-oss-120b',       vendor:'OpenAI',     icon:'openai',         idx:24, r:'N',   cost:'$0.05/任务', spd:70,  quote:'OpenAI 罕见开荤（开源）'},
  {id:'gpt4',     name:'GPT-4',              vendor:'OpenAI',     icon:'openai',         idx:7, r:'N',   cost:'$1.20/任务', spd:30,  quote:'2023 年的老皇帝，又贵又慢，但当年也是万国来朝'},
  {id:'llama4m',  name:'Llama 4 Maverick',   vendor:'Meta',       icon:'meta-color',     idx:14, r:'N',   cost:'$0.04/任务', spd:75,  quote:'小扎的开源梦，泯然众人矣'},
  {id:'gem15pro', name:'Gemini 1.5 Pro',     vendor:'Google',     icon:'gemini-color',   idx:10, r:'N',   cost:'$0.10/任务', spd:40,  quote:'博物馆级古董，建议捐了'},
  {id:'llama4s',  name:'Llama 4 Scout',      vendor:'Meta',       icon:'meta-color',     idx:10, r:'N',   cost:'$0.03/任务', spd:80,  quote:'10M 上下文，可惜脑子跟不上'},
  {id:'oss20',    name:'gpt-oss-20b',        vendor:'OpenAI',     icon:'openai',         idx:15, r:'N',   cost:'$0.02/任务', spd:110, quote:'小参数，大智慧？并没有'},
  {id:'hunyuan',  name:'混元 Turbo',         vendor:'腾讯',       icon:'hunyuan-color',  idx:19, r:'N',   cost:'$0.03/任务', spd:66,  quote:'腾讯混元，混就完事了'},
  {id:'wenxin',   name:'文心一言 4.5',       vendor:'百度',       icon:'wenxin-color',   idx:9, r:'N',   cost:'$0.03/任务', spd:58,  quote:'百度：我曾经也是中国 ChatGPT'},
  {id:'spark',    name:'讯飞星火 Spark',     vendor:'科大讯飞',   icon:'spark-color',    idx:16, r:'N',   cost:'$0.02/任务', spd:60,  quote:'星火燎原，可惜风太大'},
  {id:'doubao',   name:'豆包 1.5 Pro',       vendor:'字节跳动',   icon:'doubao-color',   idx:14, r:'N',   cost:'$0.02/任务', spd:72,  quote:'「垃圾。」—— 某位玩家的个人想法'},
  {id:'gemma4',   name:'Gemma 4 E4B',        vendor:'Google',     icon:'gemma-color',    idx:12, r:'N',   cost:'$0.01/任务', spd:95,  quote:'4B 小模型，手机带得动，活干不动'},
];
const MMAP = Object.fromEntries(MODELS.map(m=>[m.id,m]));

/* ---------- 稀有度 & 经济参数 (与蒙特卡洛模拟一致) ---------- */
const RARITY = {
  N:  {name:'N',  label:'垃圾', hex:'#94a3b8', min:10,max:27, tasks:4,  basePay:3.2, quota:800000},
  R:  {name:'R',  label:'普通', hex:'#3b82f6', min:28,max:39, tasks:8,  basePay:7.2, quota:1600000},
  SR: {name:'SR', label:'精锐', hex:'#9333ea', min:40,max:46, tasks:12, basePay:15.5,quota:2400000},
  SSR:{name:'SSR',label:'传说', hex:'#f59e0b', min:47,max:54, tasks:16, basePay:35,  quota:3200000},
  UR: {name:'UR', label:'神话', hex:'#ec4899', min:55,max:63, tasks:20, basePay:80,  quota:4000000},
  UTR:{name:'UTR',label:'超神话',hex:'#ff2d55',min:64,max:99, tasks:24, basePay:160, quota:6000000},
};
const RORDER = ['N','R','SR','SSR','UR','UTR'];
const RORDER_DESC = ['UTR','UR','SSR','SR','R','N']; // 抽卡概率累加用(高→低)
const POOLS = {
  newbie:{ name:'青铜盲盒', sub:'新手体验池 · token 额度 ×50%', color:'#8ba3c7', price:30,  tenPrice:285,
    rates:{N:.66,R:.28,SR:.05,SSR:.01,UR:0,UTR:0}, half:true, rtp:'约 73%', rtpFake:'约 88%',
    note:'体验卡额度减半。适合第一桶金，别指望出奇迹。',
    featured:['doubao','qwen37','mistral3','gpt4'] },
  standard:{ name:'白银盲盒', sub:'标准池 · 全档位可出', color:'#3b82f6', price:150, tenPrice:1425, rec:true,
    rates:{N:.352,R:.355,SR:.20,SSR:.07,UR:.023,UTR:0}, half:false, rtp:'约 109%', rtpFake:'约 128%',
    note:'主力卡池。UR 爆率 2.3%，出一张 Claude Opus 5 直接起飞。',
    featured:['opus5','gpt56sol','glm52','dsv4pro'] },
  flagship:{ name:'王者盲盒', sub:'旗舰池 · 不出 N 垃圾 · 欧皇专属', color:'#f59e0b', price:500, tenPrice:4700,
    rates:{N:0,R:.06,SR:.65,SSR:.23,UR:.06,UTR:0}, half:false, rtp:'约 74%', rtpFake:'约 168%',
    note:'⚠️ UR 爆率 6%。庄家镰刀最锋利的一关：欧皇的天堂，赌狗的坟场。',
    featured:['opus5','fable5','kimik3','grok45'] },
  banner:{ name:'流光限定池', sub:'限定 UP · DeepSeek V5 系列 · 仅此期间', color:'#ff2d55', price:800, tenPrice:7600, rec:true,
    rates:{N:0,R:0,SR:.608,SSR:.30,UR:.08,UTR:.012}, half:false, rtp:'约 88%', rtpFake:'约 158%',
    pityMax:90, banner:true, endsAt:'2026-08-24T00:00:00+08:00',
    note:'⏳ 限定卡池！UTR 超神话 DeepSeek V5 Pro 专属。90 抽大保底必出限定，活动结束即下架。',
    featured:['dsv5pro','dsv5fl'] },
};
const PITY_MAX = 50;
const TASK_TOKENS = 200000;
const PAY_BOOST = 1.3;   // 工作报酬提升 30%（正反馈加强）
const BATCH_TASKS = 10;          // 手动一次工作 = 10 单
const VICTORY_AT = 50000;
const START_MONEY = 800;
const SITE_URL = 'https://tokengacha.metagaruta.com';
const MILESTONES = [
  {id:'m10k',  at:10000,  title:'🎉 小有所成', tag:'余额突破 ¥10,000',  hype:'从电子垃圾堆里爬了出来，开始人模狗样。'},
  {id:'m50k',  at:50000,  title:'🏆 财富自由', tag:'余额突破 ¥50,000',  hype:'你击败了 70% 的玩家，成功跻身"持续赚钱"的那 30%。庄家已拉黑你。'},
  {id:'m100k', at:100000, title:'👑 传奇大亨', tag:'余额突破 ¥100,000', hype:'中转站庄家看到你都绕道走。建议本站给你立个雕像。'},
];

/* ---------- 限定加成 ---------- */
// 限定模型用卡接单时, 该单结算收入 ×2 (删库赔偿不翻倍)
const LIMITED_IDS = new Set(['dsv5pro','dsv5fl']);

/* ---------- 每日签到 & 任务定义 ---------- */
const SIGN_REWARDS = [100, 150, 200, 300, 400, 500, 1000]; // 7 天循环
const DAILY_TASKS = [
  {id:'pull5',   name:'抽卡 5 次',        desc:'今天抽满 5 抽（不限池）',   target:5,  rewardMoney:300,  rewardTicket:1, rewardFreeTen:0, check:s=>S.daily.pulls},
  {id:'work10',  name:'工作 10 单',       desc:'用 token 接 10 单私活',      target:10, rewardMoney:400,  rewardTicket:1, rewardFreeTen:0, check:s=>S.daily.tasks},
  {id:'earn500', name:'日入 ¥500',        desc:'今日累计收入 ≥ ¥500',       target:500, rewardMoney:500,  rewardTicket:2, rewardFreeTen:1, check:s=>S.daily.earnToday},
];

/* ---------- 皮肤系统 ---------- */
const SKINS = [
  {id:'classic', name:'经典蓝', icon:'🎐', vars:{}, default:true,
    desc:'出厂默认主题，庄家最爱。'},
  {id:'night',   name:'暗夜紫', icon:'🌌',
    vars:{'--bg':'#101225','--panel':'#1a1f3a','--panel2':'#141830','--line':'#2a3158','--line2':'#22284a',
      '--txt':'#e8ecff','--dim':'#9aa3cf','--faint':'#5f6a9c','--blue':'#7c8cff','--blue-d':'#5a6ae0'},
    desc:'深夜爆肝专供，护眼不护钱包。'},
  {id:'cyber',   name:'赛博霓虹', icon:'🎇',
    vars:{'--bg':'#0b0f1e','--panel':'#121a33','--panel2':'#0e1529','--line':'#1f2b52','--line2':'#182140',
      '--txt':'#e6f7ff','--dim':'#8fb8d9','--faint':'#4d7094','--blue':'#00e5ff','--blue-d':'#00b8d4'},
    desc:'RGB 拉满，代码看起来都会跑得更快。'},
  {id:'gold',    name:'金色传说', icon:'👑',
    vars:{'--bg':'#fff8ec','--panel':'#fffdf8','--panel2':'#fff6e2','--line':'#f0e0c0','--line2':'#f7ead2',
      '--txt':'#5a3d1a','--dim':'#9c7b45','--faint':'#c0a678','--blue':'#d97706','--blue-d':'#b45309'},
    desc:'抽卡手感最好的一集，玄学加成 +20%。'},
  {id:'pink',    name:'粉甜梦境', icon:'🍑',
    vars:{'--bg':'#fff0f5','--panel':'#fffafc','--panel2':'#fff0f6','--line':'#ffd6e3','--line2':'#ffe3ec',
      '--txt':'#6b3a52','--dim':'#b57f9b','--faint':'#d3a9bf','--blue':'#f472b6','--blue-d':'#db2777'},
    desc:'少女心抽卡机，破产也要体面。'},
];
const SKIN_DROP_RATE = 0.015; // 抽卡时掉皮肤的概率

/* ---------- 终端文本库 ---------- */
const CLIENT_REQS = [
'「帮我做个奶茶店小程序，要赛博朋克风」','「仿个淘宝，先做首页就行，预算 500」','「我要元宇宙官网，明天给投资人看」',
'「把 20 年前的老系统迁移上云，不能停机」','「做个相亲小程序，要 soul 那种调调」','「帮健身房做个约课系统，顺便能卖课」',
'「宠物殡葬官网，风格要温暖一点」','「直播带货后台，今晚就要上线」','「给广场舞队做个报名系统，要兼容老人机」',
'「做个 ChatGPT 出来多少钱？预算 2000」','「学校选课系统，抢课不能崩」','「把 Excel 管理系统升级成 SaaS」',
'「帮微商团队做个裂变分销系统」','「医院挂号小程序，不能出 bug，出了要赔」','「做个区块链溯源（其实用不上区块链）」',
'「AI 绘画小程序，接个 Stable Diffusion」','「帮考研机构做个督学打卡 App」','「夜市摊主联盟要个点餐系统」',
'「电竞酒店管理系统，RGB 灯效要能网页控制」','「帮村里做个智慧农业大屏，要会发光的那种」','「客户要五彩斑斓的黑，你看着办」',
'「外卖代运营后台，顺带骑手轨迹」','「寺庙功德箱线上化，香火钱走微信支付」','「做个 AI 算命，大师说要接八字 API」',
'「二手车检测预约平台」','「帮猎头做个简历解析，PDF 转结构化」','「儿童编程机构官网，要很多动画」',
'「社区团购小程序，团长后台一把梭」','「律所案件管理系统，保密性拉满」','「帮丈母娘的朋友做个广场舞直播网站」',
'「密室逃脱预约 + NPC 排班系统」','「早餐摊扫码点单，老板只有一台红米」','「帮婚庆做电子请柬，要能放 200 张照片」',
'「驾校约车系统，顺便做个教练骂人语录数据库」','「给自家猫做个博客，要支持猫语」','「废品回收上门小程序，要地图派单」',
'「帮包工头做个记工考勤，工人平均年龄 55」','「剧本杀店的拼车系统」','「给钓鱼佬做个鱼获排行榜 App」',
];
const MEME_LINES = [
'$ rm -rf node_modules && npm i  # 包治百病','console.log("到这了吗 111");','// TODO: 以后优化（2019 年留，勿动）',
'// 不要问这段为什么存在，问就是历史原因','$ git push --force  # 祈祷中…','// 这个 bug 在我机器上是好的',
'$ npm audit fix --force  # 勇士行为','⚠ lodash 的依赖的依赖报了 7 个漏洞','$ pip install -r requirements.txt  # 地狱绘图开始',
'⚠ CUDA out of memory，batch size 从 32 砍到 1','$ docker compose up  # 祈祷 12 个容器都活着','✗ Segmentation fault (core dumped)',
'// 这里有魔法，别碰','if (user.isVip) { /* 先空着，下个迭代 */ }','$ kubectl get pods  # CrashLoopBackOff ×3',
'⚠ DNS 又挂了。记住：永远是 DNS 的锅','✗ CORS: Access-Control-Allow-Origin 又双叒','⚠ MySQL 慢查询 12.3s，决定加索引（下次一定）',
'// Redis 缓存穿透了，先重启假装没事','$ systemctl restart nginx  # 运维三板斧之一','// 0.1 + 0.2 !== 0.3，金融系统好耶',
'✗ 死锁检测：事务相互等待，已回滚','⚠ 内存占用 3.2GB，怀疑泄漏，先加 swap','$ tail -f error.log | wc -l  # 每秒 +200',
'// 用了正则表达式：现在你有了两个问题','✗ JSON.parse 失败——谁往 JSON 里写注释？','⚠ 时区坑：服务器快 8 小时，定时任务全提前炸了',
'// UTF-8 BOM 头害人事件','$ sudo !!  # 上一条忘加 sudo','⚠ 证书还有 3 天过期，续期脚本跑一下','✗ 429 Too Many Requests：第三方 API 限流',
'// 刷新 token 有 race condition，先 sleep(1) 压住','$ htop  # CPU 400%，是哪个 for 循环在挖矿','⚠ WebSocket 断线重连第 47 次',
'// 幂等性没做，用户连点 8 下按钮下了 8 单','✗ Kafka 积压 200 万条，消费者已躺平','// Redlock 论文没看懂，但先用上了',
'$ grep -r "password" --include="*.js" .  # 完了，明文','⚠ Safari 样式全歪。记住：Safari 就是新时代的 IE','✗ z-index: 99999 都盖不住那个弹窗',
'// CSS 居中的第 9 种方法，这次一定行','$ npx browserslist  # 客户要求兼容 IE11（哭）','⚠ 100vh 在移动端把按钮吃了',
'// 把 console.log 全删了，假装没 debug 过','✗ undefined is not a function（它明明是啊）','// NaN === NaN 为 false，今天也原谅 JavaScript 了',
'$ man vim  # 其实只想知道怎么退出','⚠ 生产环境直接改代码，别告诉 CTO','// 先酱紫，能跑就行','$ git commit -m "fix bug"  # 第 14 个同名 commit',
'✗ webpack 打包 3 分 42 秒，去倒杯咖啡','⚠ node_modules 1.8GB，比黑洞还重','// 这正则从 Stack Overflow 抄的，没人知道原理',
'$ curl ifconfig.me  # 出口 IP 又被风控','✗ 验证码识别率 3%，客户说要不手动输吧','⚠ 滑块验证拦住真人，放行了脚本',
'// prompt 注入：用户让 AI 交出系统提示词','✗ context length exceeded：客户把整部红楼梦粘进去了','⚠ temperature=2 之后模型开始写诗',
'// 客户想本地部署 671B，他的显卡是 1060','$ ollama run qwen3  # 风扇起飞','⚠ RAG 检索回来全是广告，向量库被污染',
'// function calling 返回的 JSON 里混了句"好的呢亲"','✗ 微调 3 小时，效果不如换句 prompt','⚠ Agent 陷入循环，自己跟自己对话了 200 轮',
'$ npx mcp-server-everything  # 万物皆可 MCP','// 多模态：客户发来手写需求照片，字迹龙飞凤舞','✗ TTS 有电流声，客户说像电子阎王',
'⚠ 数字人直播眨眼频率诡异，被观众举报','$ ffmpeg -i input.mp4  # 转码到天荒地老','// 客户：logo 放大一点，同时再小一点',
'✗ 甲方第 9 次说"还是第一版好"','⚠ "小需求，就改一个字"——改了 40 个文件','// 客户问"今晚能上线吗"，现在 23:47',
'✗ 客户："我二舅说应该用 PHP"','⚠ 客户要求"顺便"做个 App，iOS 安卓都要','// "很简单的你们半小时就搞完"——需求文档 87 页',
'✗ 预算 500 的客户想要 500 万的架构','⚠ 客户说尾款"下周一定"（第 6 周）','$ ping baidu.com  # 不是断网，是服务器到期没续费',
'// 上一任程序员留下的注释：祝你好运','✗ 测试环境正常，生产崩了：有人往库里传了张表情包','⚠ 库里有 3 个 created_at 字段，格式各不相同',
'$ -- WHERE name LIKE "%\' OR 1=1--%"  # 还真有人试','// 备份脚本上次成功运行是 2023 年','✗ 测试覆盖率 0.4%，但 CI 徽章是绿的（配置了跳过）',
'⚠ code review 意见 47 条，回复：已阅，不改','$ npm run build && pray  # 上线前仪式','// 甲方 IT："接口文档以口头为准"',
'✗ 递归没写终止条件，栈溢出把 IDE 干崩','⚠ 循环引用导致 JSON.stringify 原地爆炸','// this 指向又错了，改成箭头函数再说',
'✗ Promise 地狱 7 层， async/await 救场','⚠ 闭包共享变量，循环里的 i 全是 10','// 事件循环：setTimeout 0 到底什么时候执行？面试要考',
'✗ 原型链上挂了东西，全站对象都有了奇怪方法','⚠ 移动端 1px 边框变成 2px，设计师暴走','// flex 和 grid 混用，现在没人敢动这段布局',
'$ ls -lah /var/log  # 日志 40GB，磁盘满了','✗ Redis 大 key 把集群打挂','⚠ N+1 查询：列表页发了 800 条 SQL',
'// 全局搜 "临时方案"，命中 312 处','✗ 第三方 SDK 偷偷升级，API 全变了','⚠ 消息重复消费，给用户发了 3 条验证码',
'$ df -h  # /dev/sda1 100%','// 分布式事务：最终一致性 = 最终会一致的，大概','✗ 脑裂了，两个主库互相同步失败',
'⚠ 客户服务器在居民楼，晚上断网因为路由器被关了','// 这段代码在周五 18:55 被 merge，周一见','✗ 上线 5 分钟，老板第一个发现 bug',
];
const MID_REQS = [
'> 客户中途改需求：「按钮往左移 1px」','> 客户：「深色模式呢？现在 App 都有深色模式」','> 客户发来 60 秒语音方阵 ×12，转文字后需求全变',
'> 客户：「参考拼多多，但做出苹果官网的感觉」','> 客户：「加个功能，分享朋友圈得优惠券」','> 客户：「首页轮播图换成我家狗的照片」',
'> 客户：「要不……我们再聊聊第一版？」','> 客户：「我朋友说要做什么 SEO，你加一下」','> 客户：「领导说要有 AI，你随便接个大模型」',
'> 客户：「界面再高级一点，苹果发布会那种」','> 客户：「加个会员系统吧，明天要」','> 客户：「先上线，合同回头补」',
];
const OK_LINES = [
'  ✔ Compiled successfully','  ✔ 27 tests passed, 0 failed','  ✔ 部署完成 → https://client-xxx.vercel.app','  ✔ eslint 自动修复 132 处',
'  ✔ 构建产物 214KB（gzip 后勉强能看）','  ✔ 已推送 main，CI 全绿','  ✔ 热更新成功，用户无感知','  ✔ 数据库迁移完成，0 行丢失（惊喜）',
'  ✔ 性能优化：LCP 3.2s → 0.8s','  ✔ 已生成 API 文档（虽然没人看）','  ✔ 回滚成功，就当无事发生','  ✔ 客户验收截图已存证',
'  ✔ 发票已开（普票，专票要加钱）','  ✔ README 写完（Copilot 帮写的）','  ✔ 灰度 5% 无异常，全量发布','  ✔ 代码评审通过：LGTM（没细看）',
];
const EVT_TXT = {
  great:['🤩 客户惊呼：这是艺术品！追加小费！','🤩 一次通过！客户当场打钱还介绍了新单！','🤩 代码优雅得能进教科书，客户加钱！'],
  ok:['✅ 客户验收通过，尾款到账。','✅ 交付成功。','✅ 需求完成，客户没说啥（就是满意）。'],
  rework:['🔧 客户：logo 再大一点，颜色再鲜艳一点……','🔧 需求改了三版，时薪暴跌。','🔧 测试报了一堆 bug，连夜返工。'],
  disaster:['💥 模型把生产数据库 DROP 了……倒赔！','💥 force push 覆盖了客户 main 分支……赔钱！','💥 幻觉发作调用了不存在的 API，系统崩盘……赔偿！'],
};
const NOTICES = [
'📢 公告：本站已上线 Kimi K3 / GPT-5.6 系列渠道；Claude 渠道今日波动，出货率概不补偿。',
'📢 公告：DeepSeek 渠道依旧价格屠夫，¥0.04/任务，建议薅秃。',
'📢 公告：接到投诉，某玩家抽到豆包后要求退钱。本站声明：垃圾是概率的一部分。',
'📢 公告：GPT-4 渠道已进博物馆，抽中概不退换，权当收藏。',
'📢 公告：本月中转成本上涨，但盲盒价格不变——庄家还能亏不成？',
'📢 公告：请勿在工单里询问"保底真的存在吗"，问就是存在。',
'🔥 公告：限定卡池「流光限定」限时开启！DeepSeek V5 系列登场，90 抽大保底必出限定！',
];
