// The chosen drawing stays on this device. OCR runs in the browser.
export async function createOcr(onProgress=()=>{}){
  onProgress('OCRの認識ファイルを読み込み中…（初回は数MBかかります）');
  let engine;
  try{engine=await import('https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.esm.min.js')}
  catch{throw Error('OCRライブラリを読み込めませんでした。通信環境を確認してください')}
  try{
    const worker=await engine.default.createWorker('eng',1,{
      logger:message=>{
        if(message.status==='recognizing text')onProgress(`OCR解析中… ${Math.round(message.progress*100)}%`);
      }
    });
    await worker.setParameters({tessedit_char_whitelist:'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789- '});
    return worker;
  }catch(error){throw Error(`OCRの認識ファイルを準備できませんでした：${error?.message||'通信環境を確認してください'}`)}
}
