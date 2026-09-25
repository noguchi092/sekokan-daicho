const PDFJS_VERSION='5.6.205';
const PDFJS_URL=`https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.min.mjs`;
const PDFJS_WORKER=`https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;
let pdfjsPromise;
async function getPdfJs(){
  pdfjsPromise ||= import(PDFJS_URL).then(pdfjs=>{pdfjs.GlobalWorkerOptions.workerSrc=PDFJS_WORKER;return pdfjs}).catch(error=>{pdfjsPromise=null;throw error});
  return pdfjsPromise;
}
export async function cropPdfDiagram(file){
  if(!file||!(file.type==='application/pdf'||/\.pdf$/i.test(file.name)))throw Error('PDFファイルを選択してください');
  if(file.size>80*1024*1024)throw Error('80MB以下のPDFを選択してください');
  let pdfjs;
  try{pdfjs=await getPdfJs()}catch{throw Error('PDF表示機能を読み込めませんでした。通信環境を確認してください')}
  let task,pdf;
  try{task=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())});pdf=await task.promise}
  catch(error){await task?.destroy();throw Error(error?.name==='PasswordException'?'パスワード付きPDFは開けません':'PDFを開けませんでした。ファイルを確認してください')}
  return new Promise(resolve=>{
    const overlay=document.createElement('div');overlay.className='pdf-crop-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','PDFから豆図を切り出す');
    overlay.innerHTML=`<div class="pdf-crop-dialog"><div class="pdf-crop-header"><div><h2>PDFから豆図を切り出す</h2><p>${file.name.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</p></div><button type="button" class="pdf-crop-close" aria-label="閉じる">×</button></div><div class="pdf-crop-toolbar"><button type="button" class="pdf-prev">前のページ</button><span class="pdf-page-info"></span><button type="button" class="pdf-next">次のページ</button><label>拡大 <select class="pdf-zoom"><option value="1">100%</option><option value="1.5">150%</option><option value="2">200%</option><option value="3">300%</option><option value="4">400%</option></select></label></div><p class="pdf-crop-help">豆図にしたい範囲をドラッグして囲んでください。図面が大きい場合はスクロールできます。</p><div class="pdf-crop-scroll"><div class="pdf-crop-page"><canvas aria-label="PDFのページ"></canvas><div class="pdf-crop-selection" hidden></div></div></div><div class="pdf-crop-footer"><span class="pdf-crop-message" role="status"></span><button type="button" class="pdf-all">ページ全体を使う</button><button type="button" class="pdf-confirm" disabled>選択範囲を豆図にする</button></div></div>`;
    document.body.append(overlay);
    const canvas=overlay.querySelector('canvas'),selection=overlay.querySelector('.pdf-crop-selection'),message=overlay.querySelector('.pdf-crop-message'),confirm=overlay.querySelector('.pdf-confirm');
    const previous=overlay.querySelector('.pdf-prev'),next=overlay.querySelector('.pdf-next'),zoomInput=overlay.querySelector('.pdf-zoom');
    let pageNumber=1,area=null,start=null,renderTask=null,busy=false,closed=false;
    const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
    function position(event){const rect=canvas.getBoundingClientRect();return {x:clamp(event.clientX-rect.left,0,canvas.width),y:clamp(event.clientY-rect.top,0,canvas.height)}}
    function setArea(a){area=a;selection.hidden=!a;confirm.disabled=!a;if(a){Object.assign(selection.style,{left:`${a.x}px`,top:`${a.y}px`,width:`${a.width}px`,height:`${a.height}px`})}}
    async function render(){if(closed||busy)return;busy=true;previous.disabled=next.disabled=zoomInput.disabled=true;setArea(null);message.textContent='ページを表示しています…';
      try{const page=await pdf.getPage(pageNumber);const base=page.getViewport({scale:1});const scale=Math.min(900/base.width*Number(zoomInput.value),4800/Math.max(base.width,base.height));const viewport=page.getViewport({scale});canvas.width=Math.floor(viewport.width);canvas.height=Math.floor(viewport.height);const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);renderTask=page.render({canvas,canvasContext:ctx,viewport});await renderTask.promise;message.textContent='範囲を選択してください';overlay.querySelector('.pdf-page-info').textContent=`${pageNumber} / ${pdf.numPages} ページ`}
      catch(error){if(!closed)message.textContent='このページを表示できませんでした'}
      finally{busy=false;if(!closed){previous.disabled=pageNumber<=1;next.disabled=pageNumber>=pdf.numPages;zoomInput.disabled=false}}}
    }
    canvas.onpointerdown=event=>{if(busy)return;event.preventDefault();start=position(event);canvas.setPointerCapture(event.pointerId);setArea(null)};
    canvas.onpointermove=event=>{if(!start)return;let end=position(event),a={x:Math.min(start.x,end.x),y:Math.min(start.y,end.y),width:Math.abs(end.x-start.x),height:Math.abs(end.y-start.y)};setArea(a.width>=8&&a.height>=8?a:null)};
    canvas.onpointerup=event=>{if(!start)return;let end=position(event),a={x:Math.min(start.x,end.x),y:Math.min(start.y,end.y),width:Math.abs(end.x-start.x),height:Math.abs(end.y-start.y)};start=null;setArea(a.width>=12&&a.height>=12?a:null);message.textContent=area?'選択範囲を確認して登録してください':'少し広い範囲を選択してください'};
    canvas.onpointercancel=()=>{start=null;setArea(null)};
    previous.onclick=()=>{if(pageNumber>1){pageNumber--;render()}};next.onclick=()=>{if(pageNumber<pdf.numPages){pageNumber++;render()}};zoomInput.onchange=render;
    overlay.querySelector('.pdf-all').onclick=()=>setArea({x:0,y:0,width:canvas.width,height:canvas.height});
    async function close(result){if(closed)return;closed=true;document.removeEventListener('keydown',onKey);renderTask?.cancel();overlay.remove();canvas.width=canvas.height=0;try{await task.destroy()}catch{}resolve(result)}
    function onKey(event){if(event.key==='Escape')close(null)}document.addEventListener('keydown',onKey);
    overlay.querySelector('.pdf-crop-close').onclick=()=>close(null);
    confirm.onclick=()=>{if(!area||busy)return;const ratio=Math.min(1,1000/Math.max(area.width,area.height)),out=document.createElement('canvas');out.width=Math.max(1,Math.round(area.width*ratio));out.height=Math.max(1,Math.round(area.height*ratio));const ctx=out.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,out.width,out.height);ctx.drawImage(canvas,area.x,area.y,area.width,area.height,0,0,out.width,out.height);const result=out.toDataURL('image/jpeg',.88);out.width=out.height=0;close(result)};
    render();
  })
}
