const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const handlers = {}, stored = new Map(); let sequence = 0, saveOK = true, failWrite = false, promptAnswer = '';
const c = {console: {error() {}}, structuredClone, Promise, data: {projects: [{id:'site1',name:'現場1'}]}, projectId: 'site1', page: 'measurements', uid: () => `f${++sequence}`, save: () => saveOK, esc: String, intro: (_, title) => title, alert() {}, confirm: () => true, prompt: () => promptAnswer, render() {}, document: {addEventListener(type, fn) {(handlers[type] ||= []).push(fn);}, querySelector() {return null;}}, window: {addEventListener() {}}};
vm.createContext(c); vm.runInContext(fs.readFileSync(require('node:path').join(__dirname, '../assets/measurements.js'), 'utf8'), c);
const run = code => vm.runInContext(code, c);
function click(selector, dataset = {}, attribute = '') {return {target: {closest(s) {return s.includes(selector) ? {dataset, hasAttribute: key => key === attribute} : null;}}};}
(async () => {
    const roots = run('measureFolders()'); assert.equal(roots.length, 4);
    run("measureLoaded=true;measureReady=true;measureFolder=measureFolders()[0].id;measureDocs=[{id:'d',projectId:'site1',folderId:measureFolder,name:'test.pdf',rows:[{id:'r',values:[{actual:'24'}]}],marks:[{rowId:'r'}]},{id:'other',projectId:'site2',folderId:'f1',rows:[],marks:[]}]");
    c.writeBatch = async docs => {if (failWrite) throw Error('quota'); for (const doc of docs) stored.set(doc.id, structuredClone(doc));};
    run('measureStoreBatch=writeBatch;disposeMeasurePdf=async()=>{}');
    promptAnswer = '1階'; await handlers.click.find(fn=>fn.toString().includes("[data-measure-folder],[data-measure-folder-add]"))(click('[data-measure-folder-add]', {}, 'data-measure-folder-add'));
    const child = run('measureFolder'); assert.equal(run(`measureInFolder('${child}','f1')`), true);
    assert.equal(run('measureVisibleDocs().length'), 0);
    run("measureDocs[0].folderId=measureFolder");
    const html = run('renderMeasurements()'); assert(html.includes('実測・検査')); assert(html.includes('visual-folder-grid')); assert(html.includes('photo-folder-sidebar')); assert(html.includes('data-measure-folder-delete'));
    await run(`deleteMeasureFolder('${child}')`);
    assert.equal(run('measureDocs[0].folderId'), 'f1'); assert.equal(stored.get('d').rows[0].values[0].actual, '24'); assert.equal(stored.get('d').marks.length, 1);
    saveOK = false; await run("deleteMeasureFolder('f1')"); assert.equal(run("measureFolders().some(f=>f.id==='f1')"), true); assert.equal(stored.get('d').folderId, 'f1'); saveOK = true;
    failWrite = true; await run("deleteMeasureFolder('f1')"); assert.equal(run("measureFolders().some(f=>f.id==='f1')"), true); failWrite = false;
    await run("deleteMeasureFolder('f1')"); assert.equal(run("measureFolders().some(f=>f.id==='f1')"), false); assert.equal(run('measureDocs[0].folderId'), ''); assert.equal(run('measureDocs[1].folderId'), 'f1');
    run("measureFolder='none'"); assert.equal(run('measureVisibleDocs().length'), 1);
    const snapshot = JSON.parse(JSON.stringify(c.data)); c.data = snapshot; assert.equal(run('measureFolders().length'), 3); // deleted default does not reappear
    run("measureFolder='f2'"); promptAnswer = '0'; await handlers.click[1](click('[data-measure-folder-move]', {}, 'data-measure-folder-move')); assert.equal(run("measureFolders().find(f=>f.id==='f2').parentId"), '');
    console.log('PASS: nested folders, shared folder styles, delete retains records/marks, failed saves roll back, site isolation, defaults stay deleted, move');
})().catch(error => {console.error(error); process.exitCode = 1;});
