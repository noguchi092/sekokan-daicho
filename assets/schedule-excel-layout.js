(()=>{
  const STORE_KEY='genba-note-v1';
  const safe=v=>String(v??'');
  const esc=s=>safe(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function currentProject(){
    try{
      const store=JSON.parse(localStorage.getItem(STORE_KEY)||'{}');
      const id=document.querySelector('#projectSelect')?.value;
      return {project:(store.projects||[]).find(p=>p.id===id)||null,company:store.companyProfile||{}};
    }catch{return {project:null,company:{}}}
  }
  function buildMeta(sheet){
    const {project:p,company}=currentProject();
    const title=sheet.querySelector('.section-head h2')?.textContent?.replace(/（.*$/,'').trim()||'工程表';
    const floors=[p?.aboveFloors?`地上${p.aboveFloors}階`:'',p?.belowFloors?`地下${p.belowFloors}階`:''].filter(Boolean).join(' / ')||'—';
    const construction=p?.constructionName||p?.name||'工事名称未登録';
    const meta=document.createElement('div');
    meta.className='excel-schedule-meta';
    meta.innerHTML=`<div class="excel-schedule-title"><div class="excel-title-main"><span class="excel-kicker">SEKOKAN CONSTRUCTION SCHEDULE</span><h3>${esc(construction)}</h3><div class="excel-project-sub"><span>工程表</span><b>${esc(title)}</b><span>住所</span><b>${esc(p?.location||'—')}</b><span>構造</span><b>${esc(p?.structure||'—')}</b><span>階数</span><b>${esc(floors)}</b></div></div><div class="excel-title-info"><span>用途</span><b>${esc(p?.buildingUse||'—')}</b><span>工事概要</span><b>${esc(p?.overview||'—')}</b><span>作成日</span><b>${new Intl.DateTimeFormat('ja-JP',{dateStyle:'medium'}).format(new Date())}</b><span>現場</span><b>${esc(p?.name||'—')}</b></div></div><div class="excel-schedule-side"><div class="excel-party-grid"><span>施　主</span><b>${esc(p?.client||'—')}</b><span>監　理</span><b>—</b><span>設　計</span><b>—</b><span>施　工</span><b>${esc(company.name||'—')}</b></div><div class="excel-approval-grid"><div class="excel-progress"><span>全体工程　進捗状況</span><strong>— %</strong><small>工程データ連動予定</small></div><div class="excel-approval">現場代理人</div><div class="excel-approval">監理技術者</div><div class="excel-approval">作成(B)</div><div class="excel-approval">作成(A)</div></div></div>`;
    return meta;
  }
  function enhanceHeader(sheet){
    const thead=sheet.querySelector('.schedule-grid thead');
    const dayRow=thead?.querySelector('tr');
    if(!thead||!dayRow||thead.querySelector('.schedule-month-row'))return;
    const headers=[...dayRow.children];
    if(headers.length<3)return;
    const dayHeaders=headers.slice(1,-1);
    const groups=[];
    for(const th of dayHeaders){
      const raw=(th.childNodes[0]?.textContent||th.textContent||'').trim();
      const m=raw.match(/(\d{2})-(\d{2})/);
      const month=m?Number(m[1]):null,day=m?Number(m[2]):null;
      if(m){th.childNodes[0].textContent=String(day);th.dataset.month=String(month)}
      const weekday=th.querySelector('small')?.textContent?.trim();
      if(weekday==='土')th.classList.add('saturday');
      if(!groups.length||groups.at(-1).month!==month)groups.push({month,count:1});else groups.at(-1).count++;
    }
    const monthRow=document.createElement('tr');
    monthRow.className='schedule-month-row';
    monthRow.innerHTML=`<th class="schedule-sticky excel-month-label">年月</th>${groups.map(g=>`<th colspan="${g.count}">${g.month?`${g.month}月`:''}</th>`).join('')}<th class="excel-operation-head">操作</th>`;
    thead.insertBefore(monthRow,dayRow);
    sheet.querySelectorAll('tbody tr:not(.schedule-annotation)').forEach(row=>{
      [...row.children].slice(1,-1).forEach((td,i)=>{
        const weekday=dayHeaders[i]?.querySelector('small')?.textContent?.trim();
        if(weekday==='土')td.classList.add('saturday');
      });
    });
  }
  function enhance(){
    const sheet=document.querySelector('.schedule-sheet');
    if(!sheet||sheet.dataset.excelLayout==='1')return;
    sheet.dataset.excelLayout='1';
    sheet.classList.add('excel-layout');
    sheet.prepend(buildMeta(sheet));
    enhanceHeader(sheet);
  }
  const observer=new MutationObserver(()=>requestAnimationFrame(enhance));
  observer.observe(document.documentElement,{subtree:true,childList:true});
  document.addEventListener('change',e=>{if(e.target?.id==='projectSelect')setTimeout(enhance,0)});
  enhance();
})();
