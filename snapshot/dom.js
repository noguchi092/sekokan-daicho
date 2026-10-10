/* A native DOM component: selectors and editor events stay inside its root. */
export function editorEnvironment(root){
  const owner=root.ownerDocument,view=owner.defaultView,listeners=[];
  function listen(target,type,fn,options){target.addEventListener(type,fn,options);listeners.push(()=>target.removeEventListener(type,fn,options))}
  const document={body:root,querySelector:s=>root.querySelector(s),querySelectorAll:s=>root.querySelectorAll(s),getElementById:id=>root.querySelector('#'+CSS.escape(id)),createElement:owner.createElement.bind(owner),createElementNS:owner.createElementNS.bind(owner),elementFromPoint:owner.elementFromPoint.bind(owner),get hidden(){return owner.hidden},addEventListener:(type,fn,options)=>listen(type==='visibilitychange'?owner:root,type,fn,options)};
  const window=new Proxy(view,{get(target,key){if(key==='addEventListener')return(type,fn,options)=>listen(target,type,fn,options);const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value}});
  return{document,window,dispose(){listeners.splice(0).forEach(remove=>remove());root.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close())}};
}
