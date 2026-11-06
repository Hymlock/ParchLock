// Constructed consumer controls only; native qualification retained separately.
const fs=require('fs'),vm=require('vm'),crypto=require('crypto'),assert=require('assert');
function load(file,player){const bytes=Uint8Array.from(require(process.cwd()+'/work/investigations/zil-attr-analyzer.js').story(file)),mem=new DataView(bytes.buffer),digest=crypto.createHash('sha256').update(bytes).digest('hex'),payload={inventory:[],discoveredObjects:[],playerId:player};const c=vm.createContext({console,setTimeout,clearTimeout,window:{},ModuleLibrary:{currentExecutableDigest:()=>digest,currentExecutableIdentity:()=>({digest,header:Array.from(bytes.slice(0,28))})},ZRamProvider:{getMem:()=>mem},WorldModel:{lastPayload:payload},Actionable:{payloadPool:()=>payload.inventory.concat(payload.discoveredObjects),referenceFor:o=>({unique:true,verified:true,noun:o.name}),commandNounFor:o=>o.name,isGameWord:()=>true},AttrCalibrator:{hydrate(){},overrideFor:()=>({}),objectOverrideFor:()=>null,hasConfirmedFlag:()=>false,allowedVerbsFor:()=>[]}});for(const f of ['ModuleStatFactsClaude','ZRamReader','GrammarProvider','AttributeSchema','ActionSynth','LearnedWords','SemanticActions'])vm.runInContext(fs.readFileSync('js/'+f+'.js','utf8'),c);const R=c.ZRamReader,A=c.AttributeSchema,S=c.ActionSynth,L=c.LearnedWords,F=c.ModuleStatFactsClaude[digest],h=R.header(mem);function bit(id,b,on){const at=R.objectBase(h,id)+(b>>3),mask=128>>(b&7);mem.setUint8(at,on?mem.getUint8(at)|mask:mem.getUint8(at)&~mask);}function parent(id,p){mem.setUint8(R.objectBase(h,id)+4,p);}function object(id){const raw=R.objectLinks(mem,id);return{id,name:R.shortName(mem,id),parentId:raw.parent,attrs:A.applyTo({},raw,mem)};}function refresh(ids){payload.inventory=ids.map(object);}function hold(ids){mem.setUint16(h.globals+F.playerGlobal*2,player);ids.forEach(id=>parent(id,player));refresh(ids);}return{c,mem,digest,payload,R,A,S,L,F,h,bit,parent,object,refresh,hold};}
const e=load('TheLurkingHorror.z3.js',56),A=e.A,F=e.F,rule=()=>F.capabilityForms.unlockTools;let n=0;
function check(label,fn){fn();console.log('PASS '+label);n++;}
const policy=(id,context='inventory')=>A.unlockToolAllowed(e.mem,id,context);
e.hold([95,97,58]);
check('held masterkey offered',()=>assert.strictEqual(policy(95),true));
check('held assignment excluded',()=>assert.strictEqual(policy(97),false));
check('nested visible Chinesefood tool excluded',()=>{e.parent(90,58);assert.strictEqual(policy(90),false)});
check('nested masterkey stays allowed',()=>{e.parent(95,58);assert.strictEqual(policy(95),true);e.parent(95,56)});
check('noncarried source unknown',()=>{e.parent(97,176);assert.strictEqual(policy(97),null);e.parent(97,56)});
check('room context unaffected',()=>assert.strictEqual(policy(97,'room'),null));
check('cycle cannot establish custody',()=>{e.parent(97,58);e.parent(58,97);assert.strictEqual(policy(97),null);e.parent(97,56);e.parent(58,56)});
check('out-of-table source unknown',()=>assert.strictEqual(policy(253),null));
check('out-of-table parent unknown',()=>{e.parent(97,253);assert.strictEqual(policy(97),null);e.parent(97,56)});
function malformed(value){const old=F.capabilityForms.unlockTools;F.capabilityForms.unlockTools=value;assert.strictEqual(policy(97),null);F.capabilityForms.unlockTools=old;}
check('empty tool domain is not a denial',()=>malformed({scope:'held',objectIds:[]}));
check('duplicate ids unknown',()=>malformed({scope:'held',objectIds:[95,95]}));
check('property bytes not tool ids',()=>malformed({scope:'held',objectIds:[253]}));
check('unknown scope untouched',()=>malformed({scope:'room',objectIds:[95]}));
check('extra keys reject policy',()=>malformed({scope:'held',objectIds:[95],key:true}));
check('missing policy untouched',()=>{const old=rule();delete F.capabilityForms.unlockTools;assert.strictEqual(policy(97),null);F.capabilityForms.unlockTools=old;});
check('uninitialized measured player unknown',()=>{e.mem.setUint16(e.h.globals+F.playerGlobal*2,0);assert.strictEqual(policy(97),null);e.mem.setUint16(e.h.globals+F.playerGlobal*2,56)});
console.log(n+' PASS / 0 FAIL');
