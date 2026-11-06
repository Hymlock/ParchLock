// Non-native X domain control: an unrelated hidden lapel's visible child.
const fs=require('fs'),crypto=require('crypto'),assert=require('assert');
const files=['js/ZRamReader.js','js/ModuleStatFactsClaude.js'],sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'),pre=Object.fromEntries(files.map(f=>[f,sha(f)]));
const prefix=fs.readFileSync('harness/zil-light-forms.js','utf8').split('const LIGHT=')[0],load=new Function('require',prefix+'\nreturn load;')(require),T=load('Sherlock.z5.js'),m=T.mem,R=T.R;
T.parent(232,38);T.bit(302,34,false);
const base=id=>R.objectBase(T.h,id),saved=Uint8Array.from(T.bytes);let result;
try{
  const original=R.objectLinks(m,150),pocket=R.objectLinks(m,287),lapel=R.objectLinks(m,174);
  assert.strictEqual(original.parent,287);assert.strictEqual(pocket.child,150);
  m.setUint16(base(287)+10,original.sibling);
  m.setUint16(base(150)+6,174);m.setUint16(base(150)+8,lapel.child);m.setUint16(base(174)+10,150);
  const row=R.walkVisibleDescendants(m,232,2,0.9).find(o=>o.id===150);
  assert(row&&row.parentId===174&&row.labelSuppressed!==true,'lapel descendant must remain admitted and label-visible with coat unworn');
  result={pass:true,row:{id:row.id,parentId:row.parentId,labelSuppressed:row.labelSuppressed===true}};
}finally{T.bytes.set(saved);}
const post=Object.fromEntries(files.map(f=>[f,sha(f)])),out={tier:'constructed/X; note placed under lapel in isolated memory, not native accessibility proof',pre,post,sourceStable:JSON.stringify(pre)===JSON.stringify(post),result};
fs.writeFileSync(__dirname+'/pocket-R3-lapel-descendant-control.json',JSON.stringify(out,null,2),{flag:'wx'});console.log(JSON.stringify(out));
