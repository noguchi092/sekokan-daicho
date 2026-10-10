/* Native Snapshot integration. No iframe or separate editor page. */
let snapshotActiveProject='',snapshotHydration=0,snapshotPickerFolder='all',snapshotPickAnchor='',snapshotAPI=null,snapshotMounting=null,snapshotWide=true;
const snapshotPicked=new Set();
function renderSnapshot(){
  const project=data.projects.find(p=>p.id===projectId);
  return intro('SNAPSHOT','スナップショット',project?.name||'現場を選択してください')+`<section class="snapshot-native-intro"><span class="badge">有料版機能</span><span>写真・図面・指示内容を現場ごとに保存します。元の工事写真は変更しません。</span><button class="btn secondary" data-snapshot-wide>${snapshotWide?'台帳メニューを表示':'作業画面を広げる'}</button></section>`;
}
let snapshotDependencies;
function loadSnapshotDependencies(){
  return snapshotDependencies ||= Promise.all(['jszip.min.js','pdf-lib.min.js'].map(name=>new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src=new URL('snapshot/vendor/'+name,location.href).href;script.onload=resolve;script.onerror=()=>reject(Error('出力機能を読み込めません。通信環境を確認してください'));document.head.append(script);
  }))).catch(error=>{snapshotDependencies=null;throw error});
}
async function hydrateSnapshot(){
  let host=$('#snapshotHost');if(!host){host=document.createElement('section');host.id='snapshotHost';host.hidden=true;document.querySelector('main').append(host)}
  document.body.classList.toggle('snapshot-wide',page==='snapshot'&&snapshotWide);
  document.body.classList.toggle('snapshot-page',page==='snapshot');
  host.hidden=page!=='snapshot'||!projectId;if(host.hidden){host.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close());return}
  const site=projectId,token=++snapshotHydration;
  if(snapshotActiveProject===site&&(snapshotAPI||snapshotMounting))return;
  if(snapshotMounting){try{await snapshotMounting}catch{}}
  if(token!==snapshotHydration||site!==projectId||page!=='snapshot')return;
  if(snapshotAPI){try{await snapshotAPI.flush()}catch{alert('スナップショットを保存できませんでした。元の現場に戻ります。再保存してください。');projectId=snapshotActiveProject;render();return}}
  if(token!==snapshotHydration||site!==projectId||page!=='snapshot')return;
  snapshotAPI?.dispose();snapshotAPI=null;snapshotActiveProject=site;
  host.innerHTML='<p class="snapshot-loading" role="status">写真・図面の編集機能を読み込み中…</p>';
  snapshotMounting=(async()=>{
    await loadSnapshotDependencies();
    const {mountSnapshotEditor}=await import(new URL('snapshot/editor.js?v=20261010-native',location.href).href);
    snapshotAPI=await mountSnapshotEditor(host,{projectId:site,projectName:data.projects.find(p=>p.id===site)?.name||''});
    return snapshotAPI;
  })();
  try{await snapshotMounting}catch(error){snapshotActiveProject='';host.innerHTML=`<p class="snapshot-loading" role="alert">${esc(error.message||'編集機能を読み込めませんでした。再読み込みしてください')}</p>`;throw error}finally{snapshotMounting=null}
}
function snapshotEditor(){if(snapshotActiveProject!==projectId||!snapshotAPI){alert('編集画面を読み込んでいます。少し待ってから操作してください。');return null}return snapshotAPI}
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
    if(site!==projectId||snapshotActiveProject!==site)throw Error('現場が切り替わったため読み込みを中止しました');
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
document.addEventListener('click',e=>{if(page!=='snapshot'||!e.target.closest('[data-snapshot-wide],#menu'))return;e.preventDefault();e.stopImmediatePropagation();snapshotWide=!snapshotWide;document.querySelector('.sidebar')?.classList.toggle('open',!snapshotWide);render()},true);
