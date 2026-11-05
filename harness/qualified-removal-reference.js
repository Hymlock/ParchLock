// A1 qualified REMOVE consumer contract. Constructed controls on real Suspect RAM;
// no native parser-success claim. Run from repository root. Baseline surface parity
// is a separate integration gate; this file does not claim native or catalog coverage.
'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
let checks=0;const failures=[];function check(name,fn){if(process.argv.includes('--more-only')&&!name.startsWith('More:'))return;try{fn();checks++;console.log('PASS '+name);}catch(e){failures.push({name,error:e.stack});console.error('FAIL '+name+': '+e.message);}}
const fixture=fs.readFileSync('harness/zil-light-forms.js','utf8').split('const LIGHT=')[0];
assert(fixture.includes('function load(file)'),'loader boundary');
function loader(root){return new Function('require','process',fixture.replace("const root=process.env.LIGHT_SOURCE_ROOT||'.';",'const root='+JSON.stringify(root)+';')+'\nreturn load;')(require,process);}
const load=loader(process.cwd()),T=load('Suspect.z3.js'),S=T.S,c=T.c;
assert.equal(typeof S.qualifiedRemovalPolicyFor,'function','runtime API must be implemented before running this harness');
const clone=x=>JSON.parse(JSON.stringify(x));
const spec=()=>vm.runInContext('({objects:[38],verb:"remove",scope:"worn-direct",nouns:{"38":"western mask"}})',c);
const originalSpec=T.F.removalReferences;assert(originalSpec,'production fact declaration required');
function reset(){T.names[38]='mask';T.F.removalReferences=spec();T.parent(38,T.player);T.bit(38,5,1);T.payload.inventory=[T.obj(38)];T.payload.discoveredObjects=[];c.UndoRestoreSync.generation=7;}
function object(){return T.payload.inventory[0];}
function policy(){return S.qualifiedRemovalPolicyFor(object());}
function row(extra){return Object.assign({verb:'remove',noun:'mask',objectId:38,command:'remove mask',confidence:.8},extra);}
function normalized(extra){return S.normalizeQualifiedRemovalCandidate(row(extra),object());}
function withValue(o,k,v,fn){const own=Object.prototype.hasOwnProperty.call(o,k),old=o[k];o[k]=v;try{fn();}finally{if(own)o[k]=old;else delete o[k];}}
function scoped(){const p=policy();assert.equal(p.status,'scoped');return p.scope;}
reset();
check('exact live owner scope and current command',()=>{const p=scoped();assert.deepStrictEqual(clone(p),{kind:'qualified-worn-remove',digest:T.digest,id:38,generation:7,verb:'remove',noun:'western mask',command:'remove western mask'});const r=normalized();assert.equal(r.command,p.command);assert(r.qualifiedRemovalScope);assert(S.qualifiedRemovalCommandCurrent(r));assert(c.Actionable.radialCommandCurrent(r));});
check('BUILD copy preserves edit-only/provenance; original remains unchanged',()=>{const r=row({Enter:false,enter:false,source:'manual',revision:11,customPriority:4}),before=clone(r),n=S.normalizeQualifiedRemovalCandidate(r,object());assert.notStrictEqual(n,r);assert.deepStrictEqual(clone(r),before);for(const k of ['Enter','enter','source','revision','customPriority'])assert.strictEqual(n[k],r[k]);});
check('unknown ownership passes same DTO without guessing noun-key ownership',()=>{for(const value of [null,{}, {objects:['38'],nouns:{38:'western mask'}},{objects:[],nouns:{38:'western mask'}}]){T.F.removalReferences=value;const r=row();assert.equal(policy().status,'unowned');assert.strictEqual(S.normalizeQualifiedRemovalCandidate(r,object()),r);}reset();});
const invalid=[
 ['duplicate owners','({objects:[38,38],verb:"remove",scope:"worn-direct",nouns:{38:"western mask"}})'],
 ['extra declaration key','({objects:[38],verb:"remove",scope:"worn-direct",nouns:{38:"western mask"},extra:true})'],
 ['wrong verb','({objects:[38],verb:"drop",scope:"worn-direct",nouns:{38:"western mask"}})'],
 ['wrong scope','({objects:[38],verb:"remove",scope:"held-direct",nouns:{38:"western mask"}})'],
 ['missing noun','({objects:[38],verb:"remove",scope:"worn-direct",nouns:{}})'],
 ['extra noun','({objects:[38],verb:"remove",scope:"worn-direct",nouns:{38:"western mask",84:"fairy mask"}})'],
 ['noncanonical noun key','({objects:[38],verb:"remove",scope:"worn-direct",nouns:{"038":"western mask"}})'],
 ['bad noun separator','({objects:[38],verb:"remove",scope:"worn-direct",nouns:{38:"western mask;drop all"}})'],
 ['upper-case noun','({objects:[38],verb:"remove",scope:"worn-direct",nouns:{38:"Western mask"}})'],
 ['frontier overflow on another owner','({objects:[38,99999],verb:"remove",scope:"worn-direct",nouns:{38:"western mask",99999:"mask"}})'],
 ['inherited noun','({objects:[38],verb:"remove",scope:"worn-direct",nouns:Object.create({38:"western mask"})})']
];
for(const [label,expression]of invalid)check('recognizable invalid '+label+' suppresses Remove only',()=>{reset();T.F.removalReferences=vm.runInContext(expression,c);assert.equal(policy().status,'blocked');assert.equal(normalized(),null);const other=row({verb:'examine',command:'examine mask'});assert.strictEqual(S.normalizeQualifiedRemovalCandidate(other,object()),other);reset();});
check('plain null-prototype record remains valid',()=>{reset();T.F.removalReferences=vm.runInContext('Object.assign(Object.create(null),{objects:[38],verb:"remove",scope:"worn-direct",nouns:{38:"western mask"}})',c);assert.equal(policy().status,'scoped');reset();});
check('missing declaration is cheap UNOWNED before memory/payload/reference',()=>{delete T.F.removalReferences;let calls=0;const fail=()=>{calls++;throw Error('must not touch');};withValue(c.ZRamProvider,'getMem',fail,()=>withValue(c.Actionable,'payloadPool',fail,()=>withValue(c.Actionable,'referenceFor',fail,()=>{const r=row();assert.equal(S.qualifiedRemovalPolicyFor({id:38}).status,'unowned');assert.strictEqual(S.normalizeQualifiedRemovalCandidate(r,{id:38}),r);assert.equal(calls,0);})));reset();});
for(const [label,mutate]of [
 ['not worn',()=>T.bit(38,5,0)],['ground',()=>T.parent(38,T.room)],['nested',()=>{T.parent(93,T.player);T.parent(38,93);}],
 ['duplicate inventory',()=>T.payload.inventory.push(Object.assign({},object()))],['conflicting discovered copy',()=>T.payload.discoveredObjects.push(Object.assign({},object(),{parentId:84}))],
 ['examineOnly',()=>object().examineOnly=true],['noncanonical id',()=>object().id='38'],['missing inventory',()=>T.payload.inventory=[]]
])check('live eligibility blocks '+label,()=>{reset();const old=normalized();mutate();assert(!S.qualifiedRemovalCommandCurrent(old));assert.equal(S.qualifiedRemovalPolicyFor({id:38}).status,'blocked');reset();});
check('identical nonauthoritative discovered copy is allowed',()=>{reset();T.payload.discoveredObjects=[Object.assign({},object())];assert.equal(policy().status,'scoped');reset();});
check('unresolved player and malformed worn fact block known owner',()=>{reset();withValue(T.R,'resolvePlayer',()=>({id:0}),()=>assert.equal(policy().status,'blocked'));withValue(T.F,'wornAttribute',48,()=>assert.equal(policy().status,'blocked'));});
check('unverified/ambiguous generic reference blocks qualified owner',()=>{for(const ref of [{unique:false,verified:true,noun:'mask'},{unique:true,verified:false,noun:'mask'}])withValue(c.Actionable,'referenceFor',()=>ref,()=>assert.equal(policy().status,'blocked'));});
check('missing bare REMOVE grammar blocks owner',()=>{const G=c.GrammarProvider,decode=G.decodeD198;withValue(G,'decodeD198',m=>{const d=decode(m);d.templates=d.templates.filter(t=>t.verb!=='remove');return d;},()=>assert.equal(policy().status,'blocked'));});
check('invalid dictionary noun blocks owner',()=>{withValue(T.R,'hasDictionaryWord',()=>false,()=>assert.equal(policy().status,'blocked'));});
check('captured scope rejects generation/schema/digest drift without rebasing',()=>{reset();const r=normalized();c.UndoRestoreSync.generation++;assert(!S.qualifiedRemovalCommandCurrent(r));c.UndoRestoreSync.generation--;T.F.removalReferences.nouns[38]='mask';assert(!S.qualifiedRemovalCommandCurrent(r));reset();withValue(c.ModuleLibrary,'currentExecutableDigest',()=> '0'.repeat(64),()=>assert(!S.qualifiedRemovalCommandCurrent(r)));assert(S.qualifiedRemovalCommandCurrent(r));});
check('scope and outer-field tampering rejects at tap',()=>{reset();const r=normalized();for(const change of [{verb:'drop'},{objectId:84},{command:'remove mask'},{sharedMembers:[r]},{actorAddressing:{actor:1}},{identityWearScope:{}}])assert(!S.qualifiedRemovalCommandCurrent(Object.assign({},r,change)),JSON.stringify(change));for(const key of Object.keys(r.qualifiedRemovalScope)){const x=clone(r);x.qualifiedRemovalScope[key]='tampered';assert(!S.qualifiedRemovalCommandCurrent(x),key);}assert(!S.qualifiedRemovalCommandCurrent(row()));});
check('unary scope cannot absorb target/topic/shared/actor variants',()=>{for(const extra of [{targetObjectId:84},{topicObjectId:84},{arity:2},{objectIds:[38,84]},{sharedMembers:[row()]},{actorAddressing:{actor:1}},{wornRemovalScope:{}},{identityWearScope:{}},{lightFormScope:{}}])assert.equal(normalized(extra),null,JSON.stringify(extra));});
for(const [label,get]of [['inventory',()=>S.commandsForObject(object(),'inventory')],['room-presentation',()=>S.commandsForObject(object(),'room')],['semantic',()=>c.SemanticActions.resolveForPayloadObjectId(38,'inventory')]])check(label+' preserves exact qualified noun',()=>{reset();const list=get(),r=list.find(x=>x.verb==='remove');assert(r&&r.qualifiedRemovalScope,JSON.stringify(clone(list)));assert.equal(r.command,'remove western mask');});
check('Yourself preserves exact command and Remove label',()=>{reset();const r=c.EquipmentUI.yourselfCommands(object(),{}).find(x=>x.Form==='remove');assert(r&&r.ScopedCommand&&r.ScopedCommand.qualifiedRemovalScope);assert.equal(r.Label,'Remove');assert.equal(r.ScopedCommand.command,'remove western mask');});
check('invalid known-owner declaration leaves held-unworn Wear and Drop unchanged',()=>{reset();T.bit(38,5,0);T.payload.inventory=[T.obj(38)];const before=clone(S.commandsForObject(object(),'inventory'));T.F.removalReferences.verb='drop';assert.deepStrictEqual(clone(S.commandsForObject(object(),'inventory')),before);assert(before.some(r=>r.verb==='wear'));assert(before.some(r=>r.verb==='drop'));reset();});
check('known invalid Remove cannot reappear via learned providers; other owner unchanged',()=>{reset();const original=c.AttrCalibrator.learnedFormsFor;withValue(c.AttrCalibrator,'learnedFormsFor',()=>['remove'],()=>{T.F.removalReferences.verb='drop';for(const list of [S.commandsForObject(object(),'inventory'),c.SemanticActions.resolveForPayloadObjectId(38,'inventory')])assert(!list.some(x=>x.verb==='remove'));assert(!c.EquipmentUI.yourselfCommands(object(),{}).some(x=>x.Form==='remove'));});reset();});
check('other Suspect owner is byte-identical and cheap unowned',()=>{const o={id:93},r={verb:'remove',objectId:93,command:'remove coat'},before=clone(r);assert.equal(S.qualifiedRemovalPolicyFor(o).status,'unowned');assert.strictEqual(S.normalizeQualifiedRemovalCandidate(r,o),r);assert.deepStrictEqual(clone(r),before);});
check('all 25 other declared exact facts plus Inform/Glulx identities return same DTO without RAM/payload work',()=>{const sheet=JSON.parse(fs.readFileSync('work/mapping-research/items-codex/resume-20261020/nov4-lead/current-zil-consumer-sheet.json'));const keys=sheet.rows.filter(r=>r.game!=='Suspect.z3.js').map(r=>r.digest);assert.equal(keys.length,25);for(const digest of keys.concat(['inform-unsupported','glulx-unsupported'])){let calls=0;const fail=()=>{calls++;throw Error('unexpected owner work');};withValue(c.ModuleLibrary,'currentExecutableDigest',()=>digest,()=>withValue(c.ZRamProvider,'getMem',fail,()=>withValue(c.Actionable,'payloadPool',fail,()=>withValue(c.Actionable,'referenceFor',fail,()=>{const o={id:38},r=row();assert.equal(S.qualifiedRemovalPolicyFor(o).status,'unowned');assert.strictEqual(S.normalizeQualifiedRemovalCandidate(r,o),r);assert.equal(calls,0);}))))}});
check('D263 marker derives qualified noun only for an actual learned pair and rejects stale/tampered scope',()=>{
 reset();const text=fs.readFileSync('js/Actionable.js','utf8');
 for(const name of ['learnedItemScopeFor','learnedItemScopeCurrent']){const k=text.indexOf(name+': function');assert(k>=0,name);let start=text.indexOf('{',k),depth=0,end=start;for(;end<text.length;end++){if(text[end]==='{')depth++;else if(text[end]==='}'&&--depth===0)break;}c.Actionable[name]=vm.runInContext('(function'+text.slice(text.indexOf('(',k),end+1)+')',c);}
 c.AttrCalibrator._d198ExecutableDigest=()=>T.digest;
 const r=normalized();withValue(c.AttrCalibrator,'learnedFormsFor',()=>[],()=>assert.equal(c.Actionable.learnedItemScopeFor(r,'inventory'),null));
 withValue(c.AttrCalibrator,'learnedFormsFor',()=>['remove'],()=>{const marker=c.Actionable.learnedItemScopeFor(r,'inventory');assert(marker,'learned qualified remove marker');assert.equal(marker.noun,'western mask');r.learnedItemScope=marker;assert(c.Actionable.learnedItemScopeCurrent(r,'inventory'));c.UndoRestoreSync.generation++;assert(!c.Actionable.learnedItemScopeCurrent(r,'inventory'));c.UndoRestoreSync.generation--;const bad=clone(r);bad.command='remove mask';assert.equal(c.Actionable.learnedItemScopeFor(bad,'inventory'),null);assert.equal(c.Actionable.learnedItemScopeFor(r,'room').context,'inventory');});
});
// Compare bounded UI consumer samples with an immutable pre-A1 source tree. Use the SAME
// current GrammarProvider on both sides to avoid attributing concurrent Z3 changes to A1.
check('25 exact non-Suspect ZIL UI sample surfaces remain baseline-equal',()=>{
 const manifest=JSON.parse(fs.readFileSync('work/mapping-research/items-codex/resume-20261020/roy-keyboard-20261104/final-shared-gate/manifest.json'));
 const baseRoot=process.env.QUALIFIED_REMOVAL_BASELINE_ROOT||manifest.cand;
 assert(fs.existsSync(baseRoot+'/js/ActionSynth.js'),'immutable baseline available');
 const sameGrammarFixture=fixture.replace("fs.readFileSync(root+'/js/'+f+'.js','utf8')","fs.readFileSync((f==='GrammarProvider'?process.cwd():root)+'/js/'+f+'.js','utf8')");
 const make=r=>new Function('require','process',sameGrammarFixture.replace("const root=process.env.LIGHT_SOURCE_ROOT||'.';",'const root='+JSON.stringify(r)+';')+'\nreturn load;')(require,process);
 const oldLoad=make(baseRoot),newLoad=make(process.cwd());
 const sheet=JSON.parse(fs.readFileSync('work/mapping-research/items-codex/resume-20261020/nov4-lead/current-zil-consumer-sheet.json'));
 for(const title of sheet.rows.filter(r=>r.game!=='Suspect.z3.js')){
   const old=oldLoad(title.game),now=newLoad(title.game);assert.equal(now.digest,title.digest);assert.equal(old.digest,title.digest);
   const ids=[];for(let id=2;id<=Math.min(now.count,600)&&ids.length<8;id++){try{if(now.R.shortName(now.mem,id))ids.push(id);}catch(e){}}
   const snapshots=E=>ids.map(id=>{const o=E.obj(id);E.payload.inventory=[o];E.payload.discoveredObjects=[];return {id,main:clone(E.S.commandsForObject(o,'inventory')),semantic:clone(E.c.SemanticActions.resolveForPayloadObjectId(id,'inventory')),yourself:clone(E.c.EquipmentUI.yourselfCommands(o,{}))};});
   assert.deepStrictEqual(snapshots(now),snapshots(old),title.game+' bounded8object consumer parity');
 }
});
// Actual More constructor; the radial shell is a capture stub, never a reimplementation.
function installMore(E,sourceRoot){const text=fs.readFileSync(path.join(sourceRoot,'js/Actionable.js'),'utf8');for(const name of ['addMoreActions','moreDictionaryVerbAllowed','learnedItemScopeFor','learnedItemScopeCurrent']){const k=text.indexOf(name+': function');assert(k>=0,name);let start=text.indexOf('{',k),depth=0,end=start;for(;end<text.length;end++){if(text[end]==='{')depth++;else if(text[end]==='}'&&--depth===0)break;}E.c.Actionable[name]=vm.runInContext('(function'+text.slice(text.indexOf('(',k),end+1)+')',E.c);}E.c.AttrCalibrator._d198ExecutableDigest=()=>E.digest;E.c.ParchLockQol={GetRadialCommands:()=>[{source:'ram-synth',Command:'remove'}],OpenRadial:(x,y,rows,ctx)=>{E.moreCaptured={rows,ctx};}};}
installMore(T,process.cwd());
function moreRows(E,primary,id){const list=primary||[];E.moreCaptured=null;E.c.Actionable.addMoreActions(list,{kind:'inventory',source:'inventory',objectId:id||38,noun:'mask'},10,20);const launch=list.find(x=>x.MoreSuggestions);if(launch)launch.Action();return E.moreCaptured?E.moreCaptured.rows:[];}
check('More: qualified primary deduplicates canonical suggestion',()=>{reset();assert.equal(moreRows(T,[{Label:'Remove',Command:'remove western mask'}]).length,0);});
check('More: absent primary captures exact scope; current dispatch and stale tap are distinct',()=>{reset();const rows=moreRows(T,[]);assert.equal(rows.length,1);const r=rows[0];assert.equal(r.Command,'remove western mask');assert.equal(r.Enter,false);assert(r.LearnedCommand.qualifiedRemovalScope);assert.equal(r.LearnedCommand.qualifiedRemovalScope.generation,7);const sent=[];withValue(c.Actionable,'runChosenCommand',cmd=>sent.push(cmd),()=>{r.Action();assert.deepStrictEqual(sent,['remove western mask']);c.UndoRestoreSync.generation++;r.Action();assert.deepStrictEqual(sent,['remove western mask']);c.UndoRestoreSync.generation--;T.bit(38,5,0);r.Action();assert.deepStrictEqual(sent,['remove western mask']);});reset();});
check('More: recognizable invalid owner emits no Remove',()=>{reset();T.F.removalReferences.verb='drop';assert.equal(moreRows(T,[]).length,0);reset();});
check('More: unowned owner suggestion DTO is baseline-identical',()=>{const manifest=JSON.parse(fs.readFileSync('work/mapping-research/items-codex/resume-20261020/roy-keyboard-20261104/final-shared-gate/manifest.json'));const old=loader(manifest.cand)('Suspect.z3.js');installMore(old,manifest.cand);reset();T.parent(93,T.player);T.payload.inventory=[T.obj(93)];old.parent(93,old.player);old.payload.inventory=[old.obj(93)];const current=moreRows(T,[],93),baseline=moreRows(old,[],93);assert.deepStrictEqual(clone(current),clone(baseline));assert(!current[0].LearnedCommand);reset();});
T.F.removalReferences=originalSpec;
console.log(checks+' qualified-removal constructed checks passed; '+failures.length+' failed; native rendered evidence and full baseline surface parity remain separate.');

if(failures.length){console.error(JSON.stringify({failures},null,2));process.exitCode=1;}
