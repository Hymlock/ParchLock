// OPEN_WORK I3: inform-layout harness. Static, no browser.
// For every release Inform Z title (inventory.json, family confirmed-inform, vm z*), check that
// AttributeSchema.bitFor resolves the expected bit for container/open/openable/supporter/animate/worn/light.
// Expected: declared name table (ZRamReader.informAttributeNames) when present; otherwise the exact-digest
// ModuleStatFactsClaude fact (attributeMap[flag], wornAttribute for worn). A flag with neither source is
// reported UNMAPPED (coverage gap, not a FAIL). A bit-flip control proves the check is not vacuous.
const fs=require('fs'),vm=require('vm'),crypto=require('crypto');
const root=process.cwd();
const story=require(root+'/work/investigations/zil-attr-analyzer.js').story;
const INV=root+'/work/investigations/zil-titles/grok-lane-1031/inform-plan/inventory.json';
const FLAGS=['container','open','openable','supporter','animate','worn','light'];
function load(file){
  const bytes=Uint8Array.from(story(file)),mem=new DataView(bytes.buffer);
  const digest=crypto.createHash('sha256').update(bytes).digest('hex'),header=Array.from(bytes.slice(0,28));
  const T={digest,mem};
  const c=vm.createContext({console,window:{},document:{readyState:'loading',addEventListener(){}},UndoRestoreSync:{generation:1},
    ModuleLibrary:{currentExecutableDigest:()=>T.digest,currentExecutableIdentity:()=>({digest:T.digest,header})},ZRamProvider:{getMem:()=>mem}});
  for(const f of ['ModuleStatFactsClaude','ZRamReader','GrammarProvider','AttributeSchema'])vm.runInContext(fs.readFileSync(root+'/js/'+f+'.js','utf8'),c);
  return Object.assign(T,{c,A:c.AttributeSchema,R:c.ZRamReader,F:c.ModuleStatFactsClaude[digest]});
}
function expected(T,flag){
  const d=T.R.informAttributeNames(T.mem),bits=T._expNames||(d&&d.bits);
  if(d)return{src:'names',bit:Object.prototype.hasOwnProperty.call(bits,flag)?bits[flag]:null};
  const F=T.F;
  if(flag==='worn'){if(F&&Number.isInteger(F.wornAttribute))return{src:'fact',bit:F.wornAttribute};return{src:'none'};}
  const map=T._exp||(F&&F.attributeMap);
  if(map&&Object.prototype.hasOwnProperty.call(map,flag))return{src:'fact',bit:map[flag]};
  return{src:'none'};
}
function checkTitle(T){
  const bad=[],unmapped=[],src=new Set();
  for(const f of FLAGS){const e=expected(T,f);if(e.src==='none'){unmapped.push(f);continue;}src.add(e.src);
    let got;try{got=T.A.bitFor(f,T.mem);}catch(x){got='THROW';}if(got!==e.bit)bad.push(f+':'+got+'!='+e.bit);}
  return{bad,unmapped,src:[...src].join('+')||'none'};
}
const rows=JSON.parse(fs.readFileSync(INV,'utf8')).filter(r=>r.family==='confirmed-inform'&&/^z/.test(r.vm||''));
let pass=0,fail=0,unm=0;const loaded={};
for(const r of rows){
  let T;try{T=load(r.file);}catch(e){console.log('FAIL '+r.file+' load: '+e.message);fail++;continue;}
  if(T.digest!==r.digest){console.log('FAIL '+r.file+' digest '+T.digest.slice(0,12)+' != inventory '+r.digest.slice(0,12));fail++;continue;}
  loaded[r.file]=T;const k=checkTitle(T);
  const note=(k.unmapped.length?' UNMAPPED='+k.unmapped.join(','):'');if(k.unmapped.length)unm++;
  if(k.bad.length){fail++;console.log('FAIL '+r.file+' ['+k.src+'] '+k.bad.join(' ')+note);}
  else{pass++;console.log('PASS '+r.file+' ['+k.src+']'+note);}
}
// Bit-flip controls, VM-realm clones (host-realm objects fail the consumer's plain-object checks).
const clone=(T,o)=>vm.runInContext('JSON.parse('+JSON.stringify(JSON.stringify(o))+')',T.c);
let ctl=0,ctlFail=0;
function control(name,T,mutate,restore){const before=checkTitle(T).bad.length;mutate();let k;try{k=checkTitle(T);}finally{restore();}
  const ok=before===0&&k.bad.length>0&&checkTitle(T).bad.length===0;ctl++;if(!ok)ctlFail++;console.log((ok?'PASS':'FAIL')+' control '+name+' -> detected '+JSON.stringify(k.bad));}
const factT=Object.values(loaded).find(T=>!T.R.informAttributeNames(T.mem)&&T.F&&T.F.attributeMap&&Number.isInteger(T.F.attributeMap.container));
if(factT){
  const g=clone(factT,factT.F.attributeMap);
  control('fact attributeMap.container flipped (consumer-side)',factT,()=>{const m=clone(factT,g);m.container=(g.container+1)%48;factT.F.attributeMap=m;
    factT._exp=g;},()=>{factT.F.attributeMap=clone(factT,g);delete factT._exp;});
}else{console.log('FAIL control: no fact-only title with attributeMap.container');ctlFail++;}
const nameT=Object.values(loaded).find(T=>T.R.informAttributeNames(T.mem));
if(nameT){const d=nameT.R.informAttributeNames(nameT.mem),old=d.bits.open;
  control('declared name bits.open flipped (consumer-side)',nameT,()=>{nameT._expNames=Object.assign({},d.bits);d.bits.open=(old+1)%48;},()=>{d.bits.open=old;delete nameT._expNames;});}
console.log('SUMMARY titles='+rows.length+' PASS='+pass+' FAIL='+fail+' withUnmapped='+unm+' controls='+ctl+' controlFail='+ctlFail);
process.exit(fail||ctlFail?1:0);
