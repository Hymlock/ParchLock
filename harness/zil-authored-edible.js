// Original Border Zone / Spellbreaker RAM; explicit test-only custody edits are X-tier consumer controls, not native proof.
// Authored edible pair: soda 200 / pretzel 205 get Eat+Drink in inventory only; cigarette 101 gets neither; a rejected
// pair never falls back to Drink; Eat-only identity food without a pair (Spellbreaker) is unchanged.
const fs=require('fs'),vm=require('vm'),assert=require('assert'),crypto=require('crypto');
const story=require(process.cwd()+'/work/investigations/zil-attr-analyzer.js').story;
function load(file,player){const bytes=Uint8Array.from(story(file)),mem=new DataView(bytes.buffer),digest=crypto.createHash('sha256').update(Buffer.from(bytes)).digest('hex');
  const identityHeader=Array.from(bytes.slice(0,28)),payload={inventory:[],discoveredObjects:[],playerId:player};
  const c=vm.createContext({console,setTimeout,clearTimeout,window:{},ModuleLibrary:{currentExecutableDigest:()=>digest,currentExecutableIdentity:()=>({digest,header:identityHeader})},ZRamProvider:{getMem:()=>mem},WorldModel:{get lastPayload(){return payload;}},Actionable:{payloadPool:()=>payload.inventory.concat(payload.discoveredObjects),referenceFor:o=>({unique:true,verified:true,noun:o.name}),commandNounFor:o=>o.name,isGameWord:()=>true},AttrCalibrator:{hydrate(){},overrideFor:()=>({}),objectOverrideFor:()=>null,hasConfirmedFlag:()=>false,allowedVerbsFor:()=>[]}});
  for(const f of ['ModuleStatFactsClaude','ZRamReader','GrammarProvider','AttributeSchema','ActionSynth','LearnedWords','EquipmentUI','SemanticActions'])vm.runInContext(fs.readFileSync((process.env.EDIBLE_SOURCE_ROOT||'.')+'/js/'+f+'.js','utf8'),c);
  return {c,mem,digest,payload,player};}
let checks=0;function check(name,fn){try{fn();checks++;console.log('PASS '+name);}catch(e){e.message=name+': '+e.message;throw e;}}
const B=load('Borderzo.z5.js',30),A=B.c.AttributeSchema,R=B.c.ZRamReader,S=B.c.ActionSynth,L=B.c.LearnedWords,h=R.header(B.mem),F=B.c.ModuleStatFactsClaude[B.digest];
function obj(env,id){const R=env.c.ZRamReader,raw=R.objectLinks(env.mem,id);return{id,name:R.shortName(env.mem,id),parentId:raw.parent,attrs:env.c.AttributeSchema.applyTo({},raw,env.mem)};}
// custody: set parent to the player (v3 parent byte at +4; v4+ parent word at +6)
function hold(env,ids){const R=env.c.ZRamReader,h=R.header(env.mem),fact=env.c.ModuleStatFactsClaude[env.digest];
  // X-only custody control also initializes the measured actor slot; never native evidence.
  if(Number.isInteger(fact.playerGlobal))env.mem.setUint16(h.globals+2*fact.playerGlobal,env.player);
  for(const id of ids){const b=R.objectBase(h,id);if(h.version<=3)env.mem.setUint8(b+4,env.player);else env.mem.setUint16(b+6,env.player);}env.payload.inventory=ids.map(id=>obj(env,id));env.payload.discoveredObjects=[];return env.payload.inventory;}
function verbs(env,id,ctx='inventory'){const o=env.payload.inventory.concat(env.payload.discoveredObjects).find(x=>x.id===id);return{menu:env.c.ActionSynth.commandsForObject(o,ctx).map(x=>x.verb),independent:env.c.LearnedWords.independentForms(o),obj:o};}
function pair(id,present){hold(B,[200,205,101]);const r=verbs(B,id);for(const list of [r.menu,r.independent])for(const v of ['eat','drink'])assert.equal(list.includes(v),present,v+' in '+JSON.stringify(list));return r;}
check('registry key is the Border Zone digest',()=>{assert.equal(B.digest,'b42d5a7db4df78ed2e29341e86a149fbd7a0038d5d74c48b4444a7bb73506ef8');assert(F&&F.capabilityForms);});
check('actual family validates and has one-object EAT and DRINK templates',()=>{const f=A._familyOf(B.mem);assert.equal(f.classification,'confirmed-zil-family');for(const v of ['eat','drink'])assert(f.templates.some(t=>t.verb===v&&t.objectCount===1&&(!t.prepositions||!t.prepositions.length)),v);});
check('soda gets Eat and Drink in menu and independent provider',()=>pair(200,true));
check('pretzel gets Eat and Drink in menu and independent provider',()=>pair(205,true));
check('held cigarette (native refusal) gets neither',()=>pair(101,false));
check('no edible bit is invented',()=>assert.strictEqual(A.bitFor('edible',B.mem),null));
check('room context gets no authored pair',()=>{const o=obj(B,200);B.payload.inventory=[];B.payload.discoveredObjects=[o];const v=S.commandsForObject(o,'room').map(x=>x.verb);assert(!v.includes('drink'),JSON.stringify(v));});
for(const bad of [null,[],['eat'],['drink','eat'],['eat','drink','quaff'],['eat','sip']])check('malformed pair '+JSON.stringify(bad)+' never yields Drink',()=>{const old=F.capabilityForms.edible;try{F.capabilityForms.edible=bad;hold(B,[200]);const z=verbs(B,200);assert(!z.menu.includes('drink'));assert(!z.independent.includes('drink'));}finally{F.capabilityForms.edible=old;}});
for(const bad of [null,[],[200,200],[200,999999],[200,'205']])check('malformed owner list '+JSON.stringify(bad)+' never yields Drink',()=>{const old=F.attributeObjects.edible;try{F.attributeObjects.edible=bad;hold(B,[200]);const z=verbs(B,200);assert(!z.menu.includes('drink'));}finally{F.attributeObjects.edible=old;}});
check('missing DRINK template rejects the whole pair',()=>{const family=A._familyOf;try{const f=family(B.mem);A._familyOf=()=>Object.assign({},f,{templates:f.templates.filter(t=>t.verb!=='drink')});pair(200,false);}finally{A._familyOf=family;}});
check('unknown family rejects the pair',()=>{const family=A._familyOf;try{A._familyOf=()=>({classification:'unknown'});hold(B,[200]);assert(!verbs(B,200).menu.includes('drink'));}finally{A._familyOf=family;}});
// D238 menu coexistence contract. Non-nested independent-provider parity is a separate open defect
// (native Cutthroats witness: resume-20261020/concealed/cutthroats-drink-consumer-native.json).
check('D238 listed owner keeps menu Eat and Drink alongside a numeric edible map',()=>{try{F.attributeMap.edible=8;hold(B,[200]);const z=verbs(B,200);assert(z.menu.includes('eat'));assert(z.menu.includes('drink'));}finally{delete F.attributeMap.edible;}});
check('D238 unlisted cigarette gets no Drink alongside a numeric edible map',()=>{try{F.attributeMap.edible=8;hold(B,[101]);const z=verbs(B,101);assert(!z.menu.includes('drink'));assert(!z.independent.includes('drink'));}finally{delete F.attributeMap.edible;}});
check('Inform Drink inference stays off for ZIL',()=>{hold(B,[200]);assert.equal(S.edibleDrinkAllowed(verbs(B,200).obj.attrs,{}),false);});
const SB=load('Spellbreaker.z3.js',1);
check('Spellbreaker identity food without a pair stays Eat-only (no Drink)',()=>{hold(SB,[43]);const z=verbs(SB,43);assert(z.obj.attrs.edible,'bread edible');assert(z.menu.includes('eat'),JSON.stringify(z.menu));assert(!z.menu.includes('drink'));assert.strictEqual(SB.c.AttributeSchema.edibleForms(SB.mem,43,'inventory'),null);});
console.log(checks+' authored edible controls passed');
