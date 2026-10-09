export const defaultPhotoCounts={'A4-landscape':4,'A4-portrait':3,'A3-landscape':12,'A3-portrait':10};
export function photoLayout({paperSize='A4',orientation='landscape',photosPerPage}={}){
  const count=Math.max(1,Math.min(20,Math.floor(Number(photosPerPage))||defaultPhotoCounts[paperSize+'-'+orientation]||4));
  const cols=orientation==='landscape'?(count===1?1:count<=6?2:count<=9?3:4):(count<=5?1:2);
  return {count,cols,rows:Math.ceil(count/cols)};
}
export function paperDimensions(paperSize='A4',landscape=true){
  const a3=paperSize==='A3',short=a3?297:210,long=a3?420:297;
  const widthMM=landscape?long:short,heightMM=landscape?short:long;
  return {widthMM,heightMM,width:landscape?(a3?2380:1684):(a3?1684:1190),height:landscape?(a3?1684:1190):(a3?2380:1684),points:[widthMM*72/25.4,heightMM*72/25.4],excelSize:a3?8:9};
}
