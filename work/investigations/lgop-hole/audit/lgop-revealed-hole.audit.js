// LGOP hole: revealedLocalGlobal consumer (proposal-r1 R2+R3; codex ACCEPT lgop-proposal-r3-vote-1207) on real story bytes.
// Audit copy (claude seat, 2026-10-31): adapted from wt-claude-lgop; reader is plural revealedLocalGlobalObjects; family-cache reset after the decodeD198 stub (harness artifact, the cache is keyed by buffer+identity).
// RAM edits (player parent, HERE slot 0, gate slot 144, membership byte, parent, SDESC word) are X-tier consumer controls;
// native evidence is the seeded lgop-hole-reveal route (work/investigations/lgop-hole/impl/).
const fs=require('fs'),vm=require('vm'),assert=require('assert'),crypto=require('crypto');
const root=process.env.LGOP_SOURCE_ROOT||'.';
const story=require(process.cwd()+'/work/investigations/zil-attr-analyzer.js').story;
let checks=0;
let fails=0;function check(name,fn){try{fn();checks++;console.log('PASS '+name);}catch(e){fails++;console.log('FAIL '+name+' :: '+String(e.message).replace(/\s+/g,' ').slice(0,220));}}
function load(file){
  const bytes=Uint8Array.from(story(file)),mem=new DataView(bytes.buffer);
  const digest=crypto.createHash('sha256').update(bytes).digest('hex'),header=Array.from(bytes.slice(0,28));
  const T={payload:{inventory:[],discoveredObjects:[]},mem,digest,bytes,names:{}};
  const c=vm.createContext({console,setTimeout,clearTimeout,window:{},document:{readyState:'loading',addEventListener(){}},UndoRestoreSync:{generation:7},
    ModuleLibrary:{currentExecutableDigest:()=>T.digest,currentExecutableIdentity:()=>({digest:T.digest,header})},ZRamProvider:{getMem:()=>mem},
    WorldModel:{get lastPayload(){return T.payload;}},
    Actionable:{payloadPool:()=>T.payload.inventory.concat(T.payload.discoveredObjects),referenceFor:o=>({unique:true,verified:true,noun:T.names[o.id]||o.name}),commandNounFor:o=>T.names[o.id]||o.name,isGameWord:()=>true},
    AttrCalibrator:{dictionaryForm:()=>true,exactFormsFor:()=>[],RPG_VERBS:[],ITEM_SUGGESTION_VERBS:[],hydrate(){},overrideFor:()=>({}),objectOverrideFor:()=>null,hasConfirmedFlag:()=>false,allowedVerbsFor:()=>[]}});
  for(const f of ['ModuleStatFactsClaude','ZRamReader','GrammarProvider','AttributeSchema','ActionSynth','LearnedWords','EquipmentUI','SemanticActions'])vm.runInContext(fs.readFileSync(root+'/js/'+f+'.js','utf8'),c);
  // The REAL Actionable.radialCommandCurrent (extracted from js/Actionable.js).
  {const src=fs.readFileSync(root+'/js/Actionable.js','utf8'),k=src.indexOf('radialCommandCurrent: function');let i=src.indexOf('{',k),d=0,j=i;for(;j<src.length;j++){if(src[j]==='{')d++;else if(src[j]==='}'&&--d===0)break;}
  c.Actionable.radialCommandCurrent=vm.runInContext('(function'+src.slice(src.indexOf('(',k),j+1)+')',c);}
  Object.assign(T,{c,R:c.ZRamReader,S:c.ActionSynth,F:c.ModuleStatFactsClaude[digest]});
  T.h=T.R.header(mem);
  return T;
}
const L=load('LeatherGoddessesofPhobos.z3.js'),R=L.R,mem=L.mem,h=L.h;
const PLAYER=200,CELL=50,HOLE=83,HOLDER=40,SLOT=144;
const first=R.objectBase(h,1),frontier=(R.u16(mem,first+7)-first)/h.entrySize;
const setParent=(id,p)=>mem.setUint8(R.objectBase(h,id)+4,p);
const parentOf=id=>R.objectLinks(mem,id).parent;
const setG=(slot,v)=>mem.setUint16(h.globals+2*slot,v);
const getG=slot=>R.u16(mem,h.globals+2*slot);
// Put the player in Cell (physical parent + HERE status global 0), like the native post-collapse state.
const origPlayerParent=parentOf(PLAYER),origHere=getG(0);
function inCell(){setParent(PLAYER,CELL);setG(0,CELL);}
function restorePlayer(){setParent(PLAYER,origPlayerParent);setG(0,origHere);}
const scope=room=>Array.from(R.scopeObjects(mem,room,{depth:2,playerId:PLAYER}));
const has83=room=>scope(room).some(o=>o.id===HOLE);
const clone=o=>vm.runInContext('JSON.parse('+JSON.stringify(JSON.stringify(o))+')',L.c);
const good=clone(L.F.revealedLocalGlobal);
L.names[HOLE]='hole';
function menu(room){const objs=scope(room);L.payload.discoveredObjects=objs;L.payload.inventory=[];const o=objs.find(x=>x.id===HOLE);return o?Array.from(L.S.commandsForObject(o,'room')):null;}

check('LGOP exact fact carries the R3 descriptor, true frontier 228, validated ZIL family',()=>{
  assert.deepStrictEqual(JSON.parse(JSON.stringify(L.F.revealedLocalGlobal)),{object:83,holder:40,room:50,membershipProperty:15,nameProperty:16,namePackedValue:59426,nameValue:'black circle',gateGlobalSlot:144,forms:['examine']});
  assert.strictEqual(R.executableLayoutFacts(mem),L.F);assert.strictEqual(frontier,228);
  const f=L.c.GrammarProvider.decodeD198(mem);assert.equal(f.classification,'confirmed-zil-family');assert.equal(f.evidence,'validated');
  assert.strictEqual(parentOf(HOLE),HOLDER);assert.strictEqual(R.shortName(mem,HOLE),'');});
check('real bytes: Cell 50 prop 15 lists 83; 83 prop 16 = 2 bytes raw 59426; boot slot 144 = 0',()=>{
  const p=R.listProps(mem,CELL).find(q=>q.num===15);assert.deepStrictEqual([0,1,2].slice(0,p.sz).map(i=>R.u8(mem,p.dataAddr+i)),[202,83,173]);
  const n=R.listProps(mem,HOLE).find(q=>q.num===16);assert.strictEqual(n.sz,2);assert.strictEqual(R.u16(mem,n.dataAddr),59426);assert.strictEqual(getG(SLOT),0);});
check('hidden Cell (slot 144 = 0): 83 not admitted, no menu',()=>{inCell();setG(SLOT,0);try{assert(!has83(CELL));assert.strictEqual(menu(CELL),null);}finally{restorePlayer();}});
let revealedRow;
check('revealed Cell (slot 144 = 1): 83 admitted with name "black circle", parent 40 kept, scopeRoom 50, Examine only',()=>{inCell();setG(SLOT,1);try{
  const o=scope(CELL).find(x=>x.id===HOLE);assert(o,'admitted');assert.strictEqual(o.name,'black circle');assert.strictEqual(o.parentId,HOLDER);assert.strictEqual(o.scopeRoomId,CELL);
  assert(o.localGlobal&&o.revealedLocalGlobal);assert.deepStrictEqual(Array.from(o.aliases).sort(),['circle','hole']);
  assert.strictEqual(parentOf(HOLE),HOLDER,'physical parent unchanged');
  const m=menu(CELL);assert.deepStrictEqual(m.map(x=>x.command),['examine hole']);revealedRow=m[0];
  {const sc=JSON.parse(JSON.stringify(revealedRow.revealedLocalGlobalScope));assert.deepStrictEqual([sc.digest,sc.generation,sc.id,sc.room,sc.parent,sc.name,sc.noun,sc.command],[L.digest,7,83,50,40,'black circle','hole','examine hole']);}
  assert(L.c.Actionable.radialCommandCurrent(revealedRow));
  const sem=L.c.SemanticActions.resolveForPayloadObjectId(HOLE,'room');assert.deepStrictEqual(Array.from(sem.map(x=>x.command)),['examine hole']);assert(sem[0].revealedLocalGlobalScope);
  assert.deepStrictEqual(Array.from(L.S.commandsForObject(o,'inventory')),[]);
  // ProviderFilter: the ZRamProvider name filter keeps it (non-empty, not "(").
  L.names[HOLE]='circle';assert.deepStrictEqual(menu(CELL).map(x=>x.command),['examine circle']);

}finally{L.names[HOLE]='hole';setG(SLOT,0);restorePlayer();}});
check('wrong room: player elsewhere / caller room mismatch -> not admitted',()=>{setG(SLOT,1);try{
  assert(!has83(origPlayerParent));
  inCell();assert(has83(CELL));
  // Caller room 50 but the player's actual room is another room that also lists 83 or not.
  setParent(PLAYER,origPlayerParent);setG(0,origHere);assert(!has83(CELL));
  inCell();assert.strictEqual((R.revealedLocalGlobalObjects(mem,origPlayerParent,PLAYER)[0]||null),null);
}finally{setG(SLOT,0);restorePlayer();}});
check('membership missing / parent changed -> not admitted',()=>{inCell();setG(SLOT,1);const p=R.listProps(mem,CELL).find(q=>q.num===15),at=p.dataAddr+1;try{
  mem.setUint8(at,0);assert(!has83(CELL));mem.setUint8(at,HOLE);assert(has83(CELL));
  setParent(HOLE,0);assert(!has83(CELL));setParent(HOLE,HOLDER);assert(has83(CELL));
}finally{mem.setUint8(at,HOLE);setParent(HOLE,HOLDER);setG(SLOT,0);restorePlayer();}});
check('name raw value mismatch (before decode) -> not admitted',()=>{inCell();setG(SLOT,1);const n=R.listProps(mem,HOLE).find(q=>q.num===16);try{
  mem.setUint16(n.dataAddr,59427);assert(!has83(CELL));mem.setUint16(n.dataAddr,59426);assert(has83(CELL));
}finally{mem.setUint16(n.dataAddr,59426);setG(SLOT,0);restorePlayer();}});
check('decoded value mismatch with matching raw word -> not admitted',()=>{inCell();setG(SLOT,1);try{
  L.F.revealedLocalGlobal=Object.assign(clone(good),{nameValue:'black hole'});assert(!has83(CELL));
}finally{L.F.revealedLocalGlobal=clone(good);setG(SLOT,0);restorePlayer();}});
check('wrong digest / header drift / unvalidated family -> not admitted',()=>{inCell();setG(SLOT,1);try{
  const d=L.digest;L.digest='0'.repeat(64);try{assert(!has83(CELL));}finally{L.digest=d;}
  const b=R.u8(mem,0x12);mem.setUint8(0x12,b^1);try{assert(!has83(CELL));}finally{mem.setUint8(0x12,b);}
  const g=L.c.GrammarProvider.decodeD198;L.c.AttributeSchema._famCache=null;L.c.GrammarProvider.decodeD198=()=>({classification:'unknown'});try{assert(!has83(CELL));}finally{L.c.GrammarProvider.decodeD198=g;L.c.AttributeSchema._famCache=null;}
  assert(has83(CELL));
}finally{setG(SLOT,0);restorePlayer();}});
const w=o=>Object.assign(clone(good),o),wo=k=>{const g=clone(good);delete g[k];return g;};
const bads=[null,[],{},'x',w({extra:1}),wo('object'),wo('holder'),wo('room'),wo('membershipProperty'),wo('nameProperty'),wo('namePackedValue'),wo('nameValue'),wo('gateGlobalSlot'),wo('forms'),
  w({object:'83'}),w({object:229}),w({object:0}),w({holder:229}),w({room:229}),w({room:'50'}),w({object:40}),w({membershipProperty:32}),w({membershipProperty:16}),w({nameProperty:0}),
  w({namePackedValue:'59426'}),w({namePackedValue:70000}),w({nameValue:''}),w({nameValue:7}),w({gateGlobalSlot:240}),w({gateGlobalSlot:-1}),w({gateGlobalSlot:143.5}),
  w({forms:[]}),w({forms:['examine','examine']}),w({forms:['examine','enter']}),w({forms:['stand on']}),w({forms:'examine'})];
for(const b of bads)check('malformed '+JSON.stringify(b)+' -> absent (scope identical to no descriptor)',()=>{inCell();setG(SLOT,1);try{
  delete L.F.revealedLocalGlobal;const none=JSON.stringify(scope(CELL));L.F.revealedLocalGlobal=clone(b);assert.strictEqual(JSON.stringify(scope(CELL)),none);assert(!has83(CELL));
}finally{L.F.revealedLocalGlobal=clone(good);setG(SLOT,0);restorePlayer();}});
check('noun "black circle" (adjective black + synonym circle; natively accepted, lgop-noun-native.run.json) -> examine black circle',()=>{inCell();setG(SLOT,1);try{L.names[HOLE]='black circle';assert.deepStrictEqual(Array.from(menu(CELL).map(x=>x.command)),['examine black circle']);}finally{L.names[HOLE]='hole';setG(SLOT,0);restorePlayer();}});
check('hidden vs revealed: everything except 83 is byte-identical in the Cell scope',()=>{inCell();try{setG(SLOT,0);const a=scope(CELL);setG(SLOT,1);const b=scope(CELL).filter(o=>o.id!==HOLE);assert.strictEqual(JSON.stringify(b),JSON.stringify(a));}finally{setG(SLOT,0);restorePlayer();}});
// Tap currency.
const cur=r=>L.c.Actionable.radialCommandCurrent(r);
function row(){inCell();setG(SLOT,1);return menu(CELL)[0];}
check('tap currency: gate closed / player left / parent moved / generation / noun / digest / command drift -> rejected',()=>{try{
  let r=row();assert(cur(r));setG(SLOT,0);assert(!cur(r));setG(SLOT,1);assert(cur(r));
  setParent(PLAYER,origPlayerParent);setG(0,origHere);assert(!cur(r));inCell();assert(cur(r));
  setParent(HOLE,0);assert(!cur(r));setParent(HOLE,HOLDER);assert(cur(r));
  L.c.UndoRestoreSync.generation=8;assert(!cur(r));L.c.UndoRestoreSync.generation=7;assert(cur(r));
  L.names[HOLE]='circle';assert(!cur(r));L.names[HOLE]='hole';assert(cur(r));
  const ml=L.c.ModuleLibrary,old=ml.currentExecutableDigest;ml.currentExecutableDigest=()=>'0'.repeat(64);try{assert(!cur(r));}finally{ml.currentExecutableDigest=old;}
  assert(!cur(Object.assign({},r,{command:'enter hole'})));assert(!cur(Object.assign({},r,{verb:'enter'})));
  assert(!cur({verb:r.verb,command:r.command,sharedMembers:[r,r]}));
}finally{setParent(HOLE,HOLDER);setG(SLOT,0);restorePlayer();}});
// Other titles: no revealedLocalGlobal fact anywhere else, and the reader admits nothing.
check('other titles: no revealedLocalGlobal anywhere else; reader null for every room',()=>{
  const facts=L.c.ModuleStatFactsClaude;const owners=Object.keys(facts).filter(k=>facts[k]&&facts[k].revealedLocalGlobal);assert.deepStrictEqual(owners,[L.digest]);
  const others=fs.readdirSync(root+'/games').filter(f=>/\.z[345]\.js$/.test(f)&&f!=='LeatherGoddessesofPhobos.z3.js');let n=0;
  for(const f of others){let T;try{T=load(f);}catch(e){continue;}if(!T.h)continue;const pl=T.R.resolvePlayer(T.mem);const pid=pl&&pl.id||0;
    const fr=(()=>{const b=T.R.objectBase(T.h,1),fp=T.R.u16(T.mem,b+(T.h.version<=3?7:12)),c=(fp-b)/T.h.entrySize;return Number.isInteger(c)&&c<4096?c:0;})();
    for(let id=1;id<=fr;id++)assert.strictEqual((T.R.revealedLocalGlobalObjects(T.mem,id,pid)[0]||null),null,f+' '+id);n++;}
  console.log('  other titles checked: '+n);assert(n>10);});
console.log(checks+' PASS / '+fails+' FAIL (audit of 04cc1d32)');
