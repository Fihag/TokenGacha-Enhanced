"use strict";
/* ================================================================
   TokenGacha · 路由 (拆自 ui.js)
   ================================================================ */
/* ================================================================
   TokenGacha · 界面层 (ui.js)
   路由 / 渲染 / 抽卡流程 / 工作流 / 结局 / 弹窗 / 分享 / 充值 / 事件绑定 / 启动
   ================================================================ */

/* ---------- 路由 ---------- */
const PAGES=['buy','work','balance','activity','data'];
function go(page){
  if(!PAGES.includes(page)) page='buy';
  for(const p of PAGES){
    $('page-'+p).classList.toggle('active', p===page);
    const el=$('page-'+p);
    if(el) el.setAttribute('aria-hidden', p===page ? 'false' : 'true');
  }
  document.querySelectorAll('.top-nav button').forEach(b=>{
    const on=b.dataset.page===page;
    b.classList.toggle('active', on);
    if(on) b.setAttribute('aria-current','page');
    else b.removeAttribute('aria-current');
  });
  if(location.hash!=='#'+page) history.replaceState(null,'','#'+page);
  if(window.tgTrack) window.tgTrack('nav', {page});
  renderAll();
}
document.querySelectorAll('.top-nav button').forEach(b=>b.onclick=()=>{ SFX.click(); go(b.dataset.page); });
addEventListener('hashchange',()=>go(location.hash.slice(1)));
