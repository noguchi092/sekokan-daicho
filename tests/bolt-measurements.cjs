const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const handlers={};let focused=false,svgHTML='';
const input={value:'',scrollIntoView(){},focus(){focused=true;}};
const svg={set outerHTML(value){svgHTML=value;}};
const c={console,structuredClone,Promise,esc:s=>String(s??'').replace(/"/g,'&quot;'),projectId:'p',document:{addEventListener(type,fn){(handlers[type]||=[]).push(fn);},querySelector(selector){return selector==='.measure-bolt-diagram'?svg:selector.includes('data-measure-bolt-number')?input:null;},querySelectorAll(){return[];}},window:{addEventListener(){}}};
vm.createContext(c);vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../assets/measurements.js'),'utf8'),c);const run=code=>vm.runInContext(code,c);
const points=run('measureBoltPoints({columns:3,rows:3})');assert.deepEqual(Array.from(points,p=>[p.number,p.x,p.y]),[[1,70,70],[2,160,70],[3,250,70],[4,250,160],[5,250,250],[6,160,250],[7,70,250],[8,70,160]]);
for(let columns=2;columns<=20;columns++)for(let rows=2;rows<=20;rows++){const p=run(`measureBoltPoints({columns:${columns},rows:${rows}})`);assert.equal(p.length,2*columns+2*rows-4);assert.equal(new Set(p.map(b=>`${b.x},${b.y}`)).size,p.length);assert.deepEqual(Array.from(p,b=>b.number),Array.from({length:p.length},(_,i)=>i+1));}
run("measureDocs=[{id:'owner',type:'records',projectId:'p',rows:[{id:'r',number:10,kind:'鉄骨',code:'C1',values:[{label:'位置ずれ X',actual:'99'}],boltLayout:{columns:3,rows:3,plateWidth:'600',plateHeight:'600'}}],marks:[]},{id:'pdf',projectId:'p',rows:[],marks:[{rowId:'r',page:1,x:.5,y:.5}]}];measureDocId='pdf';measureRowId='r';persistMeasure=doc=>{globalThis.saved=structuredClone(doc)}");
const onInput=handlers.input[0];
for(const [number,axis,value] of [[1,'x','+3'],[1,'y','-2'],[8,'x','0']])onInput({target:{dataset:{measureBoltNumber:String(number),measureBoltAxis:axis},value,closest(){return {};}}});
assert.equal(c.saved.id,'owner');assert.equal(c.saved.rows[0].boltMeasurements['3x3'][1].x,'+3');assert.equal(c.saved.rows[0].boltMeasurements['3x3'][1].y,'-2');assert.equal(c.saved.rows[0].boltMeasurements['3x3'][8].x,'0');assert.equal(c.saved.rows[0].values[0].actual,'99');assert.equal(c.saved.rows[0].number,10);
run("measureCurrentRow().boltLayout.columns=4");assert.equal(run('measureBoltValues(measureCurrentRow(),1).x'),'');run("setMeasureBoltValue(measureCurrentRow(),1,'x','7');measureCurrentRow().boltLayout.columns=3");assert.equal(run('measureBoltValues(measureCurrentRow(),1).x'),'+3');
run('setMeasureBoltValue(measureCurrentRow(),99,"x","bad")');assert.equal(run('measureCurrentRow().boltMeasurements["3x3"][99]'),undefined);
run('selectMeasureBolt(8)');assert(focused);assert(svgHTML.includes('data-bolt-select="8"'));assert(svgHTML.includes('#f59e0b'));
const sign=handlers.click.find(fn=>fn.toString().includes('[data-bolt-sign-number]'));
sign({target:{closest(){return{dataset:{boltSignNumber:'1',boltSignAxis:'x'}};}}});assert.equal(run('measureBoltValues(measureCurrentRow(),1).x'),'-3');sign({target:{closest(){return{dataset:{boltSignNumber:'1',boltSignAxis:'x'}};}}});assert.equal(run('measureBoltValues(measureCurrentRow(),1).x'),'3');
const table=run('renderMeasureBoltTable(measureCurrentRow())');assert.equal((table.match(/data-bolt-input-row=/g)||[]).length,8);assert(table.includes('Yずれ（mm）'));assert(table.includes('従来の'));assert.equal(JSON.parse(JSON.stringify(c.saved)).rows[0].boltMeasurements['3x3'][1].y,'-2');
console.log('PASS: clockwise numbering for all layouts, per-bolt signed X/Y, original record save, layout archives restore, click selects input, sign controls, legacy values and record/PDF numbers preserved');
