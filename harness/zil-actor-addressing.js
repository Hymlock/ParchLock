// D8 P8 (claude takeover of codex D8): Suspended addressed robot forms from the per-title actorAddressing fact.
// Original Suspended RAM; parent/global edits below are X-tier consumer controls. Native proof:
// work/investigations/suspended-d14/p8-native/.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const story=require(process.cwd()+'/work/investigations/zil-attr-analyzer.js').story;
const bytes=Uint8Array.from(story('Suspended.z3.js'));
const mem=new DataView(bytes.buffer),digest='6011284a57a6200c4deebfbeae92b3bac2f98a570ddbbc8cfc8bcc382d5b524f';
const identityHeader=Array.from(bytes.slice(0,28));
let payload={inventory:[],discoveredObjects:[]},checks=0,promptText=null,curMem=mem,curDigest=digest,curBytes=bytes;
const fakeDoc={querySelector:s=>{if(promptText===null||s!=='.Input.LineInput')return null;const prev={textContent:promptText,previousElementSibling:null};const line={textContent:'>',previousElementSibling:prev};return{closest:()=>line};}};
const c=vm.createContext({console,setTimeout,clearTimeout,window:{},document:fakeDoc,ModuleLibrary:{currentExecutableDigest:()=>curDigest,currentExecutableIdentity:()=>({digest:curDigest,header:curBytes===bytes?identityHeader:Array.from(curBytes.slice(0,28))})},ZRamProvider:{getMem:()=>curMem},WorldModel:{get lastPayload(){return payload;}},Actionable:{payloadPool:()=>payload.inventory.concat(payload.discoveredObjects),referenceFor:o=>({unique:true,verified:true,noun:o.name}),commandNounFor:o=>o.name,isGameWord:()=>true},AttrCalibrator:{hydrate(){},overrideFor:()=>({}),objectOverrideFor:()=>null,hasConfirmedFlag:()=>false,allowedVerbsFor:()=>[]}});
for(const f of ['ModuleStatFactsClaude','ZRamReader','GrammarProvider','AttributeSchema','ActionSynth','LearnedWords','StatTracker'])vm.runInContext(fs.readFileSync('./js/'+f+'.js','utf8'),c);
const A=c.AttributeSchema,R=c.ZRamReader,S=c.ActionSynth,F=c.ModuleStatFactsClaude[digest],h=R.header(mem);
const IRIS=158,WALDO=155,SENSA=152,AUDA=149,POET=146,WHIZ=144,PEOPLE=140,CABINET=62,BLT=37,HOME=81,GROOVE=45,GAMMA=154,CENTRAL=151;
function setParent(id,p){mem.setUint8(R.objectBase(h,id)+4,p);}
function setGlobal(n,v){mem.setUint16(h.globals+2*n,v);}
function obj(id){const raw=R.objectLinks(mem,id);return{id,name:R.shortName(mem,id).toLowerCase(),parentId:raw.parent,attrs:A.applyTo({},raw,mem)};}
function menu(id,ctx='room'){const o=obj(id);if(ctx==='inventory'){payload={inventory:[o],discoveredObjects:[]};}else payload={inventory:[],discoveredObjects:[o]};return Array.from(S.commandsForObject(o,ctx));}
const addressed=l=>l.filter(x=>x.actorAddressing),bare=l=>l.filter(x=>!x.actorAddressing);
const actorsOf=l=>[...new Set(addressed(l).map(x=>x.command.split(',')[0]))];
function check(name,fn){const snap=bytes.slice();try{fn();checks++;console.log('PASS '+name);}catch(e){e.message=name+': '+e.message;throw e;}finally{bytes.set(snap);promptText=null;}}
function withFact(v,fn){const had=Object.prototype.hasOwnProperty.call(F,'actorAddressing'),old=F.actorAddressing;try{if(v===undefined)delete F.actorAddressing;else F.actorAddressing=v;fn();}finally{if(had)F.actorAddressing=old;else delete F.actorAddressing;}}
const vmJSON=vm.runInContext('JSON',c),vmObject=vm.runInContext('Object',c);
const good=()=>vmJSON.parse(JSON.stringify(F.actorAddressing));
const asg=(a,b)=>vmObject.assign(a,vmJSON.parse(JSON.stringify(b)));

check('family validated and fact is the exact executable fact',()=>{const f=c.GrammarProvider.decodeD198(mem);assert.equal(f.classification,'confirmed-zil-family');assert.equal(f.evidence,'validated');assert.strictEqual(R.executableLayoutFacts(mem),F);});
check('domain is exactly the 6 table robots in table order, People excluded',()=>{const d=S.actorAddressingDomain(mem);assert.deepStrictEqual(Array.from(d.robots.map(r=>r.id)),[IRIS,WALDO,SENSA,AUDA,POET,WHIZ]);assert.deepStrictEqual(Array.from(d.robots.map(r=>r.word)),['iris','waldo','sensa','auda','poet','whiz']);assert(!d.robots.some(r=>r.id===PEOPLE));});
check('VICBIT 24 holders outside the table never enter the domain',()=>{const d=S.actorAddressingDomain(mem),ids=d.robots.map(r=>r.id);const vic=[];for(let id=1;id<=191;id++){const a=R.objectBase(h,id)+3;if(mem.getUint8(a)&128)vic.push(id);}assert.equal(vic.length,14,'VICBIT count '+vic);assert.equal(vic.filter(id=>ids.indexOf(id)<0).length,8);for(const id of vic.filter(id=>ids.indexOf(id)<0))assert.equal(addressed(menu(CABINET)).some(x=>x.actorAddressing.actor===id),false);});
check('co-located robot offered: Waldo for the cabinet in Gamma Repair',()=>{const l=menu(CABINET);assert.deepStrictEqual(actorsOf(l),['waldo']);assert(addressed(l).some(x=>x.command==='waldo, examine cabinet'),JSON.stringify(l.map(x=>x.command)));});
check('bare forms are kept unchanged and come first',()=>{const l=menu(CABINET);const b=bare(l).map(x=>x.command);withFact(undefined,()=>assert.deepStrictEqual(menu(CABINET).map(x=>x.command),b));assert(l.findIndex(x=>x.actorAddressing)>=b.length-0);});
check('non-co-located robots never offered (cabinet: no Iris/Sensa/Auda/Poet/Whiz)',()=>{const a=actorsOf(menu(CABINET));for(const w of ['iris','sensa','auda','poet','whiz'])assert(!a.includes(w));});
check('two co-located robots are both listed (HOME in Central Chamber: Sensa and Poet), table order',()=>{assert.deepStrictEqual(actorsOf(menu(HOME)),['sensa','poet']);});
check('linked robot global G114 orders first, still lists all',()=>{setGlobal(114,POET);assert.deepStrictEqual(actorsOf(menu(HOME)),['poet','sensa']);});
check('G114 outside the domain (People) changes nothing',()=>{setGlobal(114,PEOPLE);assert.deepStrictEqual(actorsOf(menu(HOME)),['sensa','poet']);});
check('room is never inferred from the linked robot alone: linked Waldo, groove elsewhere -> none',()=>{setGlobal(114,WALDO);assert.deepStrictEqual(actorsOf(menu(GROOVE)),[]);});
check('live parent chain: moving Whiz into the groove room offers Whiz',()=>{setParent(WHIZ,R.objectLinks(mem,GROOVE).parent);assert.deepStrictEqual(actorsOf(menu(GROOVE)),['whiz']);assert(addressed(menu(GROOVE)).some(x=>x.command==='whiz, examine groove'));});
check('object held by another robot is not offered (animate possession)',()=>{setParent(CABINET,SENSA);setParent(SENSA,GAMMA);assert.deepStrictEqual(actorsOf(menu(CABINET)),[]);});
check('robots and People are never addressed as objects',()=>{for(const id of [WALDO,PEOPLE])assert.deepStrictEqual(actorsOf(menu(id)),[]);});
check('inventory context unchanged (no addressed forms)',()=>{assert.equal(addressed(menu(CABINET,'inventory')).length,0);});
check('stems (give/put/talk) never addressed',()=>{for(const id of [CABINET,BLT,HOME])assert(!addressed(menu(id)).some(x=>/\s$/.test(x.command)));});
check('table drift: G183 moved -> absent',()=>{setGlobal(183,8184);assert.equal(addressed(menu(CABINET)).length,0);});
check('table drift: entry changed -> absent',()=>{mem.setUint16(8182+2,PEOPLE);assert.equal(addressed(menu(CABINET)).length,0);});
const bad=[null,vmJSON.parse('[]'),'x',vmJSON.parse('{}'),asg(good(),{robots:[158,155,152,149,146,144,140]}),asg(good(),{robots:[155,158,152,149,146,144]}),asg(good(),{robots:[158,158,152,149,146,144]}),asg(good(),{form:'<command>'}),asg(good(),{nameTable:{global:183,address:8183}}),asg(good(),{nameTable:{global:183}}),asg(good(),{linkedGlobal:'114'}),asg(good(),{roomsHolder:0}),asg(good(),{extra:1}),(()=>{const g=good();delete g.roomsHolder;return g;})(),vmObject.assign(vmObject.create(vmJSON.parse('{"inherited":1}')),good()),asg(good(),{robots:[158,155,152,149,146,'144']})];
for(const v of bad)check('malformed fact is absent '+JSON.stringify(v),()=>withFact(v,()=>{assert.equal(addressed(menu(CABINET)).length,0);assert.equal(S.actorAddressingDomain(mem),null);}));
check('a prefix of the table (subset of robots) is still exact and valid',()=>withFact(asg(good(),{robots:[158,155]}),()=>assert.deepStrictEqual(actorsOf(menu(CABINET)),['waldo'])));
check('wrong supplied header digest rejects',()=>{const old=mem.getUint8(2);try{mem.setUint8(2,old^1);assert.equal(addressed(menu(CABINET)).length,0);}finally{mem.setUint8(2,old);}});
check('unknown family rejects',()=>{const d=c.GrammarProvider.decodeD198;try{c.GrammarProvider.decodeD198=()=>({classification:'unknown'});assert.equal(addressed(menu(CABINET)).length,0);}finally{c.GrammarProvider.decodeD198=d;}});
for(const p of ['Do you wish to quit? (Y is affirmative):','Do you wish to restart? (Y is affirmative):','FC: What do you want to examine?','WALDO: What do you want to take?','Which cabinet do you mean, the steel cabinet or the tool cabinet?','Would you like to restore a saved session?'])
  check('non-command prompt suppresses addressed forms: '+p,()=>{promptText=p;assert.equal(addressed(menu(CABINET)).length,0);const cmd=(promptText=null,addressed(menu(CABINET))[0]);promptText=p;assert.equal(S.addressedCommandCurrent(cmd),false);});
check('ordinary story line keeps addressed forms and tap re-validation passes',()=>{promptText='FC: Cryolink established to Waldo.';const l=addressed(menu(CABINET));assert(l.length);assert.equal(S.addressedCommandCurrent(l[0]),true);});
check('tap re-validation fails after the robot leaves',()=>{const cmd=addressed(menu(CABINET))[0];setParent(WALDO,CENTRAL);assert.equal(S.addressedCommandCurrent(cmd),false);});
check('tap re-validation fails on a tampered command',()=>{const cmd=Object.assign({},addressed(menu(CABINET))[0]);cmd.command='iris, examine cabinet';assert.equal(S.addressedCommandCurrent(cmd),false);});
// Other titles unchanged: no other fact carries actorAddressing; synthesis on another ZIL title is identical with or without the new code path.
check('no other title has actorAddressing',()=>{const others=Object.keys(c.ModuleStatFactsClaude).filter(k=>k!==digest&&c.ModuleStatFactsClaude[k]&&c.ModuleStatFactsClaude[k].actorAddressing);assert.deepStrictEqual(others,[]);});
for(const [file,dg] of [['TheWitness.z3.js','2290bb3440ac66e14d54d41dbde575066ebdbdc42138ec899496e359bc484824'],['Zork1-TheGreatUndergroundEmpire.z3.js',null],['Planetfall.z3.js',null]]){
  check('other title '+file+' gets no addressed forms',()=>{let b2;try{b2=Uint8Array.from(story(file));}catch(e){console.log('  (skip: '+file+' not found)');return;}
    const m2=new DataView(b2.buffer);curMem=m2;curBytes=b2;curDigest=dg||'other';try{assert.equal(S.actorAddressingDomain(m2),null);let n=0;for(let id=1;id<=Math.min(R.objectCount(m2),250);id++){const raw=R.objectLinks(m2,id);const o={id,name:String(R.shortName(m2,id)||'x').toLowerCase()||'x',parentId:raw.parent,attrs:A.applyTo({},raw,m2)};payload={inventory:[],discoveredObjects:[o]};n+=S.commandsForObject(o,'room').filter(x=>x.actorAddressing).length;}assert.equal(n,0);}finally{curMem=mem;curBytes=bytes;curDigest=digest;}});
}
console.log(checks+' actor-addressing controls passed');
