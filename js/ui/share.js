"use strict";
/* ================================================================
   TokenGacha · 分享与充值 (拆自 ui.js)
   ================================================================ */
/* ---------- 分享 ---------- */
let shareCtx={cv:null,ms:null};
function shareText(ms){
  const best=S.stats.best?MMAP[S.stats.best].name:'无';
  if(ms) return `【${ms.title} ${ms.tag}】我在 TokenGacha 抽卡模拟器达成新成就！抽卡 ${S.stats.pulls} 次、打工 ${S.stats.tasks} 单，现在余额 ${fmt(S.money)}。70% 的玩家最终破产，你能成为持续赚钱的那 30% 吗？👉 ${SITE_URL}`;
  return `我在 TokenGacha 抽卡模拟器鏖战至今：余额 ${fmt(S.money)}，抽卡 ${S.stats.pulls} 次，最佳出货 ${best}，删库 ${S.stats.disasters} 次🤡。70% 的玩家最终破产，你能成为那 30% 吗？👉 ${SITE_URL}`;
}
function roundRectPath(g,x,y,w,h,r){ g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); }
function drawShareCard(ms){
  const W=900,H=500,cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  const g=cv.getContext('2d');
  const gr=g.createLinearGradient(0,0,W,H);
  gr.addColorStop(0,'#eaf1ff'); gr.addColorStop(.55,'#f6f3ff'); gr.addColorStop(1,'#fff7ea');
  g.fillStyle=gr; g.fillRect(0,0,W,H);
  for(const [c,x,y,r] of [['#2f6bff',60,60,90],['#9333ea',840,80,70],['#f59e0b',820,430,100],['#41d9ff',80,440,60]]){
    g.globalAlpha=.08; g.fillStyle=c; g.beginPath(); g.arc(x,y,r,0,7); g.fill();
  }
  g.globalAlpha=1; g.textAlign='center';
  const F='"PingFang SC","Microsoft YaHei",system-ui';
  g.font='44px '+F; g.fillText('🎰',W/2,86);
  g.font='900 30px '+F; g.fillStyle='#1c2340'; g.fillText('TokenGacha · LLM API 中转站',W/2,128);
  g.font='900 46px '+F; g.fillStyle=ms?'#d97706':'#2f53d8';
  g.fillText(ms?ms.title:'我的抽卡战绩',W/2,196);
  if(ms){ g.font='600 22px '+F; g.fillStyle='#67719a'; g.fillText(ms.tag,W/2,232); }
  g.font='900 64px '+F; g.fillStyle='#d97706';
  g.fillText('¥'+Math.round(S.money).toLocaleString('zh-CN'), W/2, ms?300:288);
  g.font='500 18px '+F; g.fillStyle='#98a2c8'; g.fillText('账户余额', W/2, ms?330:318);
  const best=S.stats.best?MMAP[S.stats.best].name:'—';
  const cells=[['抽卡次数',S.stats.pulls],['工作单数',S.stats.tasks],['删库事故',S.stats.disasters],['最佳出货',best]];
  const cw=180,gap=16,x0=(W-(cw*4+gap*3))/2,y0=352;
  cells.forEach(([l,v],i)=>{
    const x=x0+i*(cw+gap);
    g.fillStyle='rgba(255,255,255,.78)'; roundRectPath(g,x,y0,cw,86,14); g.fill();
    g.strokeStyle='#e3e8f2'; g.stroke();
    g.font='500 15px '+F; g.fillStyle='#98a2c8'; g.fillText(l,x+cw/2,y0+30);
    g.font='800 21px '+F; g.fillStyle='#1c2340'; g.fillText(String(v),x+cw/2,y0+62);
  });
  g.font='700 20px '+F; g.fillStyle='#2f6bff';
  g.fillText('70% 玩家最终破产，你能成为那 30% 吗？👉 '+SITE_URL.replace(/^https?:\/\//,''), W/2, 478);
  return cv;
}
function shareHTML(ms){
  return `<h3>📣 分享战绩<button class="x" onclick="closeModal()">×</button></h3>
  <div style="border-radius:12px;overflow:hidden;border:1px solid var(--line);margin-bottom:12px;box-shadow:var(--shadow)"><img id="share-img" style="width:100%;display:block" alt="分享图"></div>
  <div style="background:var(--panel2);border:1px solid var(--line);border-radius:10px;padding:10px 12px;font-size:12px;color:var(--dim);margin-bottom:12px;line-height:1.6">${shareText(ms)}</div>
  <div style="display:flex;gap:8px;flex-wrap:wrap">
    <button class="big-btn" style="flex:1;margin-top:0;min-width:130px" id="btn-copy-share">📋 复制文案</button>
    <button class="big-btn ghost" style="flex:1;margin-top:0;min-width:130px" id="btn-dl-share">🖼️ 保存图片</button>
    ${(typeof navigator!=='undefined'&&navigator.share)?'<button class="big-btn ghost" style="flex:1;margin-top:0;min-width:130px" id="btn-sys-share">📤 系统分享</button>':''}
  </div>`;
}
function openShare(ms){
  const cv=drawShareCard(ms);
  shareCtx={cv,ms};
  showModal(shareHTML(ms));
  $('share-img').src=cv.toDataURL('image/png');
}
function copyText(t){
  const done=()=>toast('📋 分享文案已复制，去粘贴给小伙伴吧');
  const legacy=()=>{ const ta=document.createElement('textarea'); ta.value=t; ta.style.cssText='position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); try{document.execCommand('copy');}catch(e){} ta.remove(); };
  if(typeof navigator!=='undefined'&&navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(t).then(done).catch(()=>{legacy();done();}); }
  else { legacy(); done(); }
}
/* ---------- 充值（作弊模式） ---------- */
const TOPUP_MAX = 64800;
function topupHTML(){
  const tiers=[6,30,68,128,328,648,6480,64800];
  return `<h3>💳 充值中心（作弊模式）<button class="x" onclick="closeModal()">×</button></h3>
  <div class="notice" style="margin-bottom:12px"><span class="dot"></span><span>⚠️ <b>作弊警告</b>：充值后本局将<b>永久关闭成就系统</b>（🎉 小有所成 / 🏆 财富自由 / 👑 传奇大亨 均无法再解锁）。已解锁的成就保留，余额页将打上「作弊」标记。</span></div>
  <p style="font-size:13px;color:var(--dim);margin-bottom:4px">输入充值金额（单次上限 <b>¥64,800</b>）：</p>
  <input id="topup-amt" type="number" min="1" max="64800" step="1" placeholder="想充多少，自己填" style="width:100%;padding:12px 14px;font-size:18px;font-weight:800;border:1.5px solid var(--line);border-radius:12px;margin:6px 0 12px;font-variant-numeric:tabular-nums;color:var(--txt);background:var(--panel2);outline:none">
  <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">${tiers.map(t=>`<button class="mini-btn" data-amt="${t}" style="flex:1;min-width:64px;padding:8px 4px">¥${t.toLocaleString('zh-CN')}</button>`).join('')}</div>
  <div class="note">双倍返利？没有。首充礼包？也没有。这里是作弊，不是福利。</div>
  <button class="big-btn danger" id="btn-do-topup">确认充值（并放弃成就）</button>`;
}
function doTopup(){
  const raw=($('topup-amt')&&$('topup-amt').value||'').trim();
  const v=Number(raw);
  if(!raw||!isFinite(v)||v<=0){ toast('请输入有效金额'); SFX.bad(); return; }
  if(v>TOPUP_MAX){ toast(`单次充值上限 ${fmt(TOPUP_MAX)}！想充更多请分多次（老赌徒了）`); SFX.bad(); return; }
  const amt=Math.round(v);
  const fromRect={left:innerWidth/2-60,top:innerHeight/2-40,width:120,height:80};
  S.money+=amt;
  S.flags.cheated=true;
  addLedger('💳 充值（作弊模式）', amt);
  save(); closeModal(); renderAll();
  SFX.coin();
  bigMoneyPop(amt);
  coinShower(fromRect, amt);
  toast(`💳 充值 ${fmt(amt)} 已到账！成就系统已永久关闭（本局）`, 3000);
  checkEnd();
}
function rtCell(r){ return `<span class="rt-${r}">${RARITY[r].name}</span>`; }
function ratesHTML(){
  let rows='';
  for(const [k,p] of Object.entries(POOLS)){
    if(p.banner && !isBannerActive()) continue;
    rows+=`<tr><td><b style="color:${p.color}">${p.name}</b><br><small>¥${p.price}/抽 · ¥${p.tenPrice}/十连</small></td>
      ${['N','R','SR','SSR','UR','UTR'].map(r=>`<td>${p.rates[r]?rtCell(r)+'<br>'+((p.rates[r]||0)*100).toFixed(1)+'%':'—'}</td>`).join('')}
      <td>${(poolRTP(k)*100).toFixed(0)}%</td></tr>`;
  }
  const verStr='v4.1.1';
  return `<h3>📊 概率公示（像正规抽卡游戏一样诚实）<button class="x" onclick="closeModal()">×</button></h3>
  <table><tr><th>卡池</th><th>N 垃圾</th><th>R 普通</th><th>SR 精锐</th><th>SSR 传说</th><th>UR 神话</th><th>UTR 超神话</th><th>期望回本率</th></tr>${rows}</table>
<div class="note">
  · ⚠️ 卡池页展示的「回本率」为宣传口径，你懂的；上表才是实测数学期望。本站保留最终解释权。<br>
  · 稀有度按 <a href="https://artificialanalysis.ai/leaderboards/models" target="_blank">Artificial Analysis 智能指数 ${verStr}</a> 分档：UTR≥64 / UR 55-63 / SSR 47-54 / SR 40-46 / R 28-39 / N&lt;28<br>
  · 卡面标价（如 $0.09/任务）仅为角色设定，不参与结算；结算按稀有度 basePay 驱动。<br>
  · 全池另有 <b>DeepSeek V4 Flash 0731 独立 1.5%</b> 出货（记入 SSR，表内概率不含此项，故 SSR 实际略高于表列）<br>
  · 全池另有 0.01% 隐藏神卡概率（比 SSR 稀有得多，抽到自然知道）<br>
  · 每池 ${PITY_MAX} 抽（青铜盲盒 50 抽）无 SSR+ 触发保底（80% SSR / 20% UR）；限定池 100 抽大保底必出当期限定 UTR（约 1% 自然 UTR 另计）；十连必出 SR 及以上<br>
  · 新手池为「体验卡」，token 额度 ×50% 且已规整到 20w 倍数<br>
  · 工作收入 = 模型报价 × 事件倍率（大成功×2.5 / 返工×0.4 / 删库赔¥65，垃圾模型事故率高）；限定卡（永久限定集）接单收入 ×2<br>
  · 本中转站期望约 7 成玩家最终破产。庄家永远赢，除非……你抽到那张卡。</div>`;
}
function dexHTML(){
  const ownNB = (S.dex.fihagv1||0)>0;
  const visible = MODELS.filter(m=> m.id!=='fihagv1' || ownNB);
  const counts={};
  for(const r of RORDER) counts[r]=visible.filter(m=>m.r===r).length;
  const got=Object.keys(S.dex).length;
  const vendorSet = new Set(MODELS.map(m=>m.vendor));
  const vendorCount = vendorSet.size;
  const vendorList = [...vendorSet].slice(0,8).join(' / ') + ' 等';
  const html=`<h3>📖 模型图鉴 ${got}/${visible.length}<button class="x" onclick="closeModal()">×</button></h3>
  <div class="dex-legend">${RORDER.filter(r=> r!=='NB' || ownNB).map(r=>`<span style="color:${RARITY[r].hex}">■</span> ${r} ${RARITY[r].label} ×${counts[r]}`).join('　')}</div>
  <div class="dex-grid" id="dex-grid"></div>
  <div class="note" style="margin-top:10px">收录 ${vendorList} 等 ${vendorCount} 家厂商。排名参考 Artificial Analysis 智能指数 v4.1.1。</div>`;
  showModal(html);
  const grid=$('dex-grid');
  const sorted=[...visible].sort((a,b)=>RORDER.indexOf(b.r)-RORDER.indexOf(a.r)||b.idx-a.idx);
  grid.innerHTML=sorted.map(m=>{
    const owned=S.dex[m.id]>0;
    return `<div class="dex-cell ${owned?'':'locked'}" style="--rc:${RARITY[m.r].hex}" title="${m.name} · ${m.vendor}&#10;${m.quote}">
      <span class="rr">${m.r}</span><div class="ic"></div>
      <div class="nm">${owned?m.name:'？？？'}</div>
      <div class="ct">${owned?`指数 ${Math.round(m.idx)} · 抽到 ${S.dex[m.id]} 次`:'未获得'}</div></div>`;
  }).join('');
  sorted.forEach((m,i)=>{ const ic=grid.children[i].querySelector('.ic'); if(m.id==='fihagv1'){ ic.textContent='🌈'; ic.style.cssText='font-size:30px;line-height:1'; } else ic.appendChild(iconImg(m.icon)); });
}
function helpHTML(){
  return `<h3>❓ 玩法说明<button class="x" onclick="closeModal()">×</button></h3>
  <p>你是一名独立开发者。这家中转站不卖套餐，只卖<b>盲盒</b>：抽到顶级模型还是电子垃圾，全看命。</p>
  <p>🔁 循环：<b>「购买Token」抽卡 → 「工作」用 token 接 vibe coding 私活 → 「余额」看着数字涨跌</b>。系统自动优先消耗最高稀有度的卡——好钢用在刀刃上。模型越强报价越高、翻车越少；垃圾模型还可能把客户数据库删了<b>倒赔钱</b>。</p>
  <p>⚡ 「开始工作」一键完成 ${BATCH_TASKS} 单；「自动模式」直接梭哈全部 token。资金回笼后立刻去抽下一波。</p>
   <p>💡 攻略：青铜池是新手陷阱（额度减半）；<b>白银池是本站良心，期望回本率最高</b>，主力抽它；王者池不出垃圾但 UR 仅 5.5%——欧皇的天堂，赌狗的坟场。余额 ≥ ${fmt(VICTORY_AT)} 即达成「财富自由」。</p>
  <p>🔥 限定池：每赛季自动轮换的限定 UP 卡池，当前「${POOLS.banner.name}」——${POOLS.banner.sub}；100 抽大保底必出当期限定 UTR，限定卡接单收入 <b>翻倍</b>！</p>
  <p>📅 「活动」页每日签到 + 3 个日常任务领奖励；「数据」页可查看抽卡/收支图表。</p>
  <p>⌨️ 快捷键：<span class="kbd">空格</span> 批量接单</p>
  <button class="big-btn ghost" id="btn-reset">🗑️ 清空存档，重新来过</button>`;
}
function endStats(){
  const best=S.stats.best?MMAP[S.stats.best]:null;
  const rows=[['总抽数',S.stats.pulls],['工作单数',S.stats.tasks],['累计收入',fmt(S.stats.earn)],['累计氪金',fmt(S.stats.spent)],['大成功',S.stats.greats],['删库事故',S.stats.disasters],['最佳出货',best?best.name:'无']];
  return `<div class="end-stats">${rows.map(([l,v])=>`<div class="cell"><div class="lb">${l}</div><b>${v}</b></div>`).join('')}</div>`;
}
function bankruptHTML(){
  return `<div class="end-title">💀 破产了</div>
  <div class="end-sub">盲盒误我，垃圾模型毁我青春。<br>你与那 70% 的玩家殊途同归。</div>
  ${endStats()}
  <button class="big-btn danger" id="btn-rebirth">🔄 东山再起（重新开局 ${fmt(START_MONEY)} + 免费十连）</button>`;
}
function milestoneHTML(ms){
  return `<div class="end-title">${ms.title}</div>
  <div class="end-sub">${ms.tag}！${ms.hype}</div>
  ${endStats()}
  <button class="big-btn" data-share-ms="${ms.id}">📣 分享这一时刻</button>
  <button class="big-btn ghost" onclick="closeModal()">继续压榨中转站 →</button>`;
}
function welcomeHTML(){
  return `<h3>🎰 欢迎来到 TokenGacha</h3>
  <p>这是一家神秘的 <b>LLM API 中转站</b>。它不按量计费，只卖<b>盲盒</b>——</p>
  <p>你可能抽到 <b>Claude Opus 6</b>（限定超神话，智能指数 79，接单收入翻倍），也可能抽到<b>豆包</b>（72 tok/s 够快，可惜队友总喊“再便宜点”）。</p>
  <p>💰 启动资金 <b>${fmt(START_MONEY)}</b> 已到账，另赠<b>白银盲盒免费十连 ×1</b>。<br>三个页面完成整个循环：<b>购买Token → 工作 → 余额</b>。是破产收场还是财富自由，看你的命了。</p>
  <button class="big-btn" id="btn-start">🎁 收下启动资金，开抽！</button>`;
}
