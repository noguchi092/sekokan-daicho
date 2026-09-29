/* Local integrity checks. These records are held on this device and are not a trusted certificate. */
(() => {
  const hex = bytes => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  async function digest(blob) {
    const hash = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
    return {sha256: hex(new Uint8Array(hash)), bytes: blob.size};
  }
  const sourceBlob = photo => fetch(photo.image).then(response => {
    if (!response.ok) throw Error('元画像を読み込めません');
    return response.blob();
  });
  async function record(photo, origin, previous) {
    const original = await digest(await sourceBlob(photo));
    const composite = photo.boardMode === 'post' ? await getCompositePhoto(photo) : null;
    if (photo.boardMode === 'post' && !composite) throw Error('後付け黒板の画像が見つかりません');
    photo.integrity = {version: 1, algorithm: 'SHA-256', scope: 'device', origin,
      recordedAt: new Date().toISOString(), photoId: photo.id, projectId: photo.projectId, mode: photo.boardMode || 'plain', boardId: photo.boardId || '', original,
      composite: composite ? await digest(composite) : null,
      ...(previous ? {revision: (previous.revision || 0) + 1,
        previousOriginalSha256: previous.original?.sha256 || ''} : {})};
    return photo.integrity;
  }
  async function verify(photo) {
    if (!photo.integrity?.original?.sha256) return {status: 'unrecorded', message: '照合記録なし'};
    if (photo.integrity.photoId !== photo.id || photo.integrity.projectId !== photo.projectId ||
        photo.integrity.mode !== (photo.boardMode || 'plain') || photo.integrity.boardId !== (photo.boardId || ''))
      return {status: 'mismatch', message: '不一致：写真の記録情報が変わっています'};
    try {
      const original = await digest(await sourceBlob(photo));
      if (original.sha256 !== photo.integrity.original.sha256 || original.bytes !== photo.integrity.original.bytes)
        return {status: 'mismatch', message: '不一致：元画像が変わっています'};
      if (photo.boardMode === 'post') {
        const composite = await getCompositePhoto(photo);
        if (!composite) return {status: 'missing', message: '確認不可：合成画像が見つかりません'};
        const actual = await digest(composite);
        const expected = photo.integrity.composite;
        if (!expected) return {status: 'unrecorded', message: '合成画像の照合記録なし'};
        if (actual.sha256 !== expected.sha256 || actual.bytes !== expected.bytes)
          return {status: 'mismatch', message: '不一致：合成画像が変わっています'};
      } else if (photo.integrity.composite) {
        return {status: 'mismatch', message: '不一致：写真の種類が変わっています'};
      }
      const origin = photo.integrity.origin;
      return {status: 'match', message: origin === 'legacy' ? '一致：旧データの記録時点から変更なし' :
        origin === 'local-capture' ? '一致：撮影時の保存画像から変更なし' : '一致：端末内の記録から変更なし'};
    } catch (error) {
      return {status: 'missing', message: `確認不可：${error.message || '画像を読み込めません'}`};
    }
  }
  async function initialize() {
    let changed = false;
    for (const photo of data.photos) {
      if (photo.integrity) continue;
      try { await record(photo, 'legacy'); changed = true; }
      catch (error) { console.warn('旧写真の照合記録を作成できません', photo.id, error); }
    }
    if (changed) save();
  }
  window.photoIntegrity = {record, verify};
  window.initializePhotoIntegrity = initialize;
  async function check(id, element) {
    const photo = data.photos.find(p => p.id === id);
    if (!photo) return;
    if (element) { element.disabled = true; element.textContent = '照合中…'; }
    const result = await verify(photo);
    document.querySelectorAll(`[data-integrity-result="${CSS.escape(id)}"]`).forEach(target => {
      target.textContent = result.message; target.dataset.status = result.status;
    });
    if (element) { element.disabled = false; element.textContent = '端末内で照合'; }
    return result;
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-verify-photo]');
    if (button) { check(button.dataset.verifyPhoto, button); return; }
    if (event.target.closest('[data-verify-selected]')) {
      const selected = selectedPhotos();
      if (!selected.length) return;
      const control = event.target.closest('[data-verify-selected]');
      control.disabled = true;
      (async () => {
        const results = [];
        for (const photo of selected) results.push(await verify(photo));
        alert(`${selected.length}枚の照合結果\n一致 ${results.filter(r => r.status === 'match').length}枚 / 不一致 ${results.filter(r => r.status === 'mismatch').length}枚 / 確認不可 ${results.filter(r => !['match','mismatch'].includes(r.status)).length}枚`);
        control.disabled = false;
      })().catch(error => { control.disabled = false; alert(`照合できませんでした: ${error.message}`); });
    }
  });
})();
