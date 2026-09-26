import {loadPdfEngine} from './pdf-crop.js?v=7';

function clearLongLines(context,width,height){
  const image=context.getImageData(0,0,width,height),pixels=image.data;
  const dark=index=>pixels[index]<150&&pixels[index+1]<150&&pixels[index+2]<150;
  const white=index=>{pixels[index]=255;pixels[index+1]=255;pixels[index+2]=255};
  for(let y=0;y<height;y++){
    let start=-1;
    for(let x=0;x<=width;x++){
      const black=x<width&&dark((y*width+x)*4);
      if(black&&start<0)start=x;
      if(!black&&start>=0){
        if(x-start>Math.min(240,width*.16))for(let i=start;i<x;i++)white((y*width+i)*4);
        start=-1;
      }
    }
  }
  for(let x=0;x<width;x++){
    let start=-1;
    for(let y=0;y<=height;y++){
      const black=y<height&&dark((y*width+x)*4);
      if(black&&start<0)start=y;
      if(!black&&start>=0){
        if(y-start>Math.min(240,height*.11))for(let i=start;i<y;i++)white((i*width+x)*4);
        start=-1;
      }
    }
  }
  context.putImageData(image,0,0);
}

export async function extractDrawingSigns(file,prefixText,onProgress=()=>{},ocrMode='auto'){
  if(!file||!(file.type==='application/pdf'||/\.pdf$/i.test(file.name)))throw Error('PDFファイルを選択してください');
  if(file.size>80*1024*1024)throw Error('80MB以下のPDFを選択してください');
  const prefixes=[...new Set(prefixText.normalize('NFKC').toUpperCase().split(/[,，、\s]+/).map(x=>x.trim()).filter(x=>/^[A-Z]{1,4}$/.test(x)))].sort((a,b)=>b.length-a.length);
  if(!prefixes.length)throw Error('符号の先頭文字を入力してください（例：G,C,W）');
  const pdfjs=await loadPdfEngine();
  const task=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())});
  let pdf;
  try{pdf=await task.promise}
  catch(error){await task.destroy();throw Error(error?.name==='PasswordException'?'パスワード付きPDFは開けません':'PDFを読み込めませんでした')}
  let textPages=0,ocrPages=0,found=new Map(),ocrWorker;
  const regex=new RegExp(`(?<![A-Z0-9])(?:${prefixes.join('|')})[\\s－-]*\\d{1,4}(?:[－-][A-Z0-9]{1,3})?(?![A-Z0-9])`,'g');
  function addMatches(phrase,n){
    for(const match of phrase.normalize('NFKC').toUpperCase().matchAll(regex)){
      const code=match[0].replace(/[\s－]/g,'').replace(/--+/g,'-');
      let row=found.get(code);
      if(!row){row={code,pages:[],count:0};found.set(code,row)}
      row.count++;
      if(!row.pages.includes(n))row.pages.push(n);
    }
  }
  try{
    for(let n=1;n<=pdf.numPages;n++){
      onProgress(`${n} / ${pdf.numPages} ページを確認中…`);
      const page=await pdf.getPage(n),text=await page.getTextContent();
      const items=text.items.filter(x=>typeof x.str==='string'&&x.str.trim());
      if(items.length)textPages++;
      const lines=new Map();
      for(const item of items){
        const y=Math.round((item.transform?.[5]||0)/3),x=item.transform?.[4]||0;
        if(!lines.has(y))lines.set(y,[]);
        lines.get(y).push({str:item.str.normalize('NFKC').toUpperCase(),x,width:item.width||0,height:item.height||10});
      }
      const countBefore=[...found.values()].reduce((sum,row)=>sum+row.count,0);
      for(const line of lines.values()){
        line.sort((a,b)=>a.x-b.x);
        let phrase='',previous=null;
        for(const part of line){
          if(previous&&part.x-(previous.x+previous.width)>Math.max(5,part.height*.45))phrase+=' ';
          phrase+=part.str;
          previous=part;
        }
        addMatches(phrase,n);
      }
      if(ocrMode==='all'||(ocrMode==='auto'&&countBefore===[...found.values()].reduce((sum,row)=>sum+row.count,0))){
        if(!ocrWorker){const {createOcr}=await import('./ocr-engine.js?v=2');ocrWorker=await createOcr(onProgress)}
        onProgress(`${n} / ${pdf.numPages} ページをOCRで確認中…`);
        const viewport=page.getViewport({scale:Math.min(3,2200/page.getViewport({scale:1}).width)});
        const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
        const context=canvas.getContext('2d',{willReadFrequently:true});
        try{
          await page.render({canvasContext:context,canvas,viewport}).promise;
          clearLongLines(context,canvas.width,canvas.height);
          const result=await ocrWorker.recognize(canvas);
          addMatches(result.data.text,n);ocrPages++;
        }finally{canvas.width=0;canvas.height=0}
      }
    }
    const rows=[...found.values()].sort((a,b)=>a.code.localeCompare(b.code,'ja',{numeric:true}));
    return {rows,pageCount:pdf.numPages,textPages,ocrPages};
  }finally{if(ocrWorker)await ocrWorker.terminate();await task.destroy()}
}
