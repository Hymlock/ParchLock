// lightForms consumer (four-seat ACCEPT; grok2 draft sha 76e755d4, codex 0231, grok review) on real story bytes.
// Custody/state bit edits are X-tier consumer controls; native evidence is work/investigations/zil-titles/lightsource-native/.
const fs=require('fs'),vm=require('vm'),assert=require('assert'),crypto=require('crypto');
const root=process.env.LIGHT_SOURCE_ROOT||'.';
const story=require(process.cwd()+'/work/investigations/zil-attr-analyzer.js').story;
let checks=0;
function check(name,fn){try{fn();checks++;console.log('PASS '+name);}catch(e){e.message=name+': '+e.message;throw e;}}
function load(file){
  const bytes=Uint8Array.from(story(file)),mem=new DataView(bytes.buffer);
  const digest=crypto.createHash('sha256').update(bytes).digest('hex'),header=Array.from(bytes.slice(0,28));
  const T={payload:{inventory:[],discoveredObjects:[]},mem,digest,bytes};
  T.names={};
  const c=vm.createContext({console,setTimeout,clearTimeout,window:{},document:{readyState:'loading',addEventListener(){}},UndoRestoreSync:{generation:7},ModuleLibrary:{currentExecutableDigest:()=>T.digest,currentExecutableIdentity:()=>({digest:T.digest,header})},ZRamProvider:{getMem:()=>mem},WorldModel:{get lastPayload(){return T.payload;}},Actionable:{payloadPool:()=>T.payload.inventory.concat(T.payload.discoveredObjects),referenceFor:o=>({unique:true,verified:true,noun:T.names[o.id]||o.name}),commandNounFor:o=>T.names[o.id]||o.name,isGameWord:()=>true},AttrCalibrator:{dictionaryForm:()=>true,exactFormsFor:()=>[],RPG_VERBS:[],ITEM_SUGGESTION_VERBS:[],hydrate(){},overrideFor:()=>({}),objectOverrideFor:()=>null,hasConfirmedFlag:()=>false,allowedVerbsFor:()=>[]}});
  for(const f of ['ModuleStatFactsClaude','ZRamReader','GrammarProvider','AttributeSchema','ActionSynth','LearnedWords','EquipmentUI','SemanticActions'])vm.runInContext(fs.readFileSync(root+'/js/'+f+'.js','utf8'),c);
  // The REAL Actionable.radialCommandCurrent (extracted from js/Actionable.js), not a harness re-implementation.
  {const src=fs.readFileSync(root+'/js/Actionable.js','utf8'),k=src.indexOf('radialCommandCurrent: function');let i=src.indexOf('{',k),d=0,j=i;for(;j<src.length;j++){if(src[j]==='{')d++;else if(src[j]==='}'&&--d===0)break;}
  c.Actionable.radialCommandCurrent=vm.runInContext('(function'+src.slice(src.indexOf('(',k),j+1)+')',c);}
  Object.assign(T,{c,A:c.AttributeSchema,R:c.ZRamReader,S:c.ActionSynth,F:c.ModuleStatFactsClaude[digest]});
  T.h=T.R.header(mem);
  const pl=T.R.resolvePlayer(mem);T.player=pl&&pl.id;T.room=T.player&&T.R.enclosingRoom(mem,T.player);T.count=T.R.objectCount(mem,T.h);
  T.payload.playerId=T.player;
  T.bit=(id,b,v)=>{const a=T.R.objectBase(T.h,id)+(b>>3),m=0x80>>(b&7);if(v===undefined)return !!(mem.getUint8(a)&m);mem.setUint8(a,v?(mem.getUint8(a)|m):(mem.getUint8(a)&~m));};
  T.parent=(id,p)=>{const base=T.R.objectBase(T.h,id);if(T.h.version<=3)mem.setUint8(base+4,p);else mem.setUint16(base+6,p);};
  T.obj=id=>{const raw=T.R.objectLinks(mem,id);return{id,name:T.R.shortName(mem,id),parentId:raw.parent,attrs:T.A.applyTo({},raw,mem)};};
  T.menu=(id,ctx)=>{const o=T.obj(id);if(ctx==='inventory'){T.payload.inventory=[o];T.payload.discoveredObjects=[];}else{T.payload.inventory=[];T.payload.discoveredObjects=[o];}return Array.from(T.S.commandsForObject(o,ctx).map(x=>x.command));};
  T.held=id=>{T.parent(id,T.player);return T.menu(id,'inventory');};
  return T;
}
const LIGHT=/^(light|blow out|extinguish|turn on|turn off|strike) /;
const lv=list=>list.filter(x=>LIGHT.test(x));
const titles={Infidel:'Infidel.z3.js',Cutthroats:'Cutthroats.z3.js',Enchanter:'Enchanter.z3.js'};
const words={Infidel:['light','blow','out','extinguish'],Cutthroats:['turn','on','off'],Enchanter:['turn','off']};
const G={};for(const k in titles)G[k]=load(titles[k]);
for(const k in G)check(k+' exact fact, validated confirmed-zil-family, dictionary literals',()=>{const T=G[k];assert(T.F&&T.F.lightForms);assert.strictEqual(T.R.executableLayoutFacts(T.mem),T.F);const f=T.A._familyOf(T.mem);assert.equal(f.classification,'confirmed-zil-family');assert.equal(f.evidence,'validated');for(const w of words[k])assert(T.R.hasDictionaryWord(T.mem,w),w);});
const I=G.Infidel,Cu=G.Cutthroats,E=G.Enchanter,torchRoom=I.R.objectLinks(I.mem,198).parent;
const nm=(T,id)=>T.obj(id).name;
check('Infidel match 46 unlit -> light; lit -> blow out',()=>{I.bit(46,21,0);assert.deepStrictEqual(lv(I.held(46)),['light '+nm(I,46)]);I.bit(46,21,1);assert.deepStrictEqual(lv(I.held(46)),['blow out '+nm(I,46)]);I.bit(46,21,0);});
check('Infidel torch 198 unlit -> light; lit -> extinguish',()=>{I.bit(198,21,0);assert.deepStrictEqual(lv(I.held(198)),['light '+nm(I,198)]);I.bit(198,21,1);assert.deepStrictEqual(lv(I.held(198)),['extinguish '+nm(I,198)]);I.bit(198,21,0);});
check('Infidel shovel 33 / pickaxe 37 with BURNBIT 11 forced set get no light forms',()=>{for(const id of [33,37]){I.bit(id,11,1);assert.deepStrictEqual(lv(I.held(id)),[]);I.bit(id,21,1);assert.deepStrictEqual(lv(I.held(id)),[]);I.bit(id,21,0);}});
check('Infidel capabilityBit 11 does not gate an owner',()=>{const old=I.bit(198,11);I.bit(198,11,0);assert.deepStrictEqual(lv(I.held(198)),['light '+nm(I,198)]);I.bit(198,11,old);});
check('Infidel owner in player room (Chamber of Ra) -> forms; in another room -> none',()=>{const ra=torchRoom;I.parent(I.player,ra);I.room=I.R.enclosingRoom(I.mem,I.player);assert.equal(I.room,ra);I.parent(198,I.room);assert.deepStrictEqual(lv(I.menu(198,'room')),['light '+nm(I,198)]);const rp=I.R.objectLinks(I.mem,I.room).parent;let other=0;for(let id=1;id<=I.count&&!other;id++)if(id!==I.room&&id!==I.player&&I.R.objectLinks(I.mem,id).parent===rp)other=id;assert(other);I.parent(198,other);assert.deepStrictEqual(lv(I.menu(198,'room')),[]);I.parent(198,I.player);});
check('Cutthroats flashlight 116 off -> turn on; on -> turn off; key 143 / watch 6 none',()=>{Cu.bit(116,17,0);assert.deepStrictEqual(lv(Cu.held(116)),['turn on '+nm(Cu,116)]);Cu.bit(116,17,1);assert.deepStrictEqual(lv(Cu.held(116)),['turn off '+nm(Cu,116)]);Cu.bit(116,17,0);for(const id of [143,6]){Cu.bit(id,27,1);Cu.bit(id,17,1);assert.deepStrictEqual(lv(Cu.held(id)),[]);}});
check('Enchanter lantern 94 off-only: unlit none, lit turn off; candle 204 lit none',()=>{E.bit(94,22,0);assert.deepStrictEqual(lv(E.held(94)),[]);E.bit(94,22,1);assert.deepStrictEqual(lv(E.held(94)),['turn off '+nm(E,94)]);E.bit(94,22,0);E.bit(204,22,1);assert.deepStrictEqual(lv(E.held(204)),[]);});
// True object frontier (codex 0907): heuristic objectCount runs past the table (Infidel 438 vs 249).
const trueCount=function(T){const h=T.R.header(T.mem),first=T.R.objectBase(h,1),fp=T.R.u16(T.mem,first+(h.version<=3?7:12)),n=(fp-first)/h.entrySize;assert(Number.isInteger(n)&&n>=2&&fp<h.staticMem,'true frontier');return n;};
// Malformed => absent => identical to no fact, for every TRUE object of the title (never scan heuristic count).
function sweep(T){const n=trueCount(T),out=[];for(let id=1;id<=n;id++){if(id===T.player)continue;let s;try{s=T.menu(id,'inventory').join('|');}catch(e){s='ERR';}out.push(id+':'+s);}return out;}
// Clone inside the title's VM realm (codex 0907): a host-realm object fails the strict plain() check, which would
// make every malformed variant trivially null and leave the restored fact silently disabled.
const clone=o=>vm.runInContext('JSON.parse('+JSON.stringify(JSON.stringify(o))+')',I.c);
const good=clone(I.F.lightForms);
const noneI=(()=>{delete I.F.lightForms;const s=sweep(I);I.F.lightForms=clone(good);return s;})();
const w=(o)=>Object.assign(clone(good),o),wo=k=>{const g=clone(good);delete g[k];return g;};
const bads=[null,[],{},'x',w({extra:1}),w({objects:[]}),w({objects:[46,46]}),w({objects:[46,99999]}),w({objects:[46,'198']}),w({objects:[0,198]}),w({stateBit:32}),w({stateBit:'21'}),w({capabilityBit:40}),w({on:{'33':'light'}}),w({on:{default:''}}),w({on:{default:'Light!'}}),w({on:null,off:null}),w({off:[]}),wo('on'),wo('off'),wo('stateBit'),wo('objects')];
for(const b of bads)check('Infidel malformed '+JSON.stringify(b)+' -> every menu identical to no fact',()=>{I.F.lightForms=b;try{assert.deepStrictEqual(sweep(I),noneI);}finally{I.F.lightForms=clone(good);}});
check('Infidel wrong executable digest -> absent',()=>{const d=I.digest;I.digest='0'.repeat(64);try{assert.deepStrictEqual(lv(I.held(198)),[]);}finally{I.digest=d;}});
// Custody miss => empty offer list (fact still present).
const noOffer=function(v){assert.ok(Array.isArray(v)&&v.length===0,'expected [] got '+JSON.stringify(v));};
check('Infidel torch 198 off-stage (parent 0) asked as inventory -> no forms',()=>{I.bit(198,21,0);const p=I.R.objectLinks(I.mem,198).parent;I.parent(198,0);try{noOffer(I.A.lightForms(I.mem,198,'inventory'));}finally{I.parent(198,p);}});
check('Infidel torch 198 nested in a container held by the player, asked as inventory -> no forms',()=>{const tc=trueCount(I);let box=0;for(let id=1;id<=tc&&!box;id++)if(id!==198&&id!==I.player&&I.R.objectLinks(I.mem,id).parent===I.player)box=id;assert(box,'need a held container');const p=I.R.objectLinks(I.mem,198).parent;I.parent(198,box);try{noOffer(I.A.lightForms(I.mem,198,'inventory'));}finally{I.parent(198,p);}});
check('Infidel descriptor naming an id beyond the TRUE frontier -> absent',()=>{const tf=trueCount(I);assert(tf<I.R.objectCount(I.mem,I.h),'heuristic count exceeds true frontier');const g=clone(I.F.lightForms);I.F.lightForms=Object.assign(clone(g),{objects:g.objects.concat([tf+1])});try{assert.strictEqual(I.A.lightForms(I.mem,198,'inventory'),null);}finally{I.F.lightForms=clone(g);}});
check('Infidel unvalidated family -> absent',()=>{const f=I.A._familyOf;I.A._familyOf=()=>({classification:'unknown'});try{assert.deepStrictEqual(lv(I.held(198)),[]);}finally{I.A._familyOf=f;}});
check('Infidel/Cutthroats/Enchanter non-owners identical to no fact',()=>{for(const T of [I,Cu,E]){const g=T.F.lightForms,own=new Set(g.objects),keep=l=>!own.has(+l.split(':')[0]);const a=sweep(T).filter(keep);delete T.F.lightForms;const b=sweep(T).filter(keep);T.F.lightForms=g;assert.deepStrictEqual(a,b);}});
// Other titles: lightForms absent for every TRUE-frontier object (not heuristic count).
// Sherlock's explicit new opt-in has dedicated positive/custody controls in
// zil-light-unresolved-player.js; it is no longer an absent-fact negative.
const others=fs.readdirSync(root+'/games').filter(f=>/\.z[345]\.js$/.test(f)&&!Object.values(titles).includes(f)&&f!=='Sherlock.z5.js');
check('other Z titles: lightForms absent for every object (switchable titles unchanged)',()=>{let n=0;for(const f of others){let T;try{T=load(f);}catch(e){continue;}if(!T.h)continue;let tc;try{tc=trueCount(T);}catch(e){continue;}for(let id=1;id<=tc;id++)assert.strictEqual(T.A.lightForms(T.mem,id,'inventory'),null,f+' '+id);n++;}console.log('  other titles checked: '+n);assert(n>10);});
// Tap currency (codex 1107; identity-Wear pattern): every light verb carries a lightFormScope re-validated at tap.
// The row's owner is placed in the live payload exactly as the menu path does; tap revalidation reads it there (codex c3df REVISE 1).
const lightRow=(T,id,ctx)=>{const o=T.obj(id);if(ctx==='inventory'){T.payload.inventory=[o];T.payload.discoveredObjects=[];}else{T.payload.inventory=[];T.payload.discoveredObjects=[o];}return T.S.commandsForObject(o,ctx).find(x=>LIGHT.test(x.command));};
const cur=(T,r)=>T.c.Actionable.radialCommandCurrent(r);
check('Infidel torch held: light verb carries lightFormScope (digest, generation, id, noun, side, stateBit)',()=>{I.bit(198,21,0);I.parent(198,I.player);const r=lightRow(I,198,'inventory'),n=nm(I,198);
  assert(r&&r.lightFormScope,'scoped');assert.deepStrictEqual(JSON.parse(JSON.stringify(r.lightFormScope)),{kind:'lightForms',digest:I.digest,generation:7,id:198,noun:n,verb:'light',command:'light '+n,side:'on',stateBit:21,context:'inventory'});
  assert(I.S.lightFormCommandCurrent(r));assert(cur(I,r));});
check('tap currency: state flipped after menu render -> rejected',()=>{for(const [T,id,b,start] of [[I,198,21,0],[Cu,116,17,0],[E,94,22,1]]){T.bit(id,b,start);T.parent(id,T.player);const r=lightRow(T,id,'inventory');assert(r&&cur(T,r));T.bit(id,b,!start);assert(!T.S.lightFormCommandCurrent(r));assert(!cur(T,r));T.bit(id,b,start);assert(cur(T,r));T.bit(id,b,0);}});
check('tap currency: custody lost (dropped elsewhere / nested / off-stage) -> rejected',()=>{I.bit(198,21,0);I.parent(198,I.player);const r=lightRow(I,198,'inventory');assert(cur(I,r));
  I.parent(198,0);assert(!cur(I,r));let box=0;const tc=trueCount(I);for(let id=1;id<=tc&&!box;id++)if(id!==198&&id!==I.player&&I.R.objectLinks(I.mem,id).parent===I.player)box=id;I.parent(198,box);assert(!cur(I,r));I.parent(198,I.player);assert(cur(I,r));});
check('tap currency: room owner moved out of the player room -> rejected',()=>{I.bit(198,21,0);I.parent(198,I.R.enclosingRoom(I.mem,I.player));const r=lightRow(I,198,'room');assert(r&&r.lightFormScope&&r.lightFormScope.context==='room'&&cur(I,r));I.parent(198,0);assert(!cur(I,r));I.parent(198,I.player);});
check('tap currency: generation bump -> rejected',()=>{I.bit(198,21,0);I.parent(198,I.player);const r=lightRow(I,198,'inventory');I.c.UndoRestoreSync.generation=8;try{assert(!cur(I,r));}finally{I.c.UndoRestoreSync.generation=7;}assert(cur(I,r));});
check('tap currency: noun drift / command mismatch / digest drift -> rejected',()=>{I.bit(198,21,0);I.parent(198,I.player);const r=lightRow(I,198,'inventory'),n=nm(I,198);
  I.names[198]=n+'x';try{assert(!cur(I,r));}finally{delete I.names[198];}assert(cur(I,r));
  assert(!cur(I,Object.assign({},r,{command:'light '+n+' with match'})));
  const ml=I.c.ModuleLibrary,old=ml.currentExecutableDigest;ml.currentExecutableDigest=()=>'0'.repeat(64);try{assert(!cur(I,r));}finally{ml.currentExecutableDigest=old;}});
check('shared/multi-object rows exclude lightFormScope commands',()=>{I.bit(198,21,0);I.parent(198,I.player);const r=lightRow(I,198,'inventory');assert(!cur(I,{verb:r.verb,command:r.command,sharedMembers:[r,r]}));assert(!I.S.lightFormCommandCurrent(Object.assign({},r,{sharedMembers:[r]})));});
check('SemanticActions keeps lightFormScope',()=>{for(const [T,id,b,v] of [[I,198,21,0],[Cu,116,17,1]]){T.bit(id,b,v);T.held(id);const sem=T.c.SemanticActions.resolveForPayloadObjectId(id,'inventory')||[];const s=sem.find(x=>LIGHT.test(x.command||''));assert(s&&s.lightFormScope&&s.lightFormScope.kind==='lightForms',JSON.stringify(sem.map(x=>x.command)));T.bit(id,b,0);}});
check('Equipment Yourself row keeps lightFormScope + capitalized verb label; selection re-validates',()=>{for(const [T,id,b,v,label] of [[I,198,21,0,'Light'],[Cu,116,17,1,'Turn off'],[E,94,22,1,'Turn off']]){T.bit(id,b,v);T.held(id);
  const rows=T.c.EquipmentUI.yourselfCommands(T.obj(id),{}),row=rows.find(x=>x.ScopedCommand&&x.ScopedCommand.lightFormScope);assert(row,JSON.stringify(rows.map(x=>x.Form)));assert.strictEqual(row.Label,label);
  const ran=[],EU=T.c.EquipmentUI,old=[EU.interactionReady,EU.model,T.c.Actionable.runChosenCommand];EU.interactionReady=()=>true;EU.model=()=>({byId:{[String(id)]:T.obj(id)}});T.c.Actionable.runChosenCommand=x=>ran.push(x);
  try{EU.selectYourselfAction(id,row.Form,true,0,'k',row.ScopedCommand);assert.deepStrictEqual(ran,[row.ScopedCommand.command]);
    T.bit(id,b,!v);EU.selectYourselfAction(id,row.Form,true,0,'k',row.ScopedCommand);assert.strictEqual(ran.length,1,'flipped state rejected at Equipment tap');}
  finally{[EU.interactionReady,EU.model,T.c.Actionable.runChosenCommand]=old;T.bit(id,b,0);}}});
console.log(checks+' lightForms controls passed');
