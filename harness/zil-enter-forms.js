// enter-form R2: a per-title enterForms fact replaces a refused ENTER with the title's own verb (The Witness: SIT ON)
// AFTER the D236 inside/outside filter. Original story bytes with a test-only fact (enterable 29 + enterForms);
// X-only, native evidence is separate (work/investigations/grok1/enter/witness.json).
const fs=require('fs'),vm=require('vm'),crypto=require('crypto'),assert=require('assert');
const bytes=Uint8Array.from(require(process.cwd()+'/work/investigations/zil-attr-analyzer.js').story('TheWitness.z3.js'));
const mem=new DataView(bytes.buffer),digest=crypto.createHash('sha256').update(bytes).digest('hex'),payload={inventory:[],discoveredObjects:[],playerId:79};
const c=vm.createContext({console,setTimeout,clearTimeout,window:{},ModuleLibrary:{currentExecutableDigest:()=>digest,currentExecutableIdentity:()=>({digest,header:Array.from(bytes.slice(0,28))})},ZRamProvider:{getMem:()=>mem},WorldModel:{lastPayload:payload},Actionable:{payloadPool:()=>payload.inventory.concat(payload.discoveredObjects),referenceFor:o=>({unique:true,verified:true,noun:o.name}),commandNounFor:o=>o.name,isGameWord:()=>true}});
for(const f of ['ModuleStatFactsClaude','ZRamReader','GrammarProvider','AttributeSchema','ActionSynth','LearnedWords','SemanticActions'])vm.runInContext(fs.readFileSync('js/'+f+'.js','utf8'),c);
const R=c.ZRamReader,A=c.AttributeSchema,S=c.ActionSynth,F=c.ModuleStatFactsClaude[digest],h=R.header(mem);
assert(F&&F.attributeMap,'The Witness has a fact row');
const LOUNGE=104,DESK_ROOM=207,PLAYER=79;
const parent=(id,p)=>mem.setUint8(R.objectBase(h,id)+4,p);
function object(id){const raw=R.objectLinks(mem,id);return{id,name:R.shortName(mem,id),parentId:raw.parent,attrs:A.applyTo({},raw,mem)};}
const saved={map:Object.assign({},F.attributeMap),ef:F.enterForms};
function withFact(ef,fn){F.attributeMap.enterable=29;if(ef===undefined)delete F.enterForms;else F.enterForms=ef;try{fn();}finally{F.attributeMap=Object.assign({},saved.map);if(saved.ef===undefined)delete F.enterForms;else F.enterForms=saved.ef;}}
function at(where){parent(LOUNGE,DESK_ROOM);parent(PLAYER,where);payload.discoveredObjects=[object(LOUNGE)];}
const verbs=()=>S.commandsForPayloadObjectId(LOUNGE,'room').map(x=>x.verb);
let n=0;function check(name,fn){n++;fn();console.log('PASS '+name);}
check('1 no enterForms: outside the lounge offers enter (D236 unchanged)',()=>withFact(undefined,()=>{at(DESK_ROOM);const v=verbs();assert(v.includes('enter'),v);assert(!v.includes('sit on'),v);}));
check('2 enterForms sit on: outside offers sit on, never enter or exit',()=>withFact({enter:'sit on'},()=>{at(DESK_ROOM);const v=verbs();assert(v.includes('sit on'),v);assert(!v.includes('enter')&&!v.includes('exit')&&!v.includes('get out of'),v);}));
check('3 enterForms sit on: inside the lounge offers get out of only (D236 first)',()=>withFact({enter:'sit on'},()=>{at(LOUNGE);const v=verbs();assert(v.includes('get out of'),v);assert(!v.includes('sit on')&&!v.includes('enter'),v);}));
check('4 a form whose words are not in the dictionary is dropped, not offered',()=>withFact({enter:'zzqx on'},()=>{at(DESK_ROOM);const v=verbs();assert(!v.includes('zzqx on')&&!v.includes('enter'),v);}));
check('5 malformed enterForms (non-string) leaves enter unchanged',()=>withFact({enter:7},()=>{at(DESK_ROOM);assert(verbs().includes('enter'));}));
check('6 sit on resolves to the ENTER intent',()=>{assert.strictEqual(c.SemanticActions.verbIntent['sit on'],'ENTER');});
check('7 mismatched stable header: ownership fails, so no enter form (no digest fallback)',()=>withFact({enter:'sit on'},()=>{const ml=c.ModuleLibrary,old=ml.currentExecutableIdentity;ml.currentExecutableIdentity=()=>({digest,header:Array.from(bytes.slice(0,28)).map((x,i)=>i===2?x^1:x)});try{assert.strictEqual(S.enterFormFor(mem),null);}finally{ml.currentExecutableIdentity=old;}}));
console.log(n+' enter-form checks passed; native evidence is separate.');
