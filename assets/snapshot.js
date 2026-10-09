/* Integrate the existing Snapshot editor without touching source photos. */
let snapshotFrameProject='',snapshotHydration=0,snapshotPickerFolder='all',snapshotPickAnchor='';
const snapshotPicked=new Set();
function renderSnapshot(){
  const project=data.projects.find(p=>p.id===projectId);
  return intro('SNAPSHOT','スナップショット',project?.name||'現場を選択してください')+`<section class="card snapshot-entry"><div><span class="badge">有料版機能</span><p>写真を並べて指示内容を記入し、図面に写真番号を配置できます。作業内容は現場ごとにこの端末に保存します。</p></div><div class="intro-actions"><button class="btn" data-snapshot-folder ${!projectId?'disabled':''}>写真管理フォルダーから読み込む</button><button class="btn secondary" data-snapshot-upload ${!projectId?'disabled':''}>写真をアップロード</button></div></section>`;
}
async function hydrateSnapshot(){
  let host=$('#snapshotHost');if(!host){host=document.createElement('section');host.id='snapshotHost';host.hidden=true;document.querySelector('main').append(host)}
  host.hidden=page!=='snapshot'||!projectId;
  if(host.hidden)return;
  const site=projectId,token=++snapshotHydration;
  if(snapshotFrameProject===site&&host.querySelector('iframe'))return;
  const previous=host.querySelector('iframe');
  if(previous){try{await previous.contentWindow.SekokanSnapshot?.flush()}catch{alert('スナップショットを保存できませんでした。元の現場に戻ります。再保存してください。');projectId=snapshotFrameProject;render();return}}
  if(token!==snapshotHydration||page!=='snapshot'||site!==projectId)return;
  snapshotFrameProject=site;
  const frame=document.createElement('iframe');frame.id='snapshotEditor';frame.title='スナップショット 写真指示書の編集';
  const url=new URL('snapshot/index.html',location.href);url.searchParams.set('projectId',site);url.searchParams.set('projectName',data.projects.find(p=>p.id===site)?.name||'');url.searchParams.set('v','20261009-integration');frame.src=url.href;
  host.replaceChildren(frame);
}
function snapshotEditor(){const frame=$('#snapshotEditor');if(snapshotFrameProject!==projectId||!frame?.contentWindow.SekokanSnapshot){alert('編集画面を読み込んでいます。少し待ってから操作してください。');return null}return frame.contentWindow.SekokanSnapshot}
function snapshotFolderPhotos(){return items('photos').filter(p=>snapshotPickerFolder==='all'||(snapshotPickerFolder==='none'?!p.folderId:isInFolder(p.folderId,snapshotPickerFolder)))}
function snapshotPicker(){
  let dialog=$('#snapshotPhotoPicker');if(!dialog){dialog=document.createElement('dialog');dialog.id='snapshotPhotoPicker';dialog.className='snapshot-picker';dialog.setAttribute('aria-label','写真管理から読み込む');document.body.append(dialog)}
  const photos=snapshotFolderPhotos();for(const id of snapshotPicked)if(!photos.some(p=>p.id===id))snapshotPicked.delete(id);
  dialog.innerHTML=`<div class="section-head"><h2>写真管理から読み込む</h2><button class="btn secondary" data-snapshot-close>閉じる</button></div><label>写真フォルダー<select id="snapshotFolder"><option value="all">すべての写真</option><option value="none">未分類</option>${items('photoFolders').map(f=>`<option value="${esc(f.id)}">${esc(folderPath(f))}</option>`).join('')}</select></label><p class="hint">子フォルダーの写真も表示します。Shiftクリックで範囲選択できます。元の写真はそのまま残ります。</p><div class="snapshot-picker-actions"><button class="btn secondary" data-snapshot-pick-all>一括選択</button><button class="btn secondary" data-snapshot-pick-clear>選択解除</button><label><input id="snapshotUseBoard" type="checkbox" checked> 黒板付きの写真を読み込む</label></div><div class="snapshot-photo-grid">${photos.map(p=>`<label class="snapshot-photo-choice"><input type="checkbox" data-snapshot-photo="${esc(p.id)}" ${snapshotPicked.has(p.id)?'checked':''}><img src="${esc(p.image)}" alt="${esc(p.title||p.date||'工事写真')}" loading="lazy"><span>${esc(p.title||p.boardName||p.category||'工事写真')}<small>${esc(p.date||'')}</small></span></label>`).join('')||'<p class="empty">このフォルダーには写真がありません。</p>'}</div><div class="snapshot-picker-bottom"><span id="snapshotPickedCount">${snapshotPicked.size}枚を選択</span><button class="btn" data-snapshot-import ${!snapshotPicked.size?'disabled':''}>選択した写真を読み込む</button></div><p id="snapshotImportStatus" role="status"></p>`;
  $('#snapshotFolder').value=snapshotPickerFolder;
  if(!dialog.open)dialog.showModal();
}
function refreshSnapshotPicked(){document.querySelectorAll('[data-snapshot-photo]').forEach(box=>box.checked=snapshotPicked.has(box.dataset.snapshotPhoto));$('#snapshotPickedCount').textContent=`${snapshotPicked.size}枚を選択`;$('[data-snapshot-import]').disabled=!snapshotPicked.size}
async function importSnapshotPhotos(){
  const editor=snapshotEditor();if(!editor)return;
  const site=projectId,photos=snapshotFolderPhotos().filter(p=>snapshotPicked.has(p.id)),withBoard=$('#snapshotUseBoard').checked,button=$('[data-snapshot-import]'),status=$('#snapshotImportStatus');button.disabled=true;
  const files=[];let errors=0;
  try{for(const [i,photo]of photos.entries()){status.textContent=`写真を準備中 ${i+1} / ${photos.length}`;try{const blob=withBoard?(await getCompositePhoto(photo)||await photoDownloadBlob(photo)):await(await fetch(photo.image)).blob();const file=new File([blob],`${photo.date||'写真'}_${photo.title||photo.boardName||i+1}.jpg`,{type:blob.type||'image/jpeg'});file.sekokanPhotoId=photo.id;files.push(file)}catch{errors++}}
    if(site!==projectId||snapshotFrameProject!==site)throw Error('現場が切り替わったため読み込みを中止しました');
    if(!files.length)throw Error('写真を読み込めませんでした。写真管理で元の写真を確認してください');
    await editor.importPhotos(files);$('#snapshotPhotoPicker').close();snapshotPicked.clear();if(errors)alert(`${errors}枚は読み込めませんでした。その他の写真は追加しました。`);
  }catch(error){status.textContent=error.message||'読み込みに失敗しました';button.disabled=false}
}
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-snapshot-folder],[data-snapshot-upload],[data-snapshot-close],[data-snapshot-pick-all],[data-snapshot-pick-clear],[data-snapshot-import],[data-snapshot-photo]');if(!el)return;
  if(el.hasAttribute('data-snapshot-folder')){if(!snapshotEditor())return;snapshotPicked.clear();snapshotPickerFolder='all';snapshotPickAnchor='';snapshotPicker()}
  else if(el.hasAttribute('data-snapshot-upload'))snapshotEditor()?.upload();
  else if(el.hasAttribute('data-snapshot-close'))$('#snapshotPhotoPicker').close();
  else if(el.hasAttribute('data-snapshot-pick-all')){snapshotFolderPhotos().forEach(p=>snapshotPicked.add(p.id));refreshSnapshotPicked()}
  else if(el.hasAttribute('data-snapshot-pick-clear')){snapshotPicked.clear();refreshSnapshotPicked()}
  else if(el.hasAttribute('data-snapshot-import'))importSnapshotPhotos();
  else {const id=el.dataset.snapshotPhoto,photos=snapshotFolderPhotos(),index=photos.findIndex(p=>p.id===id),anchor=photos.findIndex(p=>p.id===snapshotPickAnchor),checked=el.checked;if(e.shiftKey&&anchor>=0)photos.slice(Math.min(index,anchor),Math.max(index,anchor)+1).forEach(p=>checked?snapshotPicked.add(p.id):snapshotPicked.delete(p.id));else checked?snapshotPicked.add(id):snapshotPicked.delete(id);snapshotPickAnchor=id;refreshSnapshotPicked()}
});
document.addEventListener('change',e=>{if(e.target.id==='snapshotFolder'){snapshotPickerFolder=e.target.value;snapshotPicked.clear();snapshotPickAnchor='';snapshotPicker()}});
