/* Saved editor state is project-scoped. DOM images/canvases are revived on load. */
export function setupSavedWorkspace({state,meta,render,switchView,setPaperLayout,addPhotos,toast}) {
  const params=new URLSearchParams(location.search),projectId=params.get('projectId');
  if(!projectId)throw Error('セコカン台帳で現場を選択して開いてください');
  const key='project:'+projectId,cache=new WeakMap();let ready=false,pending=0,failed=false,queue=Promise.resolve(),inputTimer;
  const status=document.querySelector('#save-status');
  const label=text=>{status.textContent=text;status.dataset.failed=failed?'true':'false'};
  function open(){return new Promise((resolve,reject)=>{const r=indexedDB.open('sekokan-snapshot',1);r.onupgradeneeded=()=>r.result.createObjectStore('workspaces',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('他のタブを閉じて再読み込みしてください'))})}
  async function store(mode,value){const db=await open();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('workspaces',mode),os=tx.objectStore('workspaces'),request=mode==='readonly'?os.get(key):os.put(value);tx.oncomplete=()=>resolve(request.result);tx.onerror=()=>reject(tx.error||request.error);tx.onabort=()=>reject(tx.error||Error('保存が中断されました'))})}finally{db.close()}}
  function canvasSource(canvas){if(!cache.has(canvas))cache.set(canvas,canvas.toDataURL('image/png'));return cache.get(canvas)}
  function serialize(){return {id:key,version:1,projectId,savedAt:new Date().toISOString(),meta:meta(),settings:{paperSize:state.paperSize,orientation:state.orientation,photosPerPage:state.photosPerPage,pageCounts:state.pageCounts,view:state.view,drawingId:state.drawingId,numberSize:state.numberSize,zoom:state.zoom,dzoom:state.dzoom},photos:state.photos.map(p=>{const {img,editedCanvas,originalImage,...rest}=p;return structuredClone(rest)}),drawings:state.drawings.map(d=>{const {canvas,...rest}=d;return {...structuredClone(rest),base:canvasSource(canvas)}})}}
  function schedule(){if(!ready)return;let record;try{record=serialize()}catch(error){failed=true;label('保存できませんでした。再保存してください');console.error(error);return}pending++;label('保存中…');queue=queue.catch(()=>{}).then(()=>store('readwrite',record)).then(()=>{failed=false;label('この端末に保存しました')}).catch(error=>{failed=true;label('保存できませんでした。空き容量を確認して再保存してください');console.error(error)}).finally(()=>{pending--});return queue}
  async function image(source){const img=new Image();img.src=source;await img.decode();return img}
  async function restore(){label('保存した作業を読み込み中…');let record;try{record=await store('readonly')}catch(error){failed=true;label('保存した作業を読み込めませんでした。再読み込みしてください');throw error}
    if(record){if(record.projectId!==projectId||record.version!==1)throw Error('保存データの形式を確認してください');
      const photos=await Promise.all(record.photos.map(async p=>{if(p.blank)return p;const img=await image(p.src),result={...p,img};if(p.annotations?.length||p.rotation){result.originalImage=img;if(p.editedSrc)result.editedCanvas=await image(p.editedSrc)}return result}));
      const drawings=await Promise.all(record.drawings.map(async d=>{const img=await image(d.base),canvas=document.createElement('canvas');canvas.width=d.w;canvas.height=d.h;canvas.getContext('2d').drawImage(img,0,0);cache.set(canvas,d.base);const {base,...rest}=d;return {...rest,canvas}}));
      state.photos=photos;state.drawings=drawings;Object.assign(state,record.settings);state.selected=null;
      for(const [id,value]of Object.entries(record.meta||{})){const el=document.getElementById(id);if(el)el.value=value}
      setPaperLayout(state.paperSize,state.orientation);document.querySelector('#photos-per-page').value=String(state.photosPerPage);switchView(state.view);render();
    }else{document.querySelector('#project').value=params.get('projectName')||'';render()}
    ready=true;label(record?'保存した作業を読み込みました':'写真を追加すると自動保存します');
  }
  const initialized=restore().catch(error=>{toast(error.message||'作業を開けませんでした');throw error});
  const api={ready:initialized,schedule,async flush(){await initialized;clearTimeout(inputTimer);inputTimer=null;schedule();await queue;if(failed)throw Error('スナップショットを保存できませんでした。再保存してください')},async importPhotos(files){await initialized;await addPhotos(files);await api.flush()},upload(){if(!ready){toast('保存した作業の読み込みを待ってください');return}document.querySelector('#photos-input').click()}};
  window.SekokanSnapshot=api;
  document.querySelector('#save-workspace').onclick=()=>api.flush().catch(error=>toast(error.message));
  document.addEventListener('input',e=>{if(!ready||e.target.closest('.photo-editor'))return;clearTimeout(inputTimer);inputTimer=setTimeout(()=>{inputTimer=null;schedule()},200)});
  document.addEventListener('change',e=>{if(ready&&!e.target.closest('.photo-editor'))schedule()});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&ready){clearTimeout(inputTimer);inputTimer=null;schedule()}});
  window.addEventListener('pagehide',()=>{clearTimeout(inputTimer);inputTimer=null;schedule()});
  window.addEventListener('beforeunload',e=>{if(pending||failed||inputTimer){e.preventDefault();e.returnValue=''}});
  return api;
}
