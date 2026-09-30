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
  function cellAlignment(slot,date){
    return (data.scheduleCellFormats||[]).find(f=>f.projectId===projectId&&f.slot===slot&&f.date===date)?.align||'left';
  }
  function refreshTextOverflow(row){
    const cells=[...row.children].slice(1,-1),slot=Number(row.dataset.gridSlot);
    for(let i=0;i<cells.length;i++){
      const text=cells[i].querySelector('.schedule-cell-text');
      const input=cells[i].querySelector('.schedule-cell-input');
      if(!text&&!input)continue;
      let first=i,last=i;
      while(first>0&&!cells[first-1].querySelector('.schedule-cell-text,.schedule-cell-input'))first--;
      while(last+1<cells.length&&!cells[last+1].querySelector('.schedule-cell-text,.schedule-cell-input'))last++;
      const rect=cells[i].getBoundingClientRect(),align=cellAlignment(slot,cells[i].dataset.gridDate);
      const availableLeft=rect.left-cells[first].getBoundingClientRect().left;
      const availableRight=cells[last].getBoundingClientRect().right-rect.right;
      const extension=align==='center'?Math.min(availableLeft,availableRight):0;
      const offset=align==='right'?-availableLeft:align==='center'?-extension:0;
      const width=rect.width+(align==='right'?availableLeft:align==='center'?extension*2:availableRight)-1;
      for(const element of [text,input]){
        if(!element)continue;
        element.style.width=Math.max(0,width)+'px';element.style.left=offset+'px';
        element.style.textAlign=align;
        if(element===text){element.style.justifyContent=align==='right'?'flex-end':align==='center'?'center':'flex-start';element.title=element.textContent}
      }
    }
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
    const mainRows=[...body.querySelectorAll('tr:not(.schedule-annotation)')];
    const slots=new Map();
    const deferred=[];
    for(const row of mainRows){
      const task=row.querySelector('[data-schedule-task]')?.dataset.scheduleTask;
      const entry=task?items('schedule').find(s=>s.id===task):null;
      if(!entry)continue;
      row.dataset.gridTask=task;
      if(Number.isInteger(entry.gridSlot)&&!slots.has(entry.gridSlot))slots.set(entry.gridSlot,row);
      else deferred.push(row);
    }
    for(const row of deferred){let slot=0;while(slots.has(slot))slot++;slots.set(slot,row)}
    const emptyRows=mainRows.filter(row=>!row.dataset.gridTask);
    const count=Math.max(20,slots.size?Math.max(...slots.keys())+1:20);
    for(let slot=0;slot<count;slot++){
      const row=slots.get(slot)||emptyRows.shift();
      if(!row)continue;
      row.dataset.gridSlot=slot;
      const entry=items('schedule').find(s=>s.id===row.dataset.gridTask);
      row.firstElementChild.innerHTML=`<input class="schedule-title-input" data-grid-title type="text" value="${esc(entry?.title||'')}" aria-label="工程名 ${slot+1}" maxlength="100">`;
      row.querySelector('[data-grid-title]').style.textAlign=cellAlignment(slot,'title');
      [...row.children].slice(1,-1).forEach((td,col)=>{
        td.dataset.gridDate=dates[col];
        const value=(data.scheduleCellTexts||[]).find(t=>t.projectId===projectId&&t.slot===slot&&t.date===dates[col])?.text;
        if(value){const text=document.createElement('span');text.className='schedule-cell-text';text.textContent=value;td.append(text)}
      });
      body.append(row);
      const task=row.dataset.gridTask;
      if(task){
        const annotations=[...body.querySelectorAll('.schedule-annotation')].filter(r=>{
          const id=r.querySelector('[data-schedule-line-edit]')?.dataset.scheduleLineEdit;
          return scheduleLines().some(l=>l.id===id&&l.taskId===task);
        });
        for(const annotation of annotations){
          const line=scheduleLines().find(l=>l.id===annotation.querySelector('[data-schedule-line-edit]')?.dataset.scheduleLineEdit);
          if(line.cellBottom)annotation.hidden=true;
          body.append(annotation);
        }
        for(const line of scheduleLines().filter(l=>l.taskId===task&&l.cellBottom)){
          const remove=document.createElement('button');remove.type='button';remove.className='btn danger';
          remove.dataset.scheduleLineDelete=line.id;remove.textContent='× 線';
          remove.title=line.start+' ～ '+line.end;
          row.lastElementChild.append(remove);
        }
        const cells=[...row.children].slice(1,-1);
        for(const line of scheduleLines().filter(l=>l.taskId===task&&l.cellBottom)){
          if(line.end<dates[0]||line.start>dates.at(-1))continue;
          const first=dates.indexOf(line.start),last=dates.indexOf(line.end);
          const from=first<0?0:first,to=last<0?dates.length-1:last;
          const left=from*52,right=(to+1)*52,span=Math.max(1,Number(line.rowSpan)||1),height=34*span,color=/^#[0-9a-f]{6}$/i.test(line.color)?line.color:'#304960';
          const curved=line.style==='r'||line.style.startsWith('r-');
          const g=curved?scheduleCornerGeometry(line.style==='r'?'r-right-up':line.style,left,right,height):{path:`M ${left} ${height} H ${right}`,sx:left,sy:height,ex:right,ey:height,startAngle:0,endAngle:0};
          const dash=line.style==='dashed'?'9 5':line.style==='dotted'?'2 5':'';
          const layer=document.createElement('span');layer.className='schedule-cell-line-layer';
          layer.dataset.rowSpan=curved?span:1;layer.dataset.lineId=line.id;
          const marker=(kind,x,y,side,angle)=>`<g transform="rotate(${angle} ${x} ${y})">${scheduleMarker(kind,x,y,color,side)}</g>`;
          layer.innerHTML=`<svg viewBox="0 0 ${dates.length*52} ${height}" preserveAspectRatio="none" aria-label="${esc(line.label||'工程線')}"><path d="${g.path}" fill="none" stroke="${color}" stroke-width="${line.weight||2}" vector-effect="non-scaling-stroke" ${dash?`stroke-dasharray="${dash}"`:''}/>${first>=0?marker(line.startMarker,g.sx,g.sy,'start',g.startAngle):''}${last>=0?marker(line.endMarker,g.ex,g.ey,'end',g.endAngle):''}${line.label?`<text x="${(left+right)/2}" y="${Math.max(12,g.sy-8)}" text-anchor="middle" fill="${color}" font-size="12">${esc(line.label)}</text>`:''}</svg>`;
          cells[0].append(layer);
          const edit=document.createElement('button');edit.type='button';edit.className='btn secondary';edit.dataset.scheduleLineEdit=line.id;edit.textContent='線編集';row.lastElementChild.append(edit);
        }
      }
    }
    body.querySelectorAll('tr:not(.schedule-annotation)').forEach(row=>{
      const cell=row.lastElementChild,actions=document.createElement('div');
      actions.className='schedule-row-actions';
      while(cell.firstChild)actions.append(cell.firstChild);
      cell.append(actions);
    });
    const hint=document.querySelector('.schedule-toolbar .hint');
    if(hint)hint.textContent='工程名は直接入力。日付セルはダブルクリック、または選択して文字入力。左ドラッグ→右クリックで線。R線は選択範囲の上下の交点を結びます。';
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
      canvas.style.setProperty('--excel-date-width',(day*dayHeaders.length)+'px');
      const allRows=[...body.querySelectorAll('tr:not(.schedule-annotation)')];
      allRows.forEach(refreshTextOverflow);
      table.querySelectorAll('.schedule-cell-line-layer').forEach(layer=>{
        const row=layer.closest('tr'),index=allRows.indexOf(row),last=allRows[Math.min(allRows.length-1,index+Number(layer.dataset.rowSpan)-1)];
        layer.style.top='0px';layer.style.bottom='auto';
        layer.style.height=(last.getBoundingClientRect().bottom-row.getBoundingClientRect().top)+'px';
      });
      table.querySelectorAll('.schedule-line-svg').forEach(svg=>{
        svg.setAttribute('preserveAspectRatio','none');
        svg.style.width='100%';
      });
    };
    fit();
    setupLinePicking(sheet);
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

  let range=null,dragging=false,suppressClick=false,selectedTitleRow=null,selectedLineId='';
  function selectLine(id){
    selectedLineId=id;
    document.querySelectorAll('[data-pick-line]').forEach(hit=>{
      const active=hit.dataset.pickLine===id;
      hit.setAttribute('aria-pressed',String(active));
      hit.closest('svg').classList.toggle('schedule-selected-line',active);
    });
    if(id){range=null;highlight();const status=document.querySelector('#schedulePickStatus');if(status)status.textContent='工程線を選択しました。Deleteキーで削除できます。';}
  }
  function setupLinePicking(sheet){
    sheet.querySelectorAll('.schedule-cell-line-layer svg,.schedule-annotation .schedule-line-svg').forEach(svg=>{
      const id=svg.closest('[data-line-id]')?.dataset.lineId||svg.closest('tr')?.querySelector('[data-schedule-line-edit]')?.dataset.scheduleLineEdit;
      const path=svg.querySelector('path');
      if(!id||!path||svg.querySelector('[data-pick-line]'))return;
      const hit=path.cloneNode(false);
      hit.removeAttribute('stroke-dasharray');hit.removeAttribute('class');
      hit.setAttribute('fill','none');hit.setAttribute('stroke','transparent');hit.setAttribute('stroke-width','14');hit.setAttribute('vector-effect','non-scaling-stroke');
      hit.setAttribute('class','schedule-line-hit');hit.setAttribute('tabindex','0');hit.setAttribute('role','button');hit.setAttribute('aria-label','工程線を選択（Deleteキーで削除）');hit.setAttribute('aria-pressed','false');
      hit.dataset.pickLine=id;svg.append(hit);
    });
    selectLine(selectedLineId);
  }
  const cellAt=target=>{
    const td=target.closest('.schedule-grid tbody tr:not(.schedule-annotation)>td');
    if(!td||td===td.parentElement.lastElementChild)return null;
    return {row:td.parentElement,col:[...td.parentElement.children].indexOf(td)-1};
  };
  function highlight(){
    document.querySelectorAll('.schedule-range-selected').forEach(c=>c.classList.remove('schedule-range-selected'));
    if(!range||!range.first.row.isConnected){range=null;return}
    const rows=[...range.first.row.parentElement.querySelectorAll('tr:not(.schedule-annotation)')];
    const a=rows.indexOf(range.first.row),b=rows.indexOf(range.last.row);
    for(let r=Math.min(a,b);r<=Math.max(a,b);r++)
      for(let c=Math.min(range.first.col,range.last.col);c<=Math.max(range.first.col,range.last.col);c++)
        rows[r].children[c+1].classList.add('schedule-range-selected');
  }
  document.addEventListener('pointerdown',e=>{
    if(e.button!==0||e.pointerType==='touch'||e.target.closest('input'))return;
    const hit=e.target.closest('[data-pick-line]');if(hit){e.preventDefault();e.stopImmediatePropagation();selectLine(hit.dataset.pickLine);hit.focus();return}
    const cell=cellAt(e.target);if(!cell)return;
    selectLine('');selectedTitleRow=null;
    e.preventDefault();range={first:cell,last:cell};dragging=true;suppressClick=true;highlight();
  },true);
  document.addEventListener('pointermove',e=>{
    if(!dragging)return;
    const cell=cellAt(e.target);if(cell&&cell.row.parentElement===range.first.row.parentElement){range.last=cell;highlight()}
    const scroll=range.first.row.closest('.schedule-scroll'),rect=scroll.getBoundingClientRect();
    if(e.clientX>rect.right-24)scroll.scrollLeft+=24;
    else if(e.clientX<rect.left+24)scroll.scrollLeft-=24;
  });
  document.addEventListener('pointerup',()=>{dragging=false});
  document.addEventListener('pointercancel',()=>{dragging=false});
  window.addEventListener('blur',()=>{dragging=false});
  document.addEventListener('click',e=>{
    if(!suppressClick||!cellAt(e.target)||e.target.closest('input'))return;
    e.preventDefault();e.stopImmediatePropagation();suppressClick=false;
  },true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){range=null;dragging=false;highlight()}});
  function drawRange(cell){
    if(!range||!range.first.row.isConnected){range={first:cell,last:cell};highlight()}
    const rows=[...cell.row.parentElement.querySelectorAll('tr:not(.schedule-annotation)')];
    const a=rows.indexOf(range.first.row),b=rows.indexOf(range.last.row);
    const left=Math.min(range.first.col,range.last.col),right=Math.max(range.first.col,range.last.col);
    const dates=scheduleDates(scheduleSettings().start,scheduleDays(scheduleSettings().type));
    const previousTasks=data.schedule.slice(),previousLines=data.scheduleLines.slice();
    const form=document.querySelector('#scheduleLineForm');
    const isR=(form?.elements.style.value||'').startsWith('r');
    for(let r=Math.min(a,b);r<=(isR?Math.min(a,b):Math.max(a,b));r++){
      const row=rows[r];let taskId=row.dataset.gridTask;
      if(!taskId){
        taskId=uid();
        data.schedule.push({id:taskId,projectId,title:'',gridOnly:true,start:dates[left],end:dates[right],note:'',gridSlot:Number(row.dataset.gridSlot)});
      }
      if(data.scheduleLines.some(l=>l.projectId===projectId&&l.taskId===taskId&&l.cellBottom&&l.start===dates[left]&&l.end===dates[right]&&l.style===(form?.elements.style.value||'solid')))continue;
      data.scheduleLines.push({id:uid(),projectId,taskId,start:dates[left],end:dates[right],style:form?.elements.style.value||'solid',weight:Number(form?.elements.weight.value)||2,color:form?.elements.color.value||'#304960',startMarker:form?.elements.startMarker.value||'none',endMarker:form?.elements.endMarker.value||'none',label:form?.elements.label.value.trim().slice(0,80)||'',cellBottom:true,rowSpan:isR?Math.abs(a-b)+1:1});
    }
    if(!save()){data.schedule=previousTasks;data.scheduleLines=previousLines;return}
    range=null;dragging=false;suppressClick=false;render();
  }
  document.addEventListener('contextmenu',e=>{const cell=cellAt(e.target);if(!cell)return;e.preventDefault();drawRange(cell)});
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-grid-clear]')){range=null;dragging=false;highlight()}
    if(e.target.closest('[data-grid-draw]')){if(range?.first.row.isConnected)drawRange(range.first);else document.querySelector('#schedulePickStatus').textContent='先にセルをドラッグして選択してください';}
  });
  document.addEventListener('change',e=>{
    if(!e.target.closest('#scheduleLineForm'))return;
    const f=document.querySelector('#scheduleLineForm').elements;
    scheduleSettings().lineTools={style:f.style.value,weight:Number(f.weight.value),color:f.color.value,startMarker:f.startMarker.value,endMarker:f.endMarker.value,label:f.label.value};save();
  });


  document.addEventListener('change',e=>{
    if(!e.target.matches('[data-grid-title]'))return;
    const row=e.target.closest('tr'),slot=Number(row.dataset.gridSlot),oldTasks=data.schedule.slice();
    let task=items('schedule').find(s=>s.id===row.dataset.gridTask);
    if(task){data.schedule=data.schedule.map(s=>s===task?{...s,title:e.target.value}:s)}
    else if(e.target.value.trim()){
      task={id:uid(),projectId,title:e.target.value,start:scheduleSettings().start,end:scheduleSettings().start,note:'',gridSlot:slot,gridOnly:true};
      data.schedule.push(task);row.dataset.gridTask=task.id;
    }
    if(!save()){data.schedule=oldTasks;e.target.value=task?.title||''}
  });
  function editCell(cell,initial){
    const td=cell.row.children[cell.col+1];if(td.querySelector('input'))return;
    const old=(data.scheduleCellTexts||[]).find(t=>t.projectId===projectId&&t.slot===Number(cell.row.dataset.gridSlot)&&t.date===td.dataset.gridDate)?.text||'';
    const input=document.createElement('input');input.type='text';input.className='schedule-cell-input';input.maxLength=100;input.value=initial??old;input.setAttribute('aria-label','セルの文字');
    td.append(input);refreshTextOverflow(cell.row);input.focus();if(initial===undefined)input.select();
    let cancelled=false;
    input.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();input.blur()}if(e.key==='Escape'){cancelled=true;input.blur()}});
    input.addEventListener('blur',()=>{
      if(!cancelled){
        const previous=data.scheduleCellTexts||[];
        data.scheduleCellTexts=previous.filter(t=>!(t.projectId===projectId&&t.slot===Number(cell.row.dataset.gridSlot)&&t.date===td.dataset.gridDate));
        if(input.value)data.scheduleCellTexts.push({projectId,slot:Number(cell.row.dataset.gridSlot),date:td.dataset.gridDate,text:input.value});
        if(!save())data.scheduleCellTexts=previous;
        td.querySelector('.schedule-cell-text')?.remove();
        const value=data.scheduleCellTexts.find(t=>t.projectId===projectId&&t.slot===Number(cell.row.dataset.gridSlot)&&t.date===td.dataset.gridDate)?.text;
        if(value){const label=document.createElement('span');label.className='schedule-cell-text';label.textContent=value;td.append(label)}
      }
      input.remove();refreshTextOverflow(cell.row);
    },{once:true});
  }
  document.addEventListener('dblclick',e=>{const cell=cellAt(e.target);if(cell&&!e.target.closest('input')){e.preventDefault();editCell(cell)}});
  document.addEventListener('keydown',e=>{
    if(e.target.closest('input,textarea,select')||e.ctrlKey||e.metaKey||e.altKey)return;
    if(range?.last.row.isConnected&&(e.key.length===1||e.key==='F2'||e.key==='Enter')){
      e.preventDefault();editCell(range.last,e.key.length===1?e.key:undefined);
    }
  });


  document.addEventListener('focusin',e=>{
    if(e.target.matches('[data-grid-title]')){
      selectedTitleRow=e.target.closest('tr');range=null;highlight();
    }
  });
  document.addEventListener('click',e=>{
    const button=e.target.closest('[data-grid-align]');if(!button)return;
    const align=button.dataset.gridAlign;
    if(!['left','center','right'].includes(align))return;
    const previous=data.scheduleCellFormats||[],next=previous.slice(),targets=[];
    if(selectedTitleRow?.isConnected)targets.push({row:selectedTitleRow,date:'title'});
    else if(range?.first.row.isConnected){
      const rows=[...range.first.row.parentElement.querySelectorAll('tr:not(.schedule-annotation)')];
      const a=rows.indexOf(range.first.row),b=rows.indexOf(range.last.row);
      for(let r=Math.min(a,b);r<=Math.max(a,b);r++)
        for(let c=Math.min(range.first.col,range.last.col);c<=Math.max(range.first.col,range.last.col);c++)
          targets.push({row:rows[r],date:rows[r].children[c+1].dataset.gridDate});
    }
    if(!targets.length){document.querySelector('#schedulePickStatus').textContent='配置を変えるセルを選択してください';return}
    for(const target of targets){
      const slot=Number(target.row.dataset.gridSlot);
      const index=next.findIndex(f=>f.projectId===projectId&&f.slot===slot&&f.date===target.date);
      const format={projectId,slot,date:target.date,align};
      if(index>=0)next[index]=format;else next.push(format);
    }
    data.scheduleCellFormats=next;
    if(!save()){data.scheduleCellFormats=previous;return}
    for(const row of new Set(targets.map(t=>t.row))){
      row.querySelector('[data-grid-title]').style.textAlign=cellAlignment(Number(row.dataset.gridSlot),'title');
      refreshTextOverflow(row);
    }
    document.querySelectorAll('[data-grid-align]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  });


  document.addEventListener('focusin',e=>{const hit=e.target.closest('[data-pick-line]');if(hit)selectLine(hit.dataset.pickLine)});
  document.addEventListener('click',e=>{
    const hit=e.target.closest('[data-pick-line]');if(!hit)return;
    e.preventDefault();e.stopImmediatePropagation();selectLine(hit.dataset.pickLine);
  },true);
  document.addEventListener('keydown',e=>{
    if(e.target.closest('input,textarea,select,[contenteditable=true]'))return;
    if(e.key==='Escape'){selectLine('');return}
    if(e.key!=='Delete'||!selectedLineId)return;
    const line=data.scheduleLines.find(l=>l.id===selectedLineId&&l.projectId===projectId);
    if(!line){selectLine('');return}
    e.preventDefault();e.stopImmediatePropagation();
    const previous=data.scheduleLines;
    data.scheduleLines=previous.filter(l=>l!==line);
    if(!save()){data.scheduleLines=previous;return}
    selectedLineId='';range=null;dragging=false;render();
    requestAnimationFrame(()=>{const status=document.querySelector('#schedulePickStatus');if(status)status.textContent='選択した工程線を削除しました。';});
  },true);

  enhance();
})();
