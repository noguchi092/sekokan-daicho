let bulkBoardPositions=new Map(),bulkBoardPreviewId='',bulkBoardStep='placement',bulkBoardEdits=new Map(),bulkBoardReviewed=new Set(),bulkBoardSourceId='';
fields.bulkBoard.html='<p class="hint">黒板を選び、写真を1枚ずつ確認します。各写真で配置した後、記入内容を編集できます。元画像と登録済みの黒板は保持されます。</p><div class="bulk-board-picker"><label class="field">黒板名で検索<input id="bulkBoardSearch" type="search" placeholder="黒板名・記入内容を検索"></label><label class="field">黒板フォルダー<select id="bulkBoardFolder"></select></label><label class="field">黒板を選択<select id="boardSelect" name="boardId"></select></label></div><div id="bulkBoardPlacement"></div>';
function resetBulkBoardPlacement(){
  bulkBoardPositions=new Map();bulkBoardPreviewId=selectedPhotos()[0]?.id||'';bulkBoardStep='placement';
  bulkBoardEdits=new Map();bulkBoardReviewed=new Set();bulkBoardSourceId='';
}
function bulkBoardPositionFor(photo){
  let position=bulkBoardPositions.get(photo.id);if(position)return position;
  let overlay=photo.boardOverlay||{};
  return Number.isFinite(overlay.xRatio)&&Number.isFinite(overlay.yRatio)?{xRatio:overlay.xRatio,yRatio:overlay.yRatio}:{xRatio:.55,yRatio:.58};
}
function bulkBoardDraftFor(photo,board){
  if(!bulkBoardEdits.has(photo.id)){
    let previous=photo.boardMode==='post'&&photo.boardId===board.id?photo.boardOverlay:null;
    bulkBoardEdits.set(photo.id,{fields:(previous?.fields||board.fields||[]).map(f=>({label:f.label||'',value:f.value||''})),note:previous?.note??board.note??''});
  }
  return bulkBoardEdits.get(photo.id);
}
function clampBoardPreview(){
  let stage=document.querySelector('#bulkBoardStage'),overlay=document.querySelector('#bulkBoardDrag');
  if(!stage||!overlay||overlay.hidden)return;
  let photo=selectedPhotos().find(p=>p.id===bulkBoardPreviewId);if(!photo)return;
  overlay.style.width=`${Math.min(stage.clientWidth*.43,stage.clientHeight*.8*4/3)}px`;
  let position=bulkBoardPositionFor(photo),maxX=Math.max(0,1-overlay.offsetWidth/stage.clientWidth),maxY=Math.max(0,1-overlay.offsetHeight/stage.clientHeight);
  let x=Math.max(0,Math.min(maxX,position.xRatio)),y=Math.max(0,Math.min(maxY,position.yRatio));
  overlay.style.left=`${x*100}%`;overlay.style.top=`${y*100}%`;bulkBoardPositions.set(photo.id,{xRatio:x,yRatio:y});
}
function renderBulkBoardPlacement(){
  const area=document.querySelector('#bulkBoardPlacement');if(!area||formType!=='bulkBoard')return;
  let board=items('blackboards').find(b=>b.id===document.querySelector('#boardSelect')?.value),photos=selectedPhotos();
  if(!photos.length){area.innerHTML='<p class="hint">写真を選択してください。</p>';return}
  if(!board){area.innerHTML='<p class="hint">黒板を外す場合はそのまま保存してください。黒板を付ける場合は上で選んでください。</p>';return}
  if(bulkBoardSourceId!==board.id){
    bulkBoardSourceId=board.id;bulkBoardEdits.clear();bulkBoardReviewed.clear();bulkBoardPositions.clear();
    bulkBoardStep='placement';bulkBoardPreviewId=photos[0].id;
  }
  if(!photos.some(p=>p.id===bulkBoardPreviewId))bulkBoardPreviewId=photos[0].id;
  let index=photos.findIndex(p=>p.id===bulkBoardPreviewId),photo=photos[index],draft=bulkBoardDraftFor(photo,board);
  area.innerHTML=`<section class="bulk-placement">
    <div class="bulk-photo-strip" aria-label="後付け黒板を付ける写真">${photos.map((p,i)=>`<button type="button" class="bulk-photo-tab ${p.id===photo.id?'active':''}" data-bulk-photo="${esc(p.id)}" aria-current="${p.id===photo.id?'step':'false'}"><img src="${esc(p.image)}" alt=""><span>写真 ${i+1}${bulkBoardReviewed.has(p.id)?' ✓':''}</span></button>`).join('')}</div>
    <div class="bulk-progress">写真 ${index+1} / ${photos.length}　・　${bulkBoardStep==='placement'?'① 黒板を配置':'② 黒板内容を編集'}　・　確認済み ${bulkBoardReviewed.size} / ${photos.length}</div>
    <div class="bulk-workspace">
      <div class="bulk-placement-main"><p class="hint">黒板をドラッグして配置します。写真の外へは動きません。</p><div class="bulk-placement-stage" id="bulkBoardStage"><img id="bulkBoardImage" src="${esc(photo.image)}" alt="写真 ${index+1} の黒板位置"><div class="bulk-placement-board" id="bulkBoardDrag" role="img" aria-label="ドラッグして黒板を移動">${boardPreview({...board,...draft,date:photo.date})}</div></div></div>
      <div class="bulk-placement-side">${bulkBoardStep==='placement'?
        `<h3>写真 ${index+1} の配置</h3><p>黒板を写真内の好きな位置に動かしてください。</p><button type="button" class="btn" data-bulk-step="edit">位置を決めて内容編集へ</button>`:
        `<h3>写真 ${index+1} の黒板内容</h3><p class="hint">この写真だけの内容を編集します。元の黒板は変わりません。</p><div class="bulk-edit-fields">${draft.fields.map((field,i)=>`<div class="bulk-edit-row"><label>項目名<input data-bulk-field="${i}" data-bulk-part="label" maxlength="30" value="${esc(field.label)}"></label><label>記入内容<input data-bulk-field="${i}" data-bulk-part="value" maxlength="120" value="${esc(field.value)}"></label></div>`).join('')}<label>備考<textarea data-bulk-note maxlength="300">${esc(draft.note)}</textarea></label></div><div class="bulk-step-actions"><button type="button" class="btn secondary" data-bulk-step="placement">配置に戻る</button><button type="button" class="btn" data-bulk-confirm>${index<photos.length-1?'この写真を確認して次へ':'この写真を確認'}</button></div>`}</div>
    </div>
    <div class="bulk-navigation"><button type="button" class="btn secondary" data-bulk-prev ${index===0?'disabled':''}>← 前の写真</button><button type="button" class="btn secondary" data-bulk-next ${index===photos.length-1?'disabled':''}>次の写真 →</button></div>
  </section>`;
  let image=area.querySelector('#bulkBoardImage');if(image.complete&&image.naturalWidth)clampBoardPreview();else image.onload=clampBoardPreview;
}
function bulkBoardSelectPhoto(id){
  if(!selectedPhotos().some(p=>p.id===id))return;
  bulkBoardPreviewId=id;bulkBoardStep='placement';renderBulkBoardPlacement();
}
document.addEventListener('click',e=>{
  if(formType!=='bulkBoard')return;
  let photo=e.target.closest('[data-bulk-photo]'),step=e.target.closest('[data-bulk-step]'),prev=e.target.closest('[data-bulk-prev]'),next=e.target.closest('[data-bulk-next]'),confirm=e.target.closest('[data-bulk-confirm]');
  if(photo){bulkBoardSelectPhoto(photo.dataset.bulkPhoto);return}
  if(step){bulkBoardStep=step.dataset.bulkStep;renderBulkBoardPlacement();return}
  if(prev||next){let photos=selectedPhotos(),index=photos.findIndex(p=>p.id===bulkBoardPreviewId)+(next?1:-1);if(photos[index])bulkBoardSelectPhoto(photos[index].id);return}
  if(confirm){bulkBoardReviewed.add(bulkBoardPreviewId);let photos=selectedPhotos(),index=photos.findIndex(p=>p.id===bulkBoardPreviewId);if(photos[index+1])bulkBoardSelectPhoto(photos[index+1].id);else renderBulkBoardPlacement()}
});
document.addEventListener('change',e=>{
  if(e.target.id==='boardSelect'&&formType==='bulkBoard')renderBulkBoardPlacement();
  else if(e.target.id==='bulkBoardFolder'&&formType==='bulkBoard')queueMicrotask(renderBulkBoardPlacement);
});
document.addEventListener('input',e=>{
  if(e.target.id==='bulkBoardSearch'&&formType==='bulkBoard'){queueMicrotask(renderBulkBoardPlacement);return}
  if(formType!=='bulkBoard')return;let draft=bulkBoardEdits.get(bulkBoardPreviewId);if(!draft)return;
  if(e.target.hasAttribute('data-bulk-note'))draft.note=e.target.value;
  else if(e.target.hasAttribute('data-bulk-field')){
    let field=draft.fields[Number(e.target.dataset.bulkField)];if(!field)return;field[e.target.dataset.bulkPart]=e.target.value;
  }else return;
  bulkBoardReviewed.delete(bulkBoardPreviewId);
  let board=items('blackboards').find(b=>b.id===document.querySelector('#boardSelect')?.value);
  let overlay=document.querySelector('#bulkBoardDrag'),photo=selectedPhotos().find(p=>p.id===bulkBoardPreviewId);
  if(overlay&&board&&photo){overlay.innerHTML=boardPreview({...board,...draft,date:photo.date});requestAnimationFrame(clampBoardPreview)}
});
document.addEventListener('pointerdown',e=>{
  let board=e.target.closest('#bulkBoardDrag');if(!board||formType!=='bulkBoard')return;e.preventDefault();
  let stage=board.parentElement,rect=board.getBoundingClientRect(),offsetX=e.clientX-rect.left,offsetY=e.clientY-rect.top,photoId=bulkBoardPreviewId;
  board.setPointerCapture(e.pointerId);
  let move=event=>{
    let bounds=stage.getBoundingClientRect(),maxX=Math.max(0,bounds.width-board.offsetWidth),maxY=Math.max(0,bounds.height-board.offsetHeight);
    let x=Math.max(0,Math.min(maxX,event.clientX-bounds.left-offsetX)),y=Math.max(0,Math.min(maxY,event.clientY-bounds.top-offsetY));
    board.style.left=`${x}px`;board.style.top=`${y}px`;
    bulkBoardPositions.set(photoId,{xRatio:x/bounds.width,yRatio:y/bounds.height});bulkBoardReviewed.delete(photoId);
  };
  let end=()=>{board.removeEventListener('pointermove',move);board.removeEventListener('pointerup',end);board.removeEventListener('pointercancel',end)};
  board.addEventListener('pointermove',move);board.addEventListener('pointerup',end);board.addEventListener('pointercancel',end);
});
async function saveBulkBoardPhotos(e){
  e.preventDefault();e.stopImmediatePropagation();
  let photos=selectedPhotos(),boardId=document.querySelector('#boardSelect')?.value||'',board=items('blackboards').find(b=>b.id===boardId);
  if(!photos.length)return alert('写真を選択してください');
  if(photos.some(p=>p.boardMode==='capture'||p.boardMode==='legacy-baked'))return alert('撮影時の黒板付き写真は後から変更できません。黒板なしの写真を選択してください');
  if(boardId&&!board)return alert('黒板を選び直してください');
  if(board){let missing=photos.find(p=>!bulkBoardReviewed.has(p.id));if(missing){bulkBoardSelectPhoto(missing.id);return alert('すべての写真で黒板の位置と内容を確認してください')}}
  let previousPhotos=data.photos.slice(),previousBoards=data.blackboards.slice(),previousById=new Map(photos.map(p=>[p.id,p])),photoNumber=new Map(photos.map((p,i)=>[p.id,i+1])),oldComposites=new Map();
  let button=e.currentTarget.querySelector('[type=submit]');if(button){button.disabled=true;button.textContent='画像を保存中…'}
  try{
    for(const photo of photos){
      if(!photo.integrity)throw Error('照合記録のない写真です。ページを再読み込みしてください');
      let result=await photoIntegrity.verify(photo);if(result.status!=='match')throw Error(`${result.message}。写真を変更できません`);
      oldComposites.set(photo.id,await getCompositePhoto(photo));
    }
    let descendants=new Map(),newBoards=[];
    let updated=data.photos.map(p=>{
      if(!previousById.has(p.id))return p;let next={...p};
      if(!board){
        delete next.boardId;delete next.boardName;delete next.boardFields;delete next.boardOverlay;delete next.compositeKey;
        next.useCompositePreview=false;next.boardMode='plain';next.category='';next.location='';return next;
      }
      let draft=bulkBoardDraftFor(p,board),fields=draft.fields.map(f=>({label:f.label.trim(),value:f.value.trim()})),note=draft.note.trim();
      if(fields.some(f=>!f.label))throw Error('項目名を入力してください');
      let isEdited=JSON.stringify(fields)!==JSON.stringify(boardFieldSnapshot(board))||note!==(board.note||'');
      let assignedBoard=board;
      if(isEdited){
        let key=JSON.stringify([fields,note]);
        let existing=descendants.get(key)||items('blackboards').find(b=>b.parentBoardId===board.id&&JSON.stringify(boardFieldSnapshot(b))===JSON.stringify(fields)&&(b.note||'')===note);
        if(existing)assignedBoard=existing;
        else{
          assignedBoard={...board,id:uid(),name:`${board.name} · 後付け ${photoNumber.get(p.id)}`,parentBoardId:board.id,fields,note,isDefault:false,favorite:false,lastUsedAt:new Date().toISOString()};
          newBoards.push(assignedBoard);descendants.set(key,assignedBoard);
        }
      }
      next.boardId=assignedBoard.id;next.boardName=assignedBoard.name;next.boardFields=fields;
      next.boardOverlay={fields,note,footer:board.footer||'',splitLast:!!board.splitLast,diagram:board.diagram||'',style:board.style||'',bottomRatio:0,...bulkBoardPositionFor(p)};
      next.category=fields.find(x=>x.label==='工種')?.value||'';
      next.location=fields.find(x=>['撮影場所','施工箇所','測点','工事場所'].includes(x.label))?.value||'';
      next.compositeKey=next.id;next.useCompositePreview=true;next.boardMode='post';return next;
    });
    let changed=updated.filter(p=>previousById.has(p.id));
    let composites=board?await Promise.all(changed.map(async p=>({id:p.id,blob:await photoDownloadBlob(p)}))):[];
    for(const item of composites){await compositeStore('put',item.id,item.blob);window.invalidateCompositePreview?.(item.id)}
    for(const photo of changed)await photoIntegrity.record(photo,photo.boardMode==='post'?'post-added':'local-import',previousById.get(photo.id).integrity);
    data.photos=updated;data.blackboards=[...previousBoards,...newBoards];if(!save())throw Error('写真と黒板の照合記録を保存できませんでした');
    if(!board)for(const p of changed){await compositeStore('delete',p.id).catch(console.error);window.invalidateCompositePreview?.(p.id)}
    if(board){board.lastUsedAt=new Date().toISOString();save()}
    closeForm();render();
  }catch(error){
    data.photos=previousPhotos;data.blackboards=previousBoards;
    for(const [id,blob] of oldComposites){if(blob)await compositeStore('put',id,blob).catch(console.error);else await compositeStore('delete',id).catch(console.error);window.invalidateCompositePreview?.(id)}
    console.error('後付け黒板の保存に失敗',error);alert(error.message||'黒板合成画像を保存できませんでした');
  }finally{if(button){button.disabled=false;button.textContent='保存'}}
}

