// P4 R2 (claude+codex #5543): room-scoped switchable owners (switchableScope {"<id>": "room"}).
// Original The Witness RAM; custody edits below are X-tier consumer controls. Native proof of the radio toggling in
// its room: work/investigations/claude-probe/p4-witness/witness-radio-room.json.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const bytes=Uint8Array.from(require(process.cwd()+'/work/investigations/zil-attr-analyzer.js').story('TheWitness.z3.js'));
const mem=new DataView(bytes.buffer),digest='2290bb3440ac66e14d54d41dbde575066ebdbdc42138ec899496e359bc484824';
const identityHeader=Array.from(bytes.slice(0,28));
let payload={inventory:[],discoveredObjects:[],playerId:79},checks=0;
const c=vm.createContext({console,setTimeout,clearTimeout,window:{},ModuleLibrary:{currentExecutableDigest:()=>digest,currentExecutableIdentity:()=>({digest,header:identityHeader})},ZRamProvider:{getMem:()=>mem},WorldModel:{get lastPayload(){return payload;}},Actionable:{payloadPool:()=>payload.inventory.concat(payload.discoveredObjects),referenceFor:o=>({unique:true,verified:true,noun:o.name}),commandNounFor:o=>o.name,isGameWord:()=>true},AttrCalibrator:{hydrate(){},overrideFor:()=>({}),objectOverrideFor:()=>null,hasConfirmedFlag:()=>false,allowedVerbsFor:()=>[]}});
for(const f of ['ModuleStatFactsClaude','ZRamReader','GrammarProvider','AttributeSchema','ActionSynth','LearnedWords','EquipmentUI','SemanticActions'])vm.runInContext(fs.readFileSync('./js/'+f+'.js','utf8'),c);
const A=c.AttributeSchema,R=c.ZRamReader,S=c.ActionSynth,L=c.LearnedWords,E=c.EquipmentUI,F=c.ModuleStatFactsClaude[digest],h=R.header(mem);
const PLAYER=79,RADIO=162,LIVING=168,DINING=158,MONICA=68,CABINET=161,TABLE=163,OPEN=8;
const G0=h.globals!=null?h.globals:mem.getUint16(0x0c);
function setParent(id,p){mem.setUint8(R.objectBase(h,id)+4,p);}
function setHere(room){setParent(PLAYER,room);mem.setUint16(G0,room);}
function setBit(id,bit,on){const a=R.objectBase(h,id)+(bit>>3),m=128>>(bit&7),v=mem.getUint8(a);mem.setUint8(a,on?v|m:v&~m);}
function obj(id){const raw=R.objectLinks(mem,id);return{id,name:R.shortName(mem,id),parentId:raw.parent,attrs:A.applyTo({},raw,mem)};}
function verbs(id,context){const o=obj(id);if(context==='inventory'){payload.inventory=[o];payload.discoveredObjects=[];}else{payload.inventory=[];payload.discoveredObjects=[o];}
  return{menu:Array.from(S.commandsForObject(o,context).map(x=>x.verb)),independent:Array.from(L.independentForms(o)),raw:A.activationForms(mem,id,context),obj:o};}
function pair(id,context,present){const r=verbs(id,context);for(const list of [r.menu,r.independent]){for(const v of ['turn on','turn off'])assert.equal(list.includes(v),present,context+' '+v+' '+JSON.stringify(list));assert(!list.includes('switch on'));assert(!list.includes('switch off'));}return r;}
function check(name,fn){const snap=bytes.slice();try{fn();checks++;console.log('PASS '+name);}catch(e){e.message=name+': '+e.message;throw e;}finally{bytes.set(snap);}}
function withScope(scope,fn){const had=Object.prototype.hasOwnProperty.call(F,'switchableScope'),old=F.switchableScope;try{if(scope===undefined)delete F.switchableScope;else F.switchableScope=scope;fn();}finally{if(had)F.switchableScope=old;else delete F.switchableScope;}}

check('actual family and authored TURN templates validate',()=>{const f=c.GrammarProvider.decodeD198(mem);assert.equal(f.classification,'confirmed-zil-family');assert.equal(f.evidence,'validated');assert(f.templates.some(t=>t.verb==='turn'&&t.prepositions[0]==='on'));assert.strictEqual(R.executableLayoutFacts(mem),F);});
check('original RAM: radio is a direct child of the living room',()=>assert.equal(R.objectLinks(mem,RADIO).parent,LIVING));
check('listed id in the player room gets both forms',()=>{setHere(LIVING);const r=pair(RADIO,'room',true);assert.deepStrictEqual(Array.from(r.raw),['turn on','turn off']);});
check('state-less toggle shows no state badge',()=>{setHere(LIVING);assert.deepStrictEqual(Array.from(E.activationStateTags(verbs(RADIO,'room').obj)),[]);});
check('held listed id keeps forms (unchanged inventory path)',()=>{setHere(LIVING);setParent(RADIO,PLAYER);pair(RADIO,'inventory',true);});
check('listed id outside the player room gets none',()=>{setHere(DINING);pair(RADIO,'room',false);assert.deepStrictEqual(Array.from(A.activationForms(mem,RADIO,'room')),[]);});
check('listed id inside an NPC gets none',()=>{setHere(LIVING);setParent(RADIO,MONICA);pair(RADIO,'room',false);});
check('listed id on a supporter in the room gets forms',()=>{setHere(LIVING);assert(obj(TABLE).attrs.supporter);setParent(RADIO,TABLE);pair(RADIO,'room',true);});
check('listed id in an open container in the room gets forms',()=>{setHere(LIVING);setBit(CABINET,OPEN,true);assert(obj(CABINET).attrs.container);setParent(RADIO,CABINET);pair(RADIO,'room',true);});
check('listed id in a closed container in the room gets none',()=>{setHere(LIVING);setBit(CABINET,OPEN,false);setParent(RADIO,CABINET);pair(RADIO,'room',false);});
check('caller context string cannot substitute for live room',()=>{setHere(DINING);for(const ctx of ['room','here','scope',undefined])assert.deepStrictEqual(Array.from(A.activationForms(mem,RADIO,ctx)||[]),[]);});
const bad=[null,[],'room',{},{'162':'held'},{'162':'ROOM'},{'162':true},{'162':'room','999':'room'},{'162':'room','163':'room'},{'0162':'room'},{'162.0':'room'},{'x':'room'},{'162':'room','168':'room'},Object.assign(Object.create({inherited:1}),{'162':'room'})];
for(const s of bad)check('malformed scope is absent '+JSON.stringify(s),()=>withScope(s,()=>{setHere(LIVING);pair(RADIO,'room',false);setParent(RADIO,PLAYER);pair(RADIO,'inventory',true);}));
check('no switchableScope: room none, held unchanged',()=>withScope(undefined,()=>{setHere(LIVING);pair(RADIO,'room',false);setParent(RADIO,PLAYER);pair(RADIO,'inventory',true);}));
check('unlisted member of a scoped entry stays held-only',()=>{const old=F.attributeObjects.switchable;try{F.attributeObjects.switchable=[162,163];setHere(LIVING);pair(TABLE,'room',false);setParent(TABLE,PLAYER);pair(TABLE,'inventory',true);}finally{F.attributeObjects.switchable=old;}});
check('non-switch in the room never gains forms',()=>{setHere(LIVING);pair(164,'room',false);});
check('wrong supplied header rejects room forms',()=>{setHere(LIVING);const old=mem.getUint8(2);try{mem.setUint8(2,old^1);pair(RADIO,'room',false);}finally{mem.setUint8(2,old);}});
check('unknown family rejects room forms',()=>{const family=A._familyOf;try{A._familyOf=()=>({classification:'unknown'});setHere(LIVING);pair(RADIO,'room',false);}finally{A._familyOf=family;}});
check('Inform-declared names leave activationForms unowned (null) in room',()=>{const names=R.informAttributeNames,compiled=R.isInformCompiled;try{R.isInformCompiled=()=>true;R.informAttributeNames=()=>({bits:{switchable:26}});setHere(LIVING);assert.strictEqual(A.activationForms(mem,RADIO,'room'),null);}finally{R.informAttributeNames=names;R.isInformCompiled=compiled;}});
console.log(checks+' room-switch controls passed');
