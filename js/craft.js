"use strict";
/* ================================================================
   TokenGacha · 合成台 (craft.js)
   同厂商强制：3×同厂商同稀有度 → 1×同厂商高一档
   同模型×5 → 升星 (上限3，收益+5%/星)
   ================================================================ */

function craftVendorsFor(recipe){
  const need = recipe.need, from = recipe.from;
  const counts = {};
  for(const c of S.inv){
    if(c.locked) continue;
    if(MMAP[c.m].r !== from) continue;
    const v = MMAP[c.m].vendor;
    counts[v] = (counts[v]||0)+1;
  }
  return Object.entries(counts).filter(([v,n])=>n>=need && craftOutputCands(recipe, v).length>0).map(([v])=>v);
}
function craftOutputCands(recipe, vendor){
  // 限定卡（bannerOnly）不可被合成产出，避免绕过抽卡获取
  return MODELS.filter(m=> m.r===recipe.to && m.vendor===vendor && !m.bannerOnly);
}
function doCraft(recipeId, uids){
  const recipe = CRAFT_RECIPES.find(r=>r.id===recipeId);
  if(!recipe) return {ok:false, msg:'未知配方'};
  if(!Array.isArray(uids) || uids.length!==recipe.need) return {ok:false, msg:`需选择 ${recipe.need} 张卡`};
  const cards = uids.map(uid=> S.inv.find(c=>c.uid===uid)).filter(Boolean);
  if(cards.length!==recipe.need) return {ok:false, msg:'卡片不存在或已消耗'};
  if(cards.some(c=>c.locked)) return {ok:false, msg:'锁定卡不可用于合成'};
  const vendors = cards.map(c=> MMAP[c.m].vendor);
  const firstV = vendors[0];
  if(!vendors.every(v=>v===firstV)) return {ok:false, msg:'需同厂商（不允许跨 vendor）'};
  const rs = cards.map(c=> MMAP[c.m].r);
  if(!rs.every(r=>r===recipe.from)) return {ok:false, msg:`需全部为 ${recipe.from} 稀有度`};
  const cands = craftOutputCands(recipe, firstV);
  if(!cands.length) return {ok:false, msg:`${firstV} 暂无 ${recipe.to} 可合成`};
  // 消耗
  for(const uid of uids){
    const idx=S.inv.findIndex(c=>c.uid===uid);
    if(idx>=0) S.inv.splice(idx,1);
  }
  const m = cands[Math.floor(Math.random()*cands.length)];
  const base = m.quota || RARITY[recipe.to].quota;
  let quota = Math.floor(base / TASK_TOKENS)*TASK_TOKENS;
  const nc = {uid:S.uid++, m:m.id, tokens:quota, max:quota, half:false, stars:0};
  S.inv.push(nc);
  // 统计
  S.stats.byR[recipe.to]=(S.stats.byR[recipe.to]||0)+1;
  S.dex[m.id]=(S.dex[m.id]||0)+1;
  if(typeof maybeBest==='function') maybeBest(nc);
  addLedger(`🔧 合成 ${recipe.label} · ${firstV}`, 0);
  if(typeof S.crafts==='object'){
    S.crafts.count=(S.crafts.count||0)+1;
    S.crafts.last=m.id;
  }
  if(S.daily) S.daily.crafts=(S.daily.crafts||0)+1;
  save();
  if(typeof renderAll==='function') renderAll();
  if(typeof SFX!=='undefined' && SFX.coin) SFX.coin();
  burst(innerWidth/2, innerHeight/2.8, [RARITY[recipe.to].hex,'#fff'], 70, 6);
  toast(`🔧 合成成功：${m.name} (${recipe.to})`, 2600);
  return {ok:true, card:nc};
}
function canStarUpgrade(uids){
  if(!Array.isArray(uids)||uids.length!==CRAFT_STAR_NEED) return false;
  const cards=uids.map(uid=>S.inv.find(c=>c.uid===uid)).filter(Boolean);
  if(cards.length!==CRAFT_STAR_NEED) return false;
  const mid=cards[0].m;
  if(!cards.every(c=>c.m===mid)) return false;
  // 至少有一张可升星（<3），实际升级时取最高星的那张+1
  return cards.some(c=> (c.stars||0)<3);
}
function doStarUpgrade(uids){
  if(!Array.isArray(uids)||uids.length!==CRAFT_STAR_NEED) return {ok:false,msg:`需选择 ${CRAFT_STAR_NEED} 张同模型`};
  const cards=uids.map(uid=>S.inv.find(c=>c.uid===uid)).filter(Boolean);
  if(cards.length!==CRAFT_STAR_NEED) return {ok:false,msg:'卡片不存在'};
  if(cards.some(c=>c.locked)) return {ok:false,msg:'锁定卡不可用于升星'};
  const mid=cards[0].m;
  if(!cards.every(c=>c.m===mid)) return {ok:false,msg:'需同模型 5 张'};
  const maxStar=Math.max(...cards.map(c=>c.stars||0));
  if(maxStar>=3) return {ok:false,msg:'已满 3 星'};
  // 消耗 5 张，返 1 张同模型星级+1（保留最高星+1）
  for(const uid of uids){
    const idx=S.inv.findIndex(c=>c.uid===uid);
    if(idx>=0) S.inv.splice(idx,1);
  }
  const m=MMAP[mid];
  const base=m.quota||RARITY[m.r].quota;
  let quota=Math.floor(base/TASK_TOKENS)*TASK_TOKENS;
  const nc={uid:S.uid++, m:mid, tokens:quota, max:quota, half:false, stars:maxStar+1};
  // 星级继承 token? 按满额给
  S.inv.push(nc);
  S.dex[mid]=(S.dex[mid]||0)+1;
  if(typeof S.crafts==='object'){ S.crafts.stars=(S.crafts.stars||0)+1; }
  if(S.daily) S.daily.crafts=(S.daily.crafts||0)+1;
  save();
  if(typeof renderAll==='function') renderAll();
  if(typeof SFX!=='undefined' && SFX.coin) SFX.coin();
  toast(`⭐ 升星成功：${m.name} ★${nc.stars}`, 2600);
  burst(innerWidth/2, innerHeight/2.8, ['#f59e0b','#ffd700','#fff'], 90, 7);
  return {ok:true, card:nc};
}
// 便捷：返回可合成配方列表（按当前卡库）
function craftAvailable(){
  const list=[];
  for(const r of CRAFT_RECIPES){
    const vendors=craftVendorsFor(r);
    if(vendors.length) list.push({recipe:r, vendors});
  }
  // 星级
  const byModel={};
  for(const c of S.inv){ if(c.locked) continue; byModel[c.m]=(byModel[c.m]||0)+1; }
  const starable=Object.entries(byModel).filter(([mid,n])=>n>=CRAFT_STAR_NEED && MODELS.find(m=>m.id===mid)).map(([mid])=>mid);
  if(starable.length) list.push({recipe:{id:'star', label:'升星', desc:`同模型×${CRAFT_STAR_NEED} 升 1 星 (上限3)`}, vendors:starable});
  return list;
}
function renderCraft(){
  const box=$('craft-recipes');
  if(!box) return;
  box.innerHTML='';
  if(!S.inv.length){ box.innerHTML='<div style="color:var(--faint);font-size:12.5px;padding:8px 2px">卡库为空，先去抽卡</div>'; return; }
  let has=false;
  for(const r of CRAFT_RECIPES){
    const vendors=craftVendorsFor(r);
    for(const v of vendors){
      has=true;
      const cands=craftOutputCands(r,v);
      const preview=cands.length? cands.slice(0,3).map(m=>m.name).join(' / '):'暂无目标';
      const row=document.createElement('div');
      row.className='craft-recipe';
      row.innerHTML=`<div class="cr-main"><div class="cr-title">🔧 ${r.label} · ${v}</div><div class="cr-desc">${r.desc}</div><div class="cr-need">可产出：${preview}</div></div><button class="mini-btn" data-craft="${r.id}" data-vendor="${v}">合成</button>`;
      box.appendChild(row);
    }
  }
  // 升星
  const byModel={};
  for(const c of S.inv){ if(c.locked) continue; byModel[c.m]=(byModel[c.m]||0)+1; }
  for(const [mid, cnt] of Object.entries(byModel)){
    if(cnt < CRAFT_STAR_NEED) continue;
    const m=MMAP[mid];
    const maxStar=Math.max(...S.inv.filter(c=>c.m===mid).map(c=>c.stars||0));
    if(maxStar>=3) continue;
    has=true;
    const row=document.createElement('div');
    row.className='craft-recipe';
    row.style.borderColor='#f59e0b';
    row.innerHTML=`<div class="cr-main"><div class="cr-title">⭐ 升星 · ${m.name}</div><div class="cr-desc">同模型×${CRAFT_STAR_NEED} 升 1 星 (当前最高 ★${maxStar})</div><div class="cr-need">持有 ${cnt} 张 · 收益 +${(maxStar+1)*5}%</div></div><button class="mini-btn" data-star="${mid}">升星</button>`;
    box.appendChild(row);
  }
  if(!has) box.innerHTML='<div style="color:var(--faint);font-size:12.5px;padding:8px 2px">暂无可合成配方（需同厂商同稀有度×3，或同模型×5）</div>';
  box.querySelectorAll('[data-craft]').forEach(b=> b.onclick=()=> openCraftPicker(b.dataset.craft, b.dataset.vendor));
  box.querySelectorAll('[data-star]').forEach(b=> b.onclick=()=> openCraftPicker('star', b.dataset.star));
}
let _craftPick={recipe:null, vendor:null, selected:new Set()};
function openCraftPicker(recipeId, vendor){
  const need = recipeId==='star' ? CRAFT_STAR_NEED : (CRAFT_RECIPES.find(r=>r.id===recipeId)?.need||3);
  let pool=[];
  if(recipeId==='star'){
    pool=S.inv.filter(c=>c.m===vendor);
  }else{
    const r=CRAFT_RECIPES.find(x=>x.id===recipeId);
    pool=S.inv.filter(c=> MMAP[c.m].r===r.from && MMAP[c.m].vendor===vendor);
  }
  pool.sort((a,b)=> (a.locked?1:0)-(b.locked?1:0) || (a.stars||0)-(b.stars||0) || a.tokens-b.tokens);
  _craftPick={recipe:recipeId, vendor, selected:new Set()};
  const grid=pool.map(c=>{
    const m=MMAP[c.m];
    const stars=c.stars?` ★${c.stars}`:'';
    const locked=c.locked?`<span style="position:absolute;top:2px;right:4px;font-size:10px">🔒</span>`:'';
    const dis=c.locked?'opacity:.45;pointer-events:none':'' ;
    return `<div class="exped-card" data-uid="${c.uid}" style="width:92px;${dis};position:relative">${locked}<div class="nm">${m.name}${stars}</div><div class="tk">${fmtK(c.tokens)} tok</div><div style="font-size:10px;color:var(--faint)">${m.r} · ${m.vendor}${c.locked?' · 已锁定':''}</div></div>`;
  }).join('');
  const html=`<h3>${recipeId==='star'?'⭐ 选5张同模型升星':'🔧 选'+need+'张同厂商合成'}<button class="x" onclick="closeModal()">×</button></h3>
  <div style="display:flex;gap:8px;flex-wrap:wrap;max-height:46vh;overflow-y:auto;padding:6px 2px" id="craft-pick-grid">${grid||'<div style="color:var(--faint)">无可用卡</div>'}</div>
  <div style="display:flex;gap:8px;margin-top:12px;align-items:center"><span id="craft-pick-cnt" style="font-size:12px;color:var(--dim)">已选 0/${need}</span><button class="big-btn" style="flex:1;margin-top:0" id="btn-craft-confirm" disabled>确认合成</button></div>`;
  showModal(html, true);
  const g=document.getElementById('craft-pick-grid');
  if(g){
    g.querySelectorAll('[data-uid]').forEach(el=>{
      el.onclick=()=>{
        const uid=Number(el.dataset.uid);
        if(_craftPick.selected.has(uid)){ _craftPick.selected.delete(uid); el.classList.remove('on'); }
        else{
          if(_craftPick.selected.size>=need) return;
          _craftPick.selected.add(uid); el.classList.add('on');
        }
        const cnt=document.getElementById('craft-pick-cnt');
        const btn=document.getElementById('btn-craft-confirm');
        if(cnt) cnt.textContent=`已选 ${_craftPick.selected.size}/${need}`;
        if(btn) btn.disabled=_craftPick.selected.size!==need;
      };
    });
  }
  const btn=document.getElementById('btn-craft-confirm');
  if(btn) btn.onclick=()=>{
    const uids=[..._craftPick.selected];
    let res;
    if(recipeId==='star') res=doStarUpgrade(uids);
    else res=doCraft(recipeId, uids);
    if(!res.ok){ toast(res.msg||'合成失败'); SFX.bad(); return; }
    closeModal();
  };
}
