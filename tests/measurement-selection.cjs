const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const handlers={},stored=new Map();let seq=0,fail=false;
const c={console,structuredClone,Promise,projectId:'p',page:'measurements',data:{projects:[{id:'p'}]},uid:()=>`f${++seq}`,save:()=>true,today:()=>'',esc:s=>String(s??''),intro:()=>'',alert(){},confirm:()=>true,render(){},document:{addEventListener(t,f){(handlers[t]||=[]).push(f)},querySelector(){return null},querySelectorAll(){return []}},window:{addEventListener(){}}};
vm.createContext(c);vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../assets/measurements.js'),'utf8'),c);const run=s=>vm.runInContext(s,c);
c.batch=async docs=>{if(fail)throw Error('quota');docs.forEach(d=>stored.set(d.id,structuredClone(d)))};
run(`measureStoreBatch=batch;measureReady=true;measureLoaded=true;measureFolder=measureFolders()[0].id;
measureDocs=[{id:'records',projectId:'p',folderId:measureFolder,type:'records',rows:Array.from({length:6},(_,i)=>({id:'r'+(i+1),number:i+1,kind:'鉄骨',title:'測定'+i,values:[{actual:String(i)}],boltMeasurements:{'2x2':{1:{x:'-2',y:'3'}}}})),marks:[],lastNumber:6},
{id:'pdf1',projectId:'p',folderId:measureFolder,name:'a.pdf',file:{data:1},rows:[],marks:[{rowId:'r2'},{rowId:'r4'}],lastNumber:0},
{id:'pdf2',projectId:'p',folderId:measureFolder,name:'b.pdf',file:{data:2},rows:[],marks:[{rowId:'r2'},{rowId:'r6'}],lastNumber:0},
{id:'foreign',projectId:'other',folderId:'f1',rows:[{id:'other-row',number:1}],marks:[]}];syncMeasureSelection();`);
(async()=>{
 run("selectMeasureRecord('r2');selectMeasureRecord('r5',true)");assert.deepEqual(Array.from(run('selectedMeasureIds')),['r2','r3','r4','r5']);
 run("selectMeasureRecord('r3')");assert.equal(run("selectedMeasureIds.has('r3')"),false);assert.equal(run('measureRowId'),'');
 const click=handlers.click.find(f=>f.toString().includes('e.stopImmediatePropagation()'));let stopped=false;
 const el={dataset:{measureRow:'r6'}};click({target:{closest:s=>s==='[data-measure-row]'?el:null},ctrlKey:true,shiftKey:false,preventDefault(){},stopImmediatePropagation(){stopped=true}});assert(stopped);assert.equal(run("selectedMeasureIds.has('r6')"),true);assert.equal(run('measureRowId'),'');
 const controls=handlers.click.find(f=>f.toString().includes("[data-measure-select-all],[data-measure-select-clear]"));
 const event=attr=>({target:{closest:()=>({hasAttribute:a=>a===attr})}});
 await controls(event('data-measure-select-all'));assert.equal(run('selectedMeasureIds.size'),6);
 assert.equal((run('renderMeasureRecordList()').match(/data-measure-check=/g)||[]).length,6);assert(run('renderMeasureSelectionBar()').includes('6件選択中'));
 await controls(event('data-measure-select-clear'));assert.equal(run('selectedMeasureIds.size'),0);
 run("selectMeasureRecord('r1');selectMeasureRecord('r3',true)");fail=true;const before=run('JSON.stringify(measureDocs)');
 assert.equal(await run("bulkMeasureRecords('move',[...selectedMeasureIds],'f2')"),false);assert.equal(run('JSON.stringify(measureDocs)'),before);assert.equal(run('selectedMeasureIds.size'),3);fail=false;
 assert.equal(await run("bulkMeasureRecords('move',[...selectedMeasureIds],'f2')"),true);
 assert.equal(run("measureRecordOwner('r2').folderId"),'f2');assert.equal(run("measureRecordOwner('r2').rows.find(r=>r.id==='r2').number"),2);assert.equal(run("measureRecordOwner('r2').rows.find(r=>r.id==='r2').boltMeasurements['2x2'][1].x"),'-2');assert.equal(run("measureDocs.find(d=>d.id==='pdf1').marks.length"),2);assert.equal(run('selectedMeasureIds.size'),0);
 assert.equal(await run("bulkMeasureRecords('delete',['r2','r4','other-row'])"),true);
 assert.equal(run("measureAllRows().some(r=>['r2','r4'].includes(r.id))"),false);assert.equal(run("measureDocs.find(d=>d.id==='pdf1').marks.length"),0);assert.equal(run("measureDocs.find(d=>d.id==='pdf2').marks[0].rowId"),'r6');assert.equal(run("measureDocs.find(d=>d.id==='foreign').rows.length"),1);assert.equal(run('nextMeasureNumber()'),7);assert.equal(stored.get('pdf1').file.data,1);
 run("measureFolder='all';syncMeasureSelection();selectMeasureRecord('r1');selectMeasureRecord('r6',true)");assert.equal(run('selectedMeasureIds.size'),4);run("measureFolder='f2';syncMeasureSelection()");assert.equal(run('selectedMeasureIds.size'),0);assert.equal(run('measureSelectionAnchor'),'');
 console.log('PASS: checkboxes, Shift ranges, Ctrl additive selection, select/clear all, folder resets, atomic batch moves/deletes, failed-save rollback, fixed numbers/XY/PDF links and project isolation');
})().catch(e=>{console.error(e);process.exitCode=1});
