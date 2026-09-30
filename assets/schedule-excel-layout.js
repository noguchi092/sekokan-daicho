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
  let activeResizeObserver;
  function enhance(){
    const sheet=document.querySelector('.schedule-sheet');
    if(!sheet||sheet.dataset.excelLayout==='1')return;
    sheet.dataset.excelLayout='1';
    sheet.classList.add('excel-layout');
    enhanceHeader(sheet);
    const scroll=sheet.querySelector('.schedule-scroll');
    const table=sheet.querySelector('.schedule-grid');
    if(!scroll||!table)return;
    const canvas=document.createElement('div');
    canvas.className='excel-schedule-canvas';
    scroll.prepend(canvas);
    canvas.append(buildMeta(sheet),sheet.querySelector('.section-head'),table);
    const dayHeaders=[...table.querySelectorAll('thead tr:last-child th')].slice(1,-1);
    const body=table.querySelector('tbody');
    if(body.children.length===1&&body.firstElementChild.children.length===1)body.replaceChildren();
    const rows=body.querySelectorAll('tr:not(.schedule-annotation)').length;
    const dates=typeof scheduleSettings==='function'?scheduleDates(scheduleSettings().start,dayHeaders.length):[];
    for(let i=rows;i<20;i++){
      const row=document.createElement('tr');
      row.className='schedule-empty-row';
      row.innerHTML=`<th class="schedule-sticky"><button type="button" class="schedule-empty-add" data-schedule-empty="" aria-label="工程を追加">＋ 工程を記入</button></th>${dayHeaders.map((th,n)=>`<td class="${th.classList.contains('holiday')?'holiday':''} ${th.classList.contains('saturday')?'saturday':''}"><button type="button" class="schedule-day-pick" data-schedule-empty="${esc(dates[n]||'')}" aria-label="${esc(dates[n]||'')}の工程を追加"></button></td>`).join('')}<td></td>`;
      body.append(row);
    }
    const columns=document.createElement('colgroup');
    columns.innerHTML='<col class="excel-label-column">'+dayHeaders.map(()=>'<col class="excel-day-column">').join('')+'<col class="excel-actions-column">';
    table.prepend(columns);
    const fit=()=>{
      if(!sheet.isConnected)return;
      const label=matchMedia('(max-width:900px)').matches?150:190,actions=90;
      const available=scroll.clientWidth;
      if(!available)return;
      const day=Math.max(30,(available-label-actions)/dayHeaders.length);
      const width=label+actions+day*dayHeaders.length;
      canvas.style.width=width+'px';
      canvas.style.setProperty('--excel-label-width',label+'px');
      canvas.style.setProperty('--excel-day-width',day+'px');
      canvas.style.setProperty('--excel-actions-width',actions+'px');
      table.querySelectorAll('.schedule-line-svg').forEach(svg=>{
        svg.setAttribute('preserveAspectRatio','none');
        svg.style.width='100%';
      });
    };
    fit();
    if(activeResizeObserver)activeResizeObserver.disconnect();
    activeResizeObserver=new ResizeObserver(fit);
    activeResizeObserver.observe(scroll);
  }
  const observer=new MutationObserver(()=>requestAnimationFrame(enhance));
  observer.observe(document.documentElement,{subtree:true,childList:true});
  document.addEventListener('change',e=>{if(e.target?.id==='projectSelect')setTimeout(enhance,0)});
  document.addEventListener('click',e=>{
    const button=e.target.closest('[data-schedule-empty]');
    if(!button)return;
    openForm('schedule');
    const date=button.dataset.scheduleEmpty||scheduleSettings().start;
    document.querySelector('#entryForm [name=start]').value=date;
    document.querySelector('#entryForm [name=end]').value=date;
    document.querySelector('#entryForm [name=title]')?.focus();
  });
  enhance();
})();
