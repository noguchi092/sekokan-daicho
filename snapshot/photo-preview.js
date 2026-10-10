export function setupPhotoPreview({getPhoto,photoNumber,document=globalThis.document}) {
  const dialog=document.createElement('dialog');
  dialog.className='photo-preview';
  dialog.setAttribute('aria-labelledby','photo-preview-title');
  dialog.innerHTML='<div class="photo-preview-head"><div><strong id="photo-preview-title"></strong><small id="photo-preview-name"></small></div><button type="button" id="photo-preview-close">閉じる</button></div><div class="photo-preview-image"><img alt=""></div><p class="photo-preview-comment" hidden></p>';
  document.body.append(dialog);
  const image=dialog.querySelector('img'),comment=dialog.querySelector('.photo-preview-comment');
  dialog.querySelector('#photo-preview-close').onclick=()=>dialog.close();
  dialog.onclick=e=>{const r=dialog.getBoundingClientRect();if(e.target===dialog&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))dialog.close()};
  return id=>{const photo=getPhoto(id);if(!photo||photo.blank)return;const number=photoNumber(id);dialog.querySelector('#photo-preview-title').textContent='写真 '+number;dialog.querySelector('#photo-preview-name').textContent=photo.name;image.src=photo.editedSrc||photo.src;image.alt='写真'+number+'の拡大表示';comment.textContent=photo.comment||'';comment.hidden=!photo.comment?.trim();dialog.showModal()};
}

