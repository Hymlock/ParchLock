// Constructed/X current-consumer control. No native accessibility claim.
const fs=require('fs'),vm=require('vm'),crypto=require('crypto');
const prefix=fs.readFileSync('harness/zil-light-forms.js','utf8').split('const LIGHT=')[0];
const load=new Function('require',prefix+'\nreturn load;')(require),T=load('Sherlock.z5.js');
T.parent(232,38);
const run=w=>{T.bit(302,34,w);return T.R.walkVisibleDescendants(T.mem,232,2,0.9).map(o=>({id:o.id,parentId:o.parentId,labelSuppressed:o.labelSuppressed===true}));};
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const result={tier:'constructed/X on actual walker/story bytes',source:{reader:sha('js/ZRamReader.js'),facts:sha('js/ModuleStatFactsClaude.js')},rule:T.F.inventoryHiddenRecurses,worn:run(true),unworn:run(false)};
result.wornHasNote=result.worn.some(o=>o.id===150);result.unwornHasNote=result.unworn.some(o=>o.id===150);
fs.writeFileSync(__dirname+'/pocket-whenParentWorn-current-probe.json',JSON.stringify(result,null,2),{flag:'wx'});
console.log(JSON.stringify(result));
