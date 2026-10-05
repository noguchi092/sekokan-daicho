const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const handlers={},stored=new Map();let sequence=0,fail=false,saveOK=true;
const c={console,structuredClone,Promise,data:{projects:[{id:'p',name:'現場'}]},projectId:'p',page:'measurements',uid:()=>`id${++sequence}`,today:()=> '2026-10-06',save:()=>saveOK,esc:s=>String(s??''),intro:()=>'',alert(){},confirm:()=>true,render(){},items:key=>c.data[key].filter(x=>x.projectId===c.projectId),document:{addEventListener(t,f){(handlers[t]||=[]).push(f)},querySelector(){return null},querySelectorAll(){return []}},window:{addEventListener(){}}};
vm.createContext(c);vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../assets/measurements.js'),'utf8'),c);
const run=s=>vm.runInContext(s,c);
c.batch=async docs=>{if(fail)throw Error('quota');for(const d of docs)stored.set(d.id,structuredClone(d))};
run(`measureStoreBatch=batch;disposeMeasurePdf=async()=>{};measureReady=true;measureLoaded=true;measureFolders();measureFolder='id1';
measureDocs=[{id:'records',projectId:'p',folderId:'id1',type:'records',rows:[{id:'r1',number:7,kind:'鉄骨',code:'C1',values:[{actual:'10'}],boltLayout:{columns:2,rows:2},boltMeasurements:{'2x2':{1:{x:'-2',y:'3'}}}}],marks:[],lastNumber:7},
{id:'pdf',projectId:'p',folderId:'id1',name:'配置.pdf',file:{bytes:'original'},rows:[{id:'r2',number:8,kind:'鉄骨',values:[]}],marks:[{rowId:'r1',x:.25,y:.5,page:1,tool:'point',color:'#000'}],lastNumber:8},
{id:'other',projectId:'other',folderId:'id2',rows:[{id:'foreign',number:1}],marks:[]}];measureDocId='pdf';measureRowId='r1'`);
(async()=>{
 const html=run('renderMeasurements()');
 assert.equal(run("measureFolderCount('id1')"),2);assert.equal(run("measureFolderPDFCount('id1')"),1);assert.equal(run("measureFolderPDFCount('all')"),1);assert.equal(run("measureFolderPDFCount('none')"),0);
 assert(html.includes('aria-label="PDF 1件"'));assert(html.includes('measure-folder-counts'));
 const css=fs.readFileSync(require('node:path').join(__dirname,'../assets/measurements.css'),'utf8');assert(css.includes('grid-template-columns:repeat(5,minmax(0,1fr))'));assert(css.includes('@container(max-width:420px)'));
 assert.equal((html.match(/id="measurePdfFile"/g)||[]).length,1);
 assert.equal((html.match(/data-measure-new /g)||[]).length,1);
 assert(html.indexOf('measure-top-actions')<html.indexOf('measure-folder-records'));
 assert(html.indexOf('visual-folder-grid')<html.indexOf('measure-folder-records'));
 assert(html.indexOf('measureRecordForm')<html.indexOf('measure-library'));
 assert(html.includes('data-drag-folder="measure:id1"'));assert(html.includes('data-measure-doc-delete="pdf"'));
 assert(html.includes('data-measure-drag-kind="row"'));assert(html.includes('data-measure-drag-kind="pdf"'));assert(html.includes('data-measure-drop-folder="id2"'));
 assert.equal(await run("moveMeasureItem('row','r1','id2')"),true);
 assert.equal(run("measureRecordOwner('r1').folderId"),'id2');
 assert.equal(run("measureRecordOwner('r1').rows[0].number"),7);
 assert.equal(run("measureRecordOwner('r1').rows[0].boltMeasurements['2x2'][1].x"),'-2');
 assert.equal(run("measureDocs.find(d=>d.id==='pdf').marks[0].rowId"),'r1');
 assert.equal(run("measureFolderRows().some(r=>r.id==='r1')"),false);
 run("measureRowId='r1'");assert(run('renderMeasurements()').includes('measureRecordForm')); // Linked PDF can still open a moved record.
 assert.equal(await run("moveMeasureItem('pdf','pdf','id2')"),true);
 assert.equal(stored.get('pdf').folderId,'id2');assert.equal(stored.get('pdf').file.bytes,'original');assert.equal(stored.get('pdf').rows[0].number,8);assert.equal(stored.get('pdf').marks[0].x,.25);
 assert.equal(run("measureFolderPDFCount('id1')"),0);assert.equal(run("measureFolderPDFCount('id2')"),1);
 assert.equal(await run("moveMeasureItem('pdf','pdf','none')"),true);assert.equal(stored.get('pdf').folderId,'');
 assert.equal(run("measureFolderPDFCount('none')"),1);
 const before=run('JSON.stringify(measureDocs)');fail=true;
 assert.equal(await run("moveMeasureItem('row','r1','id3')"),false);assert.equal(run('JSON.stringify(measureDocs)'),before);fail=false;
 assert.equal(await run("moveMeasureItem('row','foreign','id1')"),false);
 assert.equal(await run("moveMeasureItem('row','r1','missing')"),false);
 assert.equal(await run("moveMeasureItem('row','r1','all')"),false);
 assert.equal(await run("moveMeasureItem('row','r1','id1','other')"),false);
 assert.equal(await run("moveMeasureItem('row','r1','id2')"),false);
 assert.equal(run('nextMeasureNumber()'),9);
 // Exercise the delegated drag/drop route, including visual target metadata.
 const classes={add(){},remove(){}};const item={dataset:{measureDragKind:'row',measureDragId:'r1'},textContent:'No.7',classList:classes};
 const transfer={setData(){},effectAllowed:'',dropEffect:''};
 await handlers.dragstart[0]({target:{closest:()=>item},dataTransfer:transfer,preventDefault(){}});
 assert.equal(transfer.effectAllowed,'all');
 const target={dataset:{measureDropFolder:'id3'},classList:classes};let prevented=false;
 await handlers.dragover[0]({target:{closest:()=>target},dataTransfer:transfer,preventDefault(){prevented=true}});assert(prevented);
 await handlers.drop[0]({target:{closest:()=>target},preventDefault(){}});assert.equal(run("measureRecordOwner('r1').folderId"),'id3');
 c.restored=structuredClone(Array.from(stored.values()));run('measureDocs=restored');assert.equal(run("measureRecordOwner('r1').rows[0].number"),7);assert.equal(run("measureDocs.find(d=>d.id==='pdf').marks[0].rowId"),'r1');
 // Measurement folders use the same tested folder drag mechanism as photo management.
 const app=fs.readFileSync(require('node:path').join(__dirname,'../assets/app.js'),'utf8');
 for(const name of ['sortedFolderList','moveFolderByDrop'])vm.runInContext(app.split('\n').find(l=>l.startsWith('function '+name+'(')),c);
 assert.equal(run("moveFolderByDrop('measure','id3','id2','before')"),true);
 assert.deepEqual(Array.from(run('measureSortedFolders(measureFolders())'),f=>f.id),['id1','id3','id2','id4']);
 assert.equal(run("moveFolderByDrop('measure','id3','id2','inside')"),true);assert.equal(run("measureFolders().find(f=>f.id==='id3').parentId"),'id2');
 assert.equal(run("moveFolderByDrop('measure','id2','id3','inside')"),false);
 const original=JSON.stringify(c.data.measureFolders);saveOK=false;assert.equal(run("moveFolderByDrop('measure','id4','id2','after')"),false);assert.equal(JSON.stringify(c.data.measureFolders),original);saveOK=true;
 // Cancel the wrong upload by its own delete button, without affecting a selected different PDF.
 run("measureDocs.push({id:'wrong',projectId:'p',folderId:'',name:'wrong.pdf',file:{},rows:[],marks:[]});measureDocId='pdf'");
 const button={dataset:{measureDocDelete:'wrong'},hasAttribute:key=>key==='data-measure-doc-delete'};
 await handlers.click.find(fn=>fn.toString().includes('[data-measure-folder],[data-measure-folder-add]'))({target:{closest:()=>button}});
 assert.equal(run("measureDocs.find(d=>d.id==='wrong').type"),'records');assert.equal(run("measureDocs.find(d=>d.id==='wrong').file"),undefined);assert.equal(run('measureDocId'),'pdf');
 assert.equal(run("measureFolderPDFCount('none')"),1); // Cancelled PDF is excluded; retained records do not count as files.
 assert.equal(run("measureDocs.find(d=>d.id==='pdf').marks[0].rowId"),'r1');
 console.log('PASS: folder/record/PDF order, shared folder drag/reorder/nesting/cycle checks, per-upload PDF cancellation, atomic record moves, numbers/XY/PDF links and save rollback');
})().catch(e=>{console.error(e);process.exitCode=1});
