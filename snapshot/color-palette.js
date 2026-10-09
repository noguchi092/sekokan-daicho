export function setupColorPalette(input) {
  const palette=document.createElement('div');palette.className='color-palette';palette.setAttribute('aria-label','基本色');
  for(const [name,color] of [['赤','#ff0000'],['青','#0000ff'],['黄','#ffff00'],['緑','#008000'],['橙','#ff8800'],['紫','#800080'],['黒','#000000'],['白','#ffffff']]){
    const button=document.createElement('button');button.type='button';button.className='color-swatch';button.style.backgroundColor=color;button.title=name;button.setAttribute('aria-label',name+'に変更');button.onclick=()=>{input.value=color;input.dispatchEvent(new Event('change',{bubbles:true}))};palette.append(button);
  }
  input.parentElement.after(palette);
}
