// D238: authored Drink owners in a title that also maps the FOODBIT (Zork I edible 21). Original story bytes with a
// test-only owner rule (water 237 in glass bottle 236, open bit 11, held scope); X-only, native evidence is separate
// (work/investigations/grok1/drink/zork1.json).
const fs=require('fs'),vm=require('vm'),crypto=require('crypto'),assert=require('assert');
const bytes=Uint8Array.from(require(process.cwd()+'/work/investigations/zil-attr-analyzer.js').story('Zork1-TheGreatUndergroundEmpire.z3.js'));
const mem=new DataView(bytes.buffer),digest=crypto.createHash('sha256').update(bytes).digest('hex'),payload={inventory:[],discoveredObjects:[],playerId:4};
const c=vm.createContext({console,setTimeout,clearTimeout,window:{},ModuleLibrary:{currentExecutableDigest:()=>digest,currentExecutableIdentity:()=>({digest,header:Array.from(bytes.slice(0,28))})},ZRamProvider:{getMem:()=>mem},WorldModel:{lastPayload:payload},Actionable:{payloadPool:()=>payload.inventory.concat(payload.discoveredObjects),referenceFor:o=>({unique:true,verified:true,noun:o.name}),commandNounFor:o=>o.name,isGameWord:()=>true}});
for(const f of ['ModuleStatFactsClaude','ZRamReader','GrammarProvider','AttributeSchema','ActionSynth','LearnedWords','SemanticActions'])vm.runInContext(fs.readFileSync('js/'+f+'.js','utf8'),c);
const R=c.ZRamReader,A=c.AttributeSchema,S=c.ActionSynth,F=c.ModuleStatFactsClaude[digest],h=R.header(mem);
assert(F&&F.attributeMap&&F.attributeMap.edible===21,'Zork I row maps edible 21');
const parent=(id,p)=>mem.setUint8(R.objectBase(h,id)+4,p),bit=(id,b,on)=>{const a=R.objectBase(h,id)+(b>>3),mask=128>>(b&7);mem.setUint8(a,on?mem.getUint8(a)|mask:mem.getUint8(a)&~mask);};
function object(id){const raw=R.objectLinks(mem,id);return{id,name:R.shortName(mem,id),parentId:raw.parent,attrs:A.applyTo({},raw,mem)};}
const RULE={attributeObjects:{edible:[237]},capabilityForms:{edible:[{objectId:237,scope:{containerObject:236,openAttribute:11,held:true},actions:[{verb:'drink'}]}]}};
const saved={ao:F.attributeObjects,cf:F.capabilityForms};
function withRule(fn){F.attributeObjects=JSON.parse(JSON.stringify(RULE.attributeObjects));F.capabilityForms=JSON.parse(JSON.stringify(RULE.capabilityForms));try{fn();}finally{F.attributeObjects=saved.ao;F.capabilityForms=saved.cf;}}
function held(open){parent(236,4);parent(237,236);bit(236,11,open);payload.inventory=[object(236),object(237)];payload.discoveredObjects=[];}
function onFloor(open){parent(236,204);parent(237,236);bit(236,11,open);payload.inventory=[];payload.discoveredObjects=[object(236),object(237)];}
const verbs=(id,ctx)=>S.commandsForPayloadObjectId(id,ctx).map(x=>x.verb);
let n=0;function check(name,fn){n++;fn();console.log('PASS '+name);}
check('1 mapped title: unlisted FOODBIT lunch keeps the bit path (null) and Eat',()=>withRule(()=>{assert.strictEqual(A.edibleForms(mem,225,'inventory'),null);parent(225,4);payload.inventory=[object(225)];assert(verbs(225,'inventory').includes('eat'));}));
check('2 no attributeObjects.edible: FOODBIT Eat unchanged',()=>{parent(225,4);payload.inventory=[object(225)];assert.strictEqual(A.edibleForms(mem,225,'inventory'),null);assert(verbs(225,'inventory').includes('eat'));});
check('3a held bottle closed: water gets no Drink (nested and top level)',()=>withRule(()=>{held(false);assert.deepEqual(A.edibleForms(mem,237,'inventory'),[]);assert(!verbs(237,'inventory').includes('drink'));}));
check('3b held bottle open: water gets Drink (owner policy and synthesized candidate)',()=>withRule(()=>{held(true);assert.deepEqual(A.edibleForms(mem,237,'inventory'),['drink']);assert(verbs(237,'inventory').includes('drink'));}));
check('4 held scope rejects room context (open bottle on the floor)',()=>withRule(()=>{onFloor(true);assert.deepEqual(A.edibleForms(mem,237,'room'),[]);assert(!verbs(237,'room').includes('drink'));}));
check('5 malformed held value fails closed for the owner only',()=>withRule(()=>{F.capabilityForms.edible[0].scope.held='yes';held(true);assert.deepEqual(A.edibleForms(mem,237,'inventory'),[]);assert.strictEqual(A.edibleForms(mem,225,'inventory'),null);}));
check('6 plain objectCapabilityIds stays null in a mapped title; allowMapped opts in',()=>withRule(()=>{assert.strictEqual(A.objectCapabilityIds(mem,'edible'),null);assert.deepEqual(Array.from(A.objectCapabilityIds(mem,'edible',{allowMapped:true})),[237]);}));
check('7 owner never gains Eat (rule lists drink only)',()=>withRule(()=>{held(true);assert(!verbs(237,'inventory').includes('eat'));}));
check('8 D228 merge: confirmed semantic Drink cannot revive while the bottle is closed; other verb kept',()=>withRule(()=>{const sa=c.SemanticActions,old=sa.confirmedObjectFormsFor;try{sa.confirmedObjectFormsFor=()=>[{objectId:237,verb:'drink',command:'drink water'},{objectId:237,verb:'jump',command:'jump water'}];held(false);const cmds=sa.resolveForObject(payload.inventory.find(o=>o.id===237),'inventory',null,payload);assert(!cmds.some(x=>x.verb==='drink'));assert(cmds.some(x=>x.verb==='jump'));held(true);assert(sa.resolveForObject(payload.inventory.find(o=>o.id===237),'inventory',null,payload).some(x=>x.verb==='drink'));}finally{sa.confirmedObjectFormsFor=old;}}));
console.log(n+' D238 mapped-title checks passed; native evidence is separate.');
