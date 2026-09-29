/* PC/gallery import: files or multi-file drop, then choose a destination folder. */
(() => {
  let pendingFiles = [];
  let checklistId = '';
  let busy = false;

  function reset() {
    if (busy) return;
    pendingFiles = [];
    checklistId = '';
  }

  function addFiles(files) {
    const images = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (!images.length) return alert('画像ファイルを選択してください');
    const seen = new Set(pendingFiles.map(file => `${file.name}:${file.size}:${file.lastModified}`));
    for (const file of images) {
      const key = `${file.name}:${file.size}:${file.lastModified}`;
      if (!seen.has(key)) { pendingFiles.push(file); seen.add(key); }
    }
    const summary = document.querySelector('#photoImportSummary');
    if (summary) summary.innerHTML = `<strong>${pendingFiles.length}枚を選択中</strong><ul>${pendingFiles.slice(0, 20).map(file => `<li>${esc(file.name)}</li>`).join('')}</ul>${pendingFiles.length > 20 ? `<small>ほか${pendingFiles.length - 20}枚</small>` : ''}`;
    const next = document.querySelector('#photoImportNext');
    if (next) next.disabled = pendingFiles.length === 0;
  }

  function showFiles() {
    formType = 'photoImport';
    document.querySelector('#modalTitle').textContent = '写真を登録 · 1/2 写真を選択';
    document.querySelector('#entryForm').innerHTML = `
      <p class="hint">写真ファイルを選ぶか、下の枠へまとめてドロップしてください。</p>
      <div id="photoImportDrop" class="photo-import-drop" role="button" tabindex="0" aria-label="複数の写真をドロップ、または写真ファイルを選択">
        <span class="photo-import-drop-icon" aria-hidden="true">▧</span>
        <strong>ここに写真をドロップ</strong>
        <span>複数枚まとめて登録できます</span>
        <button id="photoImportPick" type="button" class="btn secondary">写真ファイルから登録</button>
      </div>
      <input id="photoImportInput" class="photo-import-file" type="file" accept="image/*" multiple aria-label="写真ファイルを選択">
      <div id="photoImportSummary" class="photo-import-summary" aria-live="polite">写真はまだ選択されていません</div>
      <div class="actions"><button id="photoImportCancel" type="button" class="btn secondary">キャンセル</button><button id="photoImportNext" type="submit" class="btn" disabled>次へ：保存フォルダー</button></div>`;
    document.querySelector('#modal').hidden = false;
    const zone = document.querySelector('#photoImportDrop');
    const input = document.querySelector('#photoImportInput');
    zone.addEventListener('click', event => { if (event.target.closest('button')) return; input.click(); });
    zone.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); input.click(); } });
    document.querySelector('#photoImportPick').onclick = () => input.click();
    input.onchange = () => { addFiles(input.files); input.value = ''; };
    zone.addEventListener('dragover', event => { event.preventDefault(); zone.classList.add('dragging'); });
    zone.addEventListener('dragleave', event => { if (!zone.contains(event.relatedTarget)) zone.classList.remove('dragging'); });
    zone.addEventListener('drop', event => {
      event.preventDefault();
      zone.classList.remove('dragging');
      addFiles(event.dataTransfer?.files || []);
    });
    document.querySelector('#photoImportCancel').onclick = () => { reset(); closeForm(); };
  }

  function showFolders() {
    formType = 'photoImportFolder';
    const options = items('photoFolders').map(folder => `<option value="${esc(folder.id)}">${esc(folderPath(folder))}</option>`).join('');
    document.querySelector('#modalTitle').textContent = '写真を登録 · 2/2 保存先を選択';
    document.querySelector('#entryForm').innerHTML = `
      <p class="hint">選択した${pendingFiles.length}枚を同じフォルダーに登録します。</p>
      <label class="field">保存先フォルダー<select name="folderId" id="photoImportFolder" required><option value="" disabled selected>保存先を選択してください</option><option value="none">未分類</option>${options}</select></label>
      <p id="photoImportProgress" class="hint" role="status">写真の登録後、必要に応じて「後付け黒板」を選べます。</p>
      <div class="actions"><button id="photoImportBack" type="button" class="btn secondary">写真を選び直す</button><button id="photoImportSave" type="submit" class="btn">${pendingFiles.length}枚を登録</button></div>`;
    document.querySelector('#photoImportBack').onclick = () => { showFiles(); addFiles(pendingFiles); };
  }

  async function savePhotos() {
    if (busy || !pendingFiles.length) return;
    const select = document.querySelector('#photoImportFolder');
    const destination = select.value;
    if (!destination || (destination !== 'none' && !items('photoFolders').some(folder => folder.id === destination))) return alert('保存先フォルダーを選んでください');
    const button = document.querySelector('#photoImportSave');
    const back = document.querySelector('#photoImportBack');
    const progress = document.querySelector('#photoImportProgress');
    busy = true; button.disabled = back.disabled = true;
    const previousPhotos = data.photos;
    const previousChecks = data.photoChecks ? structuredClone(data.photoChecks) : undefined;
    const previousTasks = structuredClone(data.tasks);
    try {
      const imported = [];
      for (let index = 0; index < pendingFiles.length; index++) {
        progress.textContent = `${index + 1} / ${pendingFiles.length}枚を読み込み中…`;
        const file = pendingFiles[index];
        const entry = {id: uid(), projectId, folderId: destination === 'none' ? '' : destination, date: today(), boardMode: 'plain', image: await shrink(file)};
        await photoIntegrity.record(entry, 'local-import');
        imported.push(entry);
      }
      data.photos = previousPhotos.concat(imported);
      if (checklistId) {
        const check = photoChecks().find(item => item.id === checklistId);
        if (check) {
          check.photoId = imported[0].id; check.status = 'shot';
          items('tasks').filter(task => task.photoCheckId === check.id).forEach(task => task.status = '対応中');
        }
      }
      if (!save()) throw Error('ブラウザの保存容量を超えました。枚数を減らして再度お試しください');
      selectedPhotoFolder = destination === 'none' ? 'none' : destination;
      photoView = 'register';
      activePhotoCheckId = '';
      busy = false; reset(); closeForm(); render();
    } catch (error) {
      data.photos = previousPhotos;
      data.photoChecks = previousChecks;
      data.tasks = previousTasks;
      progress.textContent = `登録できませんでした：${error.message || '画像を確認してください'}`;
      console.error('写真の一括登録に失敗', error);
      busy = false; button.disabled = back.disabled = false;
    }
  }

  document.addEventListener('click', event => {
    const importButton = event.target.closest('[data-action="photo"], [data-check-capture]');
    if (!importButton || mobileCaptureFlow) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (!projectId) return alert('先に現場を登録してください');
    reset();
    checklistId = importButton.dataset.checkCapture || '';
    activePhotoCheckId = checklistId;
    showFiles();
  }, true);
  document.querySelector('#entryForm').addEventListener('submit', event => {
    if (!['photoImport', 'photoImportFolder'].includes(formType)) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (formType === 'photoImport') { if (pendingFiles.length) showFolders(); }
    else savePhotos();
  }, true);
  document.querySelector('#closeModal').addEventListener('click', reset);
})();
