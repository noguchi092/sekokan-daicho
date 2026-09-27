import {loadPdfEngine} from './pdf-crop.js?v=7';

// These are review suggestions, not an interpretation of contract requirements.
export const PHOTO_RULES=[
  {id:'beam',group:'梁の配筋',keywords:/梁配筋|大梁|小梁|梁伏|梁リスト|主筋|スターラップ|あばら筋|G\d{1,3}/i,checks:[
    ['上端筋','コンクリート打設後は配筋を確認できないため','梁全体と上端筋の径・本数が読める近景を撮る','図面の符号・径・本数と現物を照合する'],
    ['下端筋','コンクリート打設後は配筋を確認できないため','梁下側の主筋が見える位置から径・本数を記録する','下端筋の径・本数と配置を照合する'],
    ['中間筋・腹筋','後から見えなくなる中間の配筋を残すため','梁側面から中間筋・腹筋の位置と本数を撮る','図面指定の有無、径と本数を確認する'],
    ['あばら筋・間隔','せん断補強筋の配置を後から確認するため','梁端部と中央部で寸法が読める状態を撮る','径・ピッチ・端部の補強範囲を照合する'],
    ['主筋の継手・定着','継手位置や定着長さは打設後に確認できないため','梁端部・柱梁接合部をスケールとともに撮る','継手・定着位置と長さを図面で確認する'],
    ['かぶり厚さ・スペーサー','構造体のかぶり確保を確認するため','型枠と鉄筋の間隔、スペーサー位置を撮る','設計かぶりとスペーサー配置を確認する'],
    ['開口補強・貫通部','開口周りの補強は打設後に隠れるため','開口全景と補強筋を近景で撮る','開口位置、補強筋の径と本数を照合する'],
    ['梁の符号・撮影位置','各写真がどの梁を示すか特定するため','通り芯・階・梁符号が追える全景を撮る','図面上の位置と梁符号を確認する']
  ]},
  {id:'column',group:'柱の配筋',keywords:/柱配筋|柱リスト|柱主筋|帯筋|フープ|柱伏|C\d{1,3}/i,checks:[
    ['柱主筋の径・本数','打設後は柱主筋が見えなくなるため','柱の全周と主筋が読める近景を撮る','図面の柱符号、径、本数を照合する'],
    ['帯筋・フープの径・間隔','帯筋の配置を残すため','柱頭・柱脚・中央部でスケールを添えて撮る','ピッチと端部の密な範囲を確認する'],
    ['柱の継手・定着','継手位置・定着が後で確認できないため','継手と柱梁接合部を位置が分かるように撮る','施工図と現物の位置・長さを確認する'],
    ['柱のかぶり・スペーサー','型枠に隠れるかぶりを確認するため','型枠と柱筋との距離が分かる写真を撮る','かぶりとスペーサーの配置を確認する']
  ]},
  {id:'slab',group:'床・スラブの配筋',keywords:/スラブ配筋|床配筋|床伏|スラブ筋|デッキスラブ/i,checks:[
    ['上端筋・下端筋','打設で上下の配筋が隠れるため','全景に加え上端・下端が区別できる位置から撮る','鉄筋径・ピッチ・上下の位置を照合する'],
    ['配筋間隔・重ね継手','施工後のピッチと継手を残すため','スケールを添えて配筋と重ね部分を撮る','図面のピッチ・重ね長さを確認する'],
    ['開口・段差部の補強','局所補強が埋まるため','開口、スラブ段差、端部を個別に撮る','補強筋の径・本数と範囲を照合する'],
    ['かぶり・サポート','上端筋と下端筋の高さを残すため','スペーサーとサポートを近景で撮る','かぶりと鉄筋の位置を確認する']
  ]},
  {id:'wall',group:'壁の配筋',keywords:/壁配筋|耐力壁|壁リスト|壁筋|開口補強筋/i,checks:[
    ['壁縦筋・横筋','打設後は壁配筋が見えないため','壁全景と径・間隔の分かる近景を撮る','縦横の径・ピッチ・位置を照合する'],
    ['壁開口補強','開口周辺の補強が隠れるため','各開口と四隅の補強筋を撮る','図面の補強筋と定着を確認する'],
    ['かぶり・継手','両面のかぶりと継手を残すため','型枠・スペーサー・継手を撮る','かぶりと継手長さを確認する']
  ]},
  {id:'concrete',group:'コンクリート',keywords:/コンクリート|打設|生コン|配合計画|圧縮強度/i,checks:[
    ['打設前の型枠・配筋','打設後の内部状態を追えるようにするため','清掃状況、型枠、配筋の全景を撮る','打設前確認と図面との相違を確認する'],
    ['受入れ・品質試験','受入れ時の材料と試験結果を残すため','納入伝票、採取・測定の状況を撮る','契約図書の試験項目・頻度を確認する'],
    ['打設・締固め・養生','施工手順と養生の状況を残すため','打設位置、締固め、養生を時系列で撮る','施工計画との整合を確認する']
  ]},
  {id:'waterproof',group:'防水',keywords:/防水|止水|水張|シーリング/i,checks:[
    ['下地・防水層','仕上げ後に防水層が見えなくなるため','下地、各層の施工範囲を工程ごとに撮る','仕様書の材料・重ね・納まりを確認する'],
    ['端部・貫通部・止水','漏水に関わる納まりを残すため','端部、ドレン、配管貫通部を個別に撮る','設計納まりと止水処理を照合する'],
    ['試験・確認結果','引渡し後に試験経過を確認できるようにするため','試験の開始・経過・終了時の状態を撮る','設計図書の試験方法と判定条件を確認する']
  ]},
  {id:'foundation',group:'基礎・地業',keywords:/基礎|杭|地業|根切|砕石|捨てコンクリート/i,checks:[
    ['掘削・支持地盤','基礎施工後に地盤面が見えなくなるため','掘削底・支持層の位置と状態を撮る','設計図書の支持地盤・深さと照合する'],
    ['基礎の配筋・かぶり','打設後は基礎筋が見えないため','全景、主筋、継手、かぶりを撮る','径・本数・ピッチ・かぶりを図面で確認する']
  ]},
  {id:'equipment',group:'設備の隠ぺい部',keywords:/配管|スリーブ|ダクト|電線管|設備配線|埋設管/i,checks:[
    ['埋設・隠ぺい配管','埋戻しや天井仕上げ後にルートが見えないため','系統・配管ルート・接続部を位置が分かるように撮る','径・勾配・支持方法・干渉を図面で確認する'],
    ['貫通・スリーブ・防火区画','仕上げ後に貫通処理が隠れるため','貫通箇所と処理前後を撮る','位置、区画貫通処理、止水納まりを確認する']
  ]}
];

export function suggestPhotoChecks(pages,filename){
  let candidates=[];
  for(const rule of PHOTO_RULES){
    const matches=pages.filter(p=>rule.keywords.test(p.text));
    if(!matches.length)continue;
    for(const [title,why,how,verify] of rule.checks){
      candidates.push({ruleId:rule.id,group:rule.group,title,why,how,verify,location:filename.replace(/\.pdf$/i,''),source:filename,pages:matches.map(p=>p.number),status:'pending',hidden:true});
    }
  }
  return candidates;
}

export async function readPhotoPlanPdf(file,onProgress=()=>{}){
  if(!(file.type==='application/pdf'||/\.pdf$/i.test(file.name)))throw Error('PDFファイルを選択してください');
  if(file.size>80*1024*1024)throw Error('PDFは1件80MB以下にしてください');
  const pdfjs=await loadPdfEngine(),task=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())});
  let pdf,ocrWorker,ocrPages=0,skipped=0;
  try{
    pdf=await task.promise;
    if(pdf.numPages>100)throw Error('PDFは1件100ページ以内に分けて読み込んでください');
    const pages=[];
    for(let n=1;n<=pdf.numPages;n++){
      onProgress(`${file.name}：${n}/${pdf.numPages}ページを確認中`);
      const page=await pdf.getPage(n),content=await page.getTextContent(),text=content.items.map(x=>x.str||'').join(' ').normalize('NFKC');
      let value=text;
      if(text.replace(/\s/g,'').length<16&&!PHOTO_RULES.some(rule=>rule.keywords.test(text))){
        if(ocrPages<12){
          if(!ocrWorker){onProgress('画像PDFを日本語OCRで読み込み中（初回は時間がかかります）');const engine=await import('https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.esm.min.js');ocrWorker=await engine.default.createWorker('jpn+eng')}
          const scale=Math.min(2,1800/page.getViewport({scale:1}).width),viewport=page.getViewport({scale});
          const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
          try{await page.render({canvasContext:canvas.getContext('2d'),canvas,viewport}).promise;value=(await ocrWorker.recognize(canvas)).data.text.normalize('NFKC');ocrPages++}
          finally{canvas.width=canvas.height=0}
        }else skipped++;
      }
      pages.push({number:n,text:value});
    }
    return {candidates:suggestPhotoChecks(pages,file.name),pageCount:pdf.numPages,ocrPages,skipped};
  }catch(error){if(error?.name==='PasswordException')throw Error('パスワード付きPDFは読み込めません');throw error}
  finally{if(ocrWorker)await ocrWorker.terminate();await task.destroy()}
}
