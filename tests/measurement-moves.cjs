const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const handlers={},stored=new Map();let sequence=0,fail=false;
const c={console,structuredClone,Promise,data:{projects:[{id:'p',name:'現場'}]},projectId:'p',page:'measurements',uid:()=>`id${++sequence}`,today:()=> '2026-10-06',save:()=>true,esc:s=>String(s??''),intro:()=>'',alert(){},render(){},document:{addEventListener(t,f){(handlers[t]||=[]).push(f)},querySelector(){return null},querySelectorAll(){return []}},window:{addEventListener(){}}};
vm.createContext(c);vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../assets/measurements.js'),'utf8'),c);
const run=s=>vm.runInContext(s,c);
c.batch=async docs=>{if(fail)throw Error('quota');for(const d of docs)stored.set(d.id,structuredClone(d))};
run(`measureStoreBatch=batch;disposeMeasurePdf=async()=>{};measureReady=true;measureLoaded=true;measureFolders();measureFolder='id1';
measureDocs=[{id:'records',projectId:'p',folderId:'id1',type:'records',rows:[{id:'r1',number:7,kind:'鉄骨',code:'C1',values:[{actual:'10'}],boltLayout:{columns:2,rows:2},boltMeasurements:{'2x2':{1:{x:'-2',y:'3'}}}}],marks:[],lastNumber:7},
{id:'pdf',projectId:'p',folderId:'id1',name:'配置.pdf',file:{bytes:'original'},rows:[{id:'r2',number:8,kind:'鉄骨',values:[]}],marks:[{rowId:'r1',x:.25,y:.5,page:1,tool:'point',color:'#000'}],lastNumber:8},
{id:'other',projectId:'other',folderId:'id2',rows:[{id:'foreign',number:1}],marks:[]}];measureDocId='pdf';measureRowId='r1'`);
(async()=>{
 const html=run('renderMeasurements()');
 assert.equal((html.match(/id="measurePdfFile"/g)||[]).length,1);
 assert.equal((html.match(/data-measure-new /g)||[]).length,1);
 assert(html.indexOf('measure-top-actions')<html.indexOf('measure-folder-records'));
 assert(html.indexOf('measureRecordForm')<html.indexOf('measure-library'));
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
 assert.equal(await run("moveMeasureItem('pdf','pdf','none')"),true);assert.equal(stored.get('pdf').folderId,'');
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
 assert.equal(transfer.effectAllowed,'move');
 const target={dataset:{measureDropFolder:'id3'},classList:classes};let prevented=false;
 await handlers.dragover[0]({target:{closest:()=>target},dataTransfer:transfer,preventDefault(){prevented=true}});assert(prevented);
 await handlers.drop[0]({target:{closest:()=>target},preventDefault(){}});assert.equal(run("measureRecordOwner('r1').folderId"),'id3');
 c.restored=structuredClone(Array.from(stored.values()));run('measureDocs=restored');assert.equal(run("measureRecordOwner('r1').rows[0].number"),7);assert.equal(run("measureDocs.find(d=>d.id==='pdf').marks[0].rowId"),'r1');
 console.log('PASS: upper records/right toolbar, atomic row/PDF moves, fixed numbers/XY/PDF links, reload, failure rollback, project isolation and drag/drop events');
})().catch(e=>{console.error(e);process.exitCode=1});
