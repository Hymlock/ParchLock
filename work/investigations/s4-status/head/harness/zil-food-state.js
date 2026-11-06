// Original story reader + constructed custody/state/learned controls. X-only,
// never native accessibility proof; native captures are separate JSON artifacts.
const fs=require('fs'),vm=require('vm'),crypto=require('crypto'),assert=require('assert');
const bytes=Uint8Array.from(require(process.cwd()+'/work/investigations/zil-attr-analyzer.js').story('TheLurkingHorror.z3.js'));
const mem=new DataView(bytes.buffer),digest=crypto.createHash('sha256').update(bytes).digest('hex'),payload={inventory:[],discoveredObjects:[],playerId:56};
const c=vm.createContext({console,setTimeout,clearTimeout,window:{},ModuleLibrary:{currentExecutableDigest:()=>digest,currentExecutableIdentity:()=>({digest,header:Array.from(bytes.slice(0,28))})},ZRamProvider:{getMem:()=>mem},WorldModel:{lastPayload:payload},Actionable:{payloadPool:()=>payload.inventory.concat(payload.discoveredObjects),referenceFor:o=>({unique:true,verified:true,noun:o.name}),commandNounFor:o=>o.name,isGameWord:()=>true},AttrCalibrator:{hydrate(){},overrideFor:()=>({}),objectOverrideFor:()=>null,hasConfirmedFlag:()=>false,allowedVerbsFor:()=>[]}});
for(const f of ['ModuleStatFactsClaude','ZRamReader','GrammarProvider','AttributeSchema','ActionSynth','LearnedWords','SemanticActions'])vm.runInContext(fs.readFileSync('js/'+f+'.js','utf8'),c);
const R=c.ZRamReader,A=c.AttributeSchema,S=c.ActionSynth,L=c.LearnedWords,F=c.ModuleStatFactsClaude[digest],h=R.header(mem);
const parent=(id,p)=>mem.setUint8(R.objectBase(h,id)+4,p),bit=(id,b,on)=>{const a=R.objectBase(h,id)+(b>>3),mask=128>>(b&7);mem.setUint8(a,on?mem.getUint8(a)|mask:mem.getUint8(a)&~mask);};
const prop=(id,n,v)=>{const p=R.listProps(mem,id).find(p=>p.num===n);assert(p&&p.sz===2);mem.setUint16(p.dataAddr,v);};
function object(id){const raw=R.objectLinks(mem,id);return{id,name:R.shortName(mem,id),parentId:raw.parent,attrs:A.applyTo({},raw,mem)};}
function refresh(ids=[18,61,58,90]){payload.inventory=ids.map(object);return payload.inventory;}
function food(id){return S.commandsForPayloadObjectId(id,'inventory').map(x=>x.verb).filter(x=>x==='eat'||x==='drink');}
function defaults(){mem.setUint16(h.globals+2*F.playerGlobal,56);parent(18,56);parent(61,56);parent(58,56);parent(90,58);bit(58,13,true);bit(18,11,false);prop(18,3,0);prop(61,11,5);refresh();}
let n=0;function check(name,fn){defaults();fn();n++;console.log('PASS '+name);}
check('cold snack Eat only',()=>assert.deepEqual(food(18),['eat']));
check('warm12 snack Eat only',()=>{prop(18,3,12);refresh();assert.deepEqual(food(18),['eat']);});
check('hot16 snack no Eat; cooling10 restores it',()=>{prop(18,3,16);refresh();assert.deepEqual(food(18),[]);prop(18,3,10);refresh();assert.deepEqual(food(18),['eat']);});
check('consumed wrapper loses Eat despite FOOD1',()=>{bit(18,11,true);refresh();assert(R.attr(R.objectLinks(mem,18),1));assert.deepEqual(food(18),[]);});
check('full and partial Coke Drink only, empty none',()=>{for(const value of [5,4,3,2,1]){prop(61,11,value);refresh();assert.deepEqual(food(61),value>1?['drink']:[]);}});
check('carton FOOD1 is not food capability',()=>{assert(R.attr(R.objectLinks(mem,58),1));assert.deepEqual(food(58),[]);});
check('nested Chinese Eat, inspect first and Take unchanged',()=>{const cmds=S.commandsForPayloadObjectId(90,'inventory');assert.equal(cmds[0].verb,'examine');assert(cmds.some(x=>x.verb.startsWith('take out of')&&x.command==='take Chinese food'));assert.deepEqual(food(90),['eat']);assert(L.independentForms(payload.inventory.find(o=>o.id===90)).includes('eat'));});
check('closed parent or omitted child cannot expose nested Eat',()=>{bit(58,13,false);refresh();assert.deepEqual(food(90),[]);bit(58,13,true);refresh([18,61,58]);assert.deepEqual(A.edibleForms(mem,90,'inventory'),[]);});
check('wrong parent or nonheld carton cannot expose nested Eat',()=>{parent(90,86);refresh();assert.deepEqual(food(90),[]);parent(90,58);parent(58,160);refresh();assert.deepEqual(food(90),[]);});
check('uninitialized measured player rejects food actions',()=>{mem.setUint16(h.globals+2*F.playerGlobal,0);assert.deepEqual(A.edibleForms(mem,61,'inventory'),[]);});
check('no inferred edible bit',()=>assert.strictEqual(A.bitFor('edible',mem),null));
const original=JSON.stringify(F.capabilityForms.edible);
for(const mutate of [r=>{r[0].extra=true;},r=>{r[0].actions[0].unknown=true;},r=>{r[0].actions.push(r[0].actions[0]);},r=>{r[1].objectId=18;},r=>{r[1].actions[0].property.size=1;},r=>{r[1].actions[0].property.min=6;},r=>{r[2].scope.openAttribute=32;}])check('malformed claimed owner rule fails closed '+n,()=>{try{const rules=JSON.parse(original);mutate(rules);F.capabilityForms.edible=rules;assert.deepEqual(A.edibleForms(mem,61,'inventory'),[]);}finally{F.capabilityForms.edible=JSON.parse(original);}});
check('absent/wrong-sized explicit property rejects Drink',()=>{const list=R.listProps;try{R.listProps=(m,id)=>list(m,id).filter(p=>p.num!==11);assert.deepEqual(A.edibleForms(mem,61,'inventory'),[]);R.listProps=(m,id)=>list(m,id).map(p=>p.num===11?Object.assign({},p,{sz:1}):p);assert.deepEqual(A.edibleForms(mem,61,'inventory'),[]);}finally{R.listProps=list;}});
check('out-of-bounds quantity rejects Drink',()=>{prop(61,11,6);refresh();assert.deepEqual(food(61),[]);});
check('room scope rejected, unrelated owner not constrained',()=>{assert.deepEqual(A.edibleForms(mem,61,'room'),[]);assert.strictEqual(A.edibleForms(mem,97,'inventory'),null);assert(S.authoredCommandAllowed(97,'drink','inventory'));});
// D235: the open carton may be in view rather than held. Live parent/open bit stay authoritative; the payload only lists view.
const seen=ids=>{payload.discoveredObjects=ids.map(object);};
const roomFood=()=>A.edibleForms(mem,90,'room');
check('D235 open carton on counter, food in view: room Eat',()=>{try{parent(58,160);refresh([18,61]);seen([58,90]);assert.deepEqual(roomFood(),['eat']);}finally{seen([]);}});
check('D235 closed carton in view: no Eat even with stale listing',()=>{try{parent(58,160);bit(58,13,false);refresh([18,61]);seen([58,90]);assert.deepEqual(roomFood(),[]);}finally{seen([]);}});
check('D235 food not in view: no room Eat',()=>{try{parent(58,160);refresh([18,61]);seen([58]);assert.deepEqual(roomFood(),[]);}finally{seen([]);}});
check('D235 listed but live parent not the carton: no Eat',()=>{try{parent(58,160);parent(90,160);refresh([18,61]);seen([58,90]);assert.deepEqual(roomFood(),[]);}finally{seen([]);}});
check('D235 unknown context names rejected',()=>{try{parent(58,160);seen([58,90]);assert.deepEqual(A.edibleForms(mem,90,'object'),[]);assert.deepEqual(A.edibleForms(mem,90,undefined),[]);}finally{seen([]);}});
check('D235 held-scope Coke and snack never Eat/Drink in room context',()=>{seen([18,61]);try{assert.deepEqual(A.edibleForms(mem,61,'room'),[]);assert.deepEqual(A.edibleForms(mem,18,'room'),[]);}finally{seen([]);}});
check('D235 held carton path unchanged: inventory Eat',()=>assert.deepEqual(food(90),['eat']));
check('learned forms remain stored, unavailable forms hidden, stale Enter rejected',()=>{const candidates=L.candidates,identity=L.identity,generation=L.generation;const saved=[{id:'a',revision:1,form:'eat',enter:true},{id:'b',revision:1,form:'drink',enter:true},{id:'c',revision:1,form:'jump',enter:false}];try{L.candidates=()=>saved;L.identity=()=> 'test';L.generation=()=>1;let commands=L.commands(payload.inventory.find(o=>o.id===61));assert(!commands.some(x=>x.verb==='eat'));assert(commands.some(x=>x.verb==='drink'));const drink=commands.find(x=>x.verb==='drink');prop(61,11,1);refresh();commands=L.commands(payload.inventory.find(o=>o.id===61));assert.deepEqual(commands.map(x=>x.verb),['jump']);assert(!L.commandCurrent(drink));assert.equal(saved.length,3);assert(!L.commands(payload.inventory.find(o=>o.id===18)).some(x=>x.verb==='drink'));}finally{L.candidates=candidates;L.identity=identity;L.generation=generation;}});
check('semantic merge cannot restore unavailable Eat/Drink; other verb preserved',()=>{const sa=c.SemanticActions,old=sa.confirmedObjectFormsFor;try{sa.confirmedObjectFormsFor=()=>[{objectId:61,verb:'eat',command:'eat coke'},{objectId:61,verb:'drink',command:'drink coke'},{objectId:61,verb:'jump',command:'jump coke'}];prop(61,11,1);refresh();const cmds=sa.resolveForObject(payload.inventory.find(o=>o.id===61),'inventory',null,payload);assert(!cmds.some(x=>x.verb==='eat'||x.verb==='drink'));assert(cmds.some(x=>x.verb==='jump'));}finally{sa.confirmedObjectFormsFor=old;}});
console.log(n+' constructed state/projection checks passed; native evidence is separate.');
