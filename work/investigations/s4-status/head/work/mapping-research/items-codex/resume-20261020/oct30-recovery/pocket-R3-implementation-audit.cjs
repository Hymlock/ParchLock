// Independent non-author X consumer/robustness controls. No native claim.
const fs=require('fs'),vm=require('vm'),crypto=require('crypto'),assert=require('assert');
const files=['ZRamReader','ModuleStatFactsClaude','Actionable','EquipmentUI','WorldModel','AttributeSchema','GrammarProvider'].map(n=>'js/'+n+'.js');
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const pre=Object.fromEntries(files.map(f=>[f,sha(f)]));
const prefix=fs.readFileSync('harness/zil-light-forms.js','utf8').split('const LIGHT=')[0];
const load=new Function('require',prefix+'\nreturn load;')(require),T=load('Sherlock.z5.js');
T.parent(232,38);
const c=T.c,R=T.R,m=T.mem,F=T.F,out={tier:'constructed/X current-source audit',pre,checks:[]};
const check=(name,f)=>{try{f();out.checks.push({name,pass:true});}catch(e){out.checks.push({name,pass:false,error:String(e.message)});}};
const walk=()=>R.walkVisibleDescendants(m,232,2,0.9),note=a=>a.find(o=>o.id===150);
const project=a=>R.inventoryLabelProjection(m,232,a,F);
check('worn actual walker lists note, real parent287',()=>{T.bit(302,34,true);const n=note(walk());assert(n&&!n.labelSuppressed&&n.parentId===287);});
T.bit(302,34,false);const rows=walk(),n=note(rows);
check('unworn actual walker retains scope note, suppresses label only',()=>assert(n&&n.labelSuppressed===true&&n.parentId===287));
check('pocket own hidden label absent',()=>assert(!rows.some(o=>o.id===287)));
check('rewear recomputes label, no sticky suppression',()=>{T.bit(302,34,true);assert(!note(walk()).labelSuppressed);T.bit(302,34,false);});
check('projection clones note; preserves attrs aliases and parent',()=>{const input=Object.assign({},n,{labelSuppressed:false}),a=project([input]);assert(a[0]!==input&&a[0].labelSuppressed===true&&input.labelSuppressed===false&&a[0].attrs===input.attrs&&a[0].aliases===input.aliases&&a[0].parentId===287);});
check('strict existing suppression is preserved',()=>{const input=Object.assign({},n,{labelSuppressed:true});assert.strictEqual(project([input])[0],input);});
check('wrong root adds no suppression',()=>{const input=Object.assign({},n,{labelSuppressed:false}),a=R.inventoryLabelProjection(m,38,[input],F);assert.strictEqual(a[0],input);});
check('unqualified family adds no suppression',()=>{const old=c.GrammarProvider.decodeD198,input=Object.assign({},n,{labelSuppressed:false});c.GrammarProvider.decodeD198=()=>({classification:'unknown'});try{assert.strictEqual(project([input])[0],input);}finally{c.GrammarProvider.decodeD198=old;}});
check('direct held note outside subtree remains label visible',()=>{const b=R.objectBase(T.h,150),old=m.getUint16(b+6);m.setUint16(b+6,232);const input=Object.assign({},n,{parentId:232,labelSuppressed:false});try{assert.strictEqual(project([input])[0],input);}finally{m.setUint16(b+6,old);}});
check('unrelated lapel row not pocket descendant',()=>{const input={id:174,parentId:302,name:'lapel'};assert.strictEqual(project([input])[0],input);});
vm.runInContext(fs.readFileSync('js/WorldModel.js','utf8'),c);c.WorldModel.lastPayload={inventory:rows,discoveredObjects:[],playerId:232,probe:{playerId:232,inventoryRootId:232}};
vm.runInContext(fs.readFileSync('js/Actionable.js','utf8'),c);
check('real payloadPool retains suppressed note',()=>assert(c.Actionable.payloadPool().some(o=>o.id===150)));
check('real referenceFor gives verified unique actionable note',()=>{const ref=c.Actionable.referenceFor(n);out.noteReference=JSON.parse(JSON.stringify(ref));assert(ref.unique&&ref.verified&&ref.noun);});
check('Equipment labelRows omits note, leaves original scope array',()=>{assert(!c.EquipmentUI.labelRows(rows).some(o=>o.id===150));assert(rows.some(o=>o.id===150));});
check('WorldModel minimal coat+suppressed note holder stays232',()=>{const coat=rows.find(o=>o.id===302);assert.strictEqual(c.WorldModel.correctPlayerId({playerId:232,inventory:[coat,n]}),232);});
// Explicit malformed-dependency control, not a native reachable state claim.
check('unknown missing worn byte must add no suppression',()=>{const old=R.objectLinks,input=Object.assign({},n,{labelSuppressed:false});R.objectLinks=(mem,id)=>{const l=old(mem,id);return id===302?Object.assign({},l,{attrBytes:[]}):l;};try{assert.strictEqual(project([input])[0],input);}finally{R.objectLinks=old;}});
// Dynamic table corruption with real reads: no objectLinks/family stub.
check('integral first-property frontier past staticMem must add no suppression',()=>{const first=R.objectBase(T.h,1),addr=first+12,old=m.getUint16(addr),input=Object.assign({},n,{labelSuppressed:false});const count=Math.ceil((T.h.staticMem-first)/T.h.entrySize)+1,bad=first+count*T.h.entrySize;assert(bad<65536&&bad>T.h.staticMem);m.setUint16(addr,bad);try{assert.strictEqual(project([input])[0],input);}finally{m.setUint16(addr,old);}});
out.post=Object.fromEntries(files.map(f=>[f,sha(f)]));out.sourceStable=JSON.stringify(pre)===JSON.stringify(out.post);out.passed=out.checks.filter(x=>x.pass).length;out.failed=out.checks.filter(x=>!x.pass).length;
fs.writeFileSync(__dirname+'/pocket-R3-implementation-audit.json',JSON.stringify(out,null,2),{flag:'wx'});console.log(JSON.stringify(out));
