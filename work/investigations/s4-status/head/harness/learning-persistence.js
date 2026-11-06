// Constructed lifecycle/authority checks; native lamp proof is a separate artifact.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const ROOT = path.join(__dirname, '..');
const A = 'a'.repeat(64), B = 'b'.repeat(64);
let passes = 0;
function check(value, message) { assert.ok(value, message); passes++; }
function env(storage = new Map()) {
    const mem = new Uint8Array(128); mem[0] = 5; mem[2] = 1;
    let digest = A;
    const c = { console, setTimeout, clearTimeout, Uint8Array, Promise, Date, Math, JSON,
        localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k,v) => storage.set(k,String(v)), removeItem: k => storage.delete(k), key: i => [...storage.keys()][i], get length() { return storage.size; } },
        navigator: { locks: { request: (name, fn) => Promise.resolve().then(fn) } },
        ModuleLibrary: { currentExecutableIdentity: () => ({ digest, format:'z5', header:Array.from(mem.slice(0,64)) }), currentExecutableDigest: () => digest, normalizePath: p => p },
        ParchLock: { StoryPath:'games/test.z5.js', GameFilename:'test.z5.js' },
        UndoRestoreSync:{ generation:0 }, AttributeSchema:{ _getMem:() => mem },
        WorldModel:{ lastPayload:{ inventory:[{ id:135, name:'lamp' },{ id:136,name:'key' }], discoveredObjects:[] } },
        ZRamReader:{ u8:(m,i) => m[i], gameIdentityKey:() => '1-000001', objectLinks:() => ({parent:20}) }
    };
    c.window=c; vm.createContext(c);
    for (const file of ['LearningStores','AttrCalibrator','Actionable','ActionSynth','Qol']) vm.runInContext(fs.readFileSync(path.join(ROOT,'js',file+'.js'),'utf8'),c,{ filename:file });
    c.Actionable.payloadPool=() => c.WorldModel.lastPayload.inventory;
    c.Actionable.referenceFor=o => ({unique:true,verified:true,noun:o.name});
    c.Actionable.isGameWord=() => true;
    c.ActionSynth.authoredCommandAllowed=() => true;
    c.ActionSynth.heldContainerName=() => null;
    c.Actionable.usageCount=(command) => command==='examine lamp' ? 100 : 0;
    c.Actionable.usageBonus=() => 0;
    c.LearnedWords={ suppressed:() => false, candidates:() => [] };
    return {c,mem,storage,setDigest:d => {digest=d;}};
}
function observation(c, n, form='light', overrides={}) {
    return Object.assign({rememberedOnly:true, responseObserved:true, exactForm:form, verb:form,
        objectId:135, d198Correlation:{objectId:135,referenceVerified:true}, digest:A, generation:0,
        pageEpoch:'page1',submissionId:n},overrides);
}
(async function () {
    const e=env(), c=e.c;
    c.AttrCalibrator.record(observation(c,1));
    check(c.AttrCalibrator.rememberedFormsFor(135).length===0,'one response does not qualify');
    c.AttrCalibrator.record(observation(c,1));
    check(c.AttrCalibrator.table.objects[135].rememberedForms.light.observations===1,'duplicate submission cannot train twice');
    c.AttrCalibrator.record(observation(c,2));
    await c.LearningStores._drain(); await new Promise(r=>setTimeout(r,0));
    check(c.AttrCalibrator.rememberedFormsFor(135).includes('light'),'second distinct response qualifies remembered preference');
    check(!c.AttrCalibrator.table.objects[135].allowedVerbs && !Object.keys(c.AttrCalibrator.table.verbs).length,'preference does not manufacture semantic capability or bits');
    const command={objectId:135,verb:'light',command:'light lamp'};
    command.learnedItemScope=c.Actionable.learnedItemScopeFor(command,'inventory');
    const rows=[{Command:'examine lamp',Prior:50},{Command:'light lamp',Prior:1,LearnedCommand:command},{Command:'drop lamp',Prior:10}];
    let ranked=c.ParchLockQol.RankRadialCommands(rows,{source:'text',objectId:135});
    check(ranked[0].Command==='light lamp','learned0 outranks unrelated usage100');
    check(!ranked.some(r=>r._usageLeader),'lower tier cannot receive usage leader crown');
    check(ranked[1].Command==='examine lamp' && ranked[2].Command==='drop lamp','unlearned relative usage order retained');
    ranked=c.ParchLockQol.RankRadialCommands(rows,{source:'input'});
    check(ranked[0].Command==='examine lamp','input radial gets no item preference priority');
    ranked=c.ParchLockQol.RankRadialCommands(rows,{source:'text',objectId:136});
    check(ranked[0].Command==='examine lamp','same action metadata cannot promote another item');
    c.UndoRestoreSync.generation++;
    check(!c.Actionable.learnedItemScopeCurrent(command,'inventory'),'old generation marker invalidated');
    check(c.AttrCalibrator.rememberedFormsFor(135).includes('light'),'restore generation retains durable knowledge');
    c.UndoRestoreSync.generation=0;
    c.LearnedWords.suppressed=()=>true;
    check(!c.AttrCalibrator.rememberedFormsFor(135).length,'ignored form stays hidden');
    c.LearnedWords.suppressed=()=>false;
    const reload=env(e.storage);
    check(reload.c.AttrCalibrator.rememberedFormsFor(135).includes('light'),'fresh page hydrates learned form without game save');
    reload.setDigest(B);
    check(!reload.c.AttrCalibrator.rememberedFormsFor(135).length,'same legacy header different executable does not inherit learned form');
    for (const bad of [{rejected:true},{ambiguous:true},{generation:9},{digest:B},{responseObserved:false}]) {
        c.AttrCalibrator.record(observation(c,20,'douse',bad));
    }
    check(!c.AttrCalibrator.table.objects[135].rememberedForms.douse,'invalid observations never teach');
    const prepare=c.AttrCalibrator.analyzers.verbSuccess.prepare;
    c.AttrCalibrator._verbRegex=/^(take)\s+(.+)$/i;
    c.AttrCalibrator._splitAnyVerbNoun=()=>({verb:'douse',noun:'lamp',objectId:135});
    c.AttrCalibrator._d198ScopedCorrelation=()=>({objectId:135,referenceVerified:true});
    c.LearnedWords.candidateForCommand=()=>null;
    check(!prepare({source:'inject',command:'douse lamp'}),'unknown mixed injection is excluded');
    check(!prepare({source:'system-navigation',command:'douse lamp'}),'navigation automation is excluded');
    check(!prepare({source:'stat-probe',command:'douse lamp'}),'hidden probes are excluded');
    const turn={source:'typed',command:'douse lamp',pageEpoch:'test',submissionId:30,analyzerSnapshots:{'diag-verbSuccess':'You extinguish the lamp.'}};
    check(!!prepare(turn) && turn.__diagVerbSuccessCtx.rememberedOnly,'explicit user dictionary form admitted into preference lane');
    turn.analyzerSnapshots['diag-verbSuccess']='What do you want to douse?';
    c.AttrCalibrator.analyzers.verbSuccess.analyze(turn);
    check(!c.AttrCalibrator.table.objects[135].rememberedForms.douse,'clarification prompt cannot qualify');
    turn.analyzerSnapshots['diag-verbSuccess']='>douse lamp\n>\n ';
    c.AttrCalibrator.analyzers.verbSuccess.analyze(turn);
    check(!c.AttrCalibrator.table.objects[135].rememberedForms.douse,'echo plus bare prompt is not a response');
    c.ActionSynth.inspectVerbDisabled=()=>true; c.ActionSynth.defaultInspectVerb=()=> 'light';
    check(!c.Actionable.learnedItemScopeFor(command,'inventory'),'disabled inspection keeps stored preference but cannot receive priority');
    c.ActionSynth.inspectVerbDisabled=()=>false;
    c.AttrCalibrator.table.verbBehavior={disabled:{examine:{confirmed:true}},substituteVerb:'look at'};
    c.ActionSynth.defaultInspectVerb=()=> 'look at';
    check(!c.ActionSynth.learnedFormAllowed(135,'examine','inventory'),'disabled prior inspect cannot return after another default is learned');
    c.LearnedWords.inspectSuppressed=()=>true;
    check(c.ActionSynth.learnedFormAllowed(135,'examine','inventory'),'existing explicit Ignore of inspect decision retains its authority');
    delete c.AttrCalibrator.table.verbBehavior;
    const old=JSON.stringify({version:2,verbs:{},objects:{135:{exactForms:{rub:{confirmations:2}}}}});
    const legacy=env();
    await legacy.c.LearningStores.persist('attrCalib',{identityKey:'1-000001'},old);
    const fresh=legacy.c.LearningStores.readOwned('attrCalib',legacy.c.LearningStores.identity(legacy.mem));
    check(fresh.status==='ready' && fresh.value===null,'development format does not import old header-keyed data');
    check(legacy.storage.get('PL_AttrCalib_1-000001')===old,'old development bytes remain untouched');
    legacy.c.AttrCalibrator.table={version:2,verbs:{},objects:{999:{exactForms:{rub:{confirmations:2}}}}};
    legacy.c.AttrCalibrator.hydratedForGame='foreign';
    legacy.c.AttrCalibrator.hydrate(legacy.mem);
    check(!legacy.c.AttrCalibrator.table.objects[999],'new identity cannot consume prior module table');
    const diag=env(), dc=diag.c;
    vm.runInContext(fs.readFileSync(path.join(ROOT,'js/ZRamReader.js'),'utf8'),dc);
    dc.ZRamReader.labelCompassProfile=()=>null;
    await dc.LearningStores.persist('diagonalCalib',{identityKey:'sha256:'+A},JSON.stringify({swapped:true}));
    check(dc.ZRamReader.directionLabelForProp(12,diag.mem)==='southeast','first direction consumer hydrates learned diagonal');
    diag.setDigest(B);
    check(dc.ZRamReader.directionLabelForProp(12,diag.mem)==='exit-12' && !dc.ZRamReader.directionProps.diagonalCalibrated,'new module with no calibration resets prior compass evidence');
    const barrier=env(), bc=barrier.c;
    let release; const gate=new Promise(r=>{release=r;});
    bc.navigator.locks.request=(name,fn)=>gate.then(fn);
    bc.LearningStores.persist('attrCalib',{identityKey:'sha256:'+A},old);
    check(!(await bc.LearningStores.flush(5)).ok,'exit barrier does not report an active queued write durable');
    release();
    check((await bc.LearningStores.flush(200)).ok && barrier.storage.has('PL_AttrCalib_sha256:'+A),'exit barrier waits active drain acknowledgement');
    const quota=env(); quota.c.navigator={};
    quota.c.localStorage.setItem=()=>{throw new Error('quota');};
    quota.c.LearningStores.persist('attrCalib',{identityKey:'sha256:'+A},old);
    check(!(await quota.c.LearningStores.flush(100)).ok,'zero queue with a quota error still refuses acknowledged exit');
    const tr=env(), tc=tr.c;
    vm.runInContext(fs.readFileSync(path.join(ROOT,'js/TurnRecorder.js'),'utf8'),tc);
    tc.TurnRecorder._lineCount=()=>0;
    tc.UndoRestoreSync.noteCommand=()=>{};
    let analyzed=0;
    tc.TurnRecorder.registerAnalyzer({id:'test',prepare:()=>({hasWitness:()=>true}),analyze:()=>{analyzed++;}});
    tc.TurnRecorder.onAcceptedSubmit('first','typed'); tc.TurnRecorder.onAcceptedSubmit('second','typed');
    check(tc.TurnRecorder._unsettled.length===2,'recorder tracks boundary-stamped and active timers');
    check(!await tc.TurnRecorder.whenSettled(5),'navigation does not settle a response prematurely');
    check(await tc.TurnRecorder.whenSettled(800) && analyzed===2,'navigation waits both pending observations exactly once');
    const tracked=env(), lc=tracked.c;
    lc.ModuleLibrary.all=()=>[{Path:'games/test.z5.js'}];
    lc.AttrCalibrator.record(observation(lc,1)); lc.AttrCalibrator.record(observation(lc,2));
    await lc.LearningStores.flush(200);
    let listing=lc.LearningStores.list();
    check(listing.ok && listing.installed===1 && listing.removable===0 && listing.unmanaged===0,'existing settings tracker owns remembered forms and protects installed module');
    tracked.storage.set('PL_Map_test','map'); tracked.storage.set('PL_SaveState_test','save'); tracked.storage.set('PL_Transcript_test','transcript');
    lc.ModuleLibrary.all=()=>[]; tracked.setDigest(B); lc.ParchLock.StoryPath='games/other.z5.js';
    listing=lc.LearningStores.list();
    check(listing.removable===1 && listing.candidates[0].kind==='attrCalib','existing erase control recognises new forms after module uninstalled');
    const removed=await lc.LearningStores.erase(listing);
    check(!removed.aborted && removed.removed===1 && !tracked.storage.has('PL_AttrCalib_sha256:'+A),'existing erase path removes remembered forms without a second database');
    check(tracked.storage.get('PL_Map_test')==='map' && tracked.storage.get('PL_SaveState_test')==='save' && tracked.storage.get('PL_Transcript_test')==='transcript','learning erase preserves maps saves and transcripts');
    const systems=env(), sc=systems.c;
    sc.ZRamProvider={getMem:()=>systems.mem};
    sc.ZRamReader.learningIdentityKey=()=>sc.LearningStores.identity(systems.mem).identityKey;
    for(const file of ['StatTracker','ExitCalibrator','LearnedWords']) vm.runInContext(fs.readFileSync(path.join(ROOT,'js',file+'.js'),'utf8'),sc);
    const stats=sc.StatTracker.blank();stats.globals.score=5;stats.properties.health=7;
    stats.carry.weight={prop:17,candidates:[17],unit:'kg'};stats.stats.score={value:123,confirmed:true,unit:'points',source:'ram'};
    sc.StatTracker.save('sha256:'+A,stats);
    sc.ExitCalibrator._key='PM_ExitCalib_sha256:'+A;sc.ExitCalibrator._table=sc.ExitCalibrator.emptyTable();sc.ExitCalibrator._table.dirs.east={prop:12,mode:'word'};sc.ExitCalibrator.persist();
    sc.LearnedWords.refreshLabels=()=>{};
    sc.LearnedWords.commit({id:'name:135',type:'name',trigger:'lamp'},'lamp','My lamp',false,135);
    sc.AttrCalibrator.record(observation(sc,1));sc.AttrCalibrator.record(observation(sc,2));
    sc.LearnedWords.commit({id:'exact:135:light',type:'exact',editable:true,original:'light',trigger:'light'},'light','Light',true,135);
    await sc.LearningStores.flush(200);
    const freshSystems=env(systems.storage), fc=freshSystems.c;
    fc.ZRamProvider={getMem:()=>freshSystems.mem};fc.ZRamReader.learningIdentityKey=()=>fc.LearningStores.identity(freshSystems.mem).identityKey;
    for(const file of ['StatTracker','ExitCalibrator','LearnedWords']) vm.runInContext(fs.readFileSync(path.join(ROOT,'js',file+'.js'),'utf8'),fc);
    const loadedStats=fc.StatTracker.load('sha256:'+A);
    check(loadedStats.globals.score===5 && loadedStats.properties.health===7 && loadedStats.carry.weight.prop===17,'fresh session retains learned stat and carry mappings');
    check(!loadedStats.stats.score.confirmed && loadedStats.carry.weight.unit==='kg','fresh session preserves learned units while invalidating stale readings');
    check(fc.ExitCalibrator.hydrate(freshSystems.mem).dirs.east.prop===12,'fresh session hydrates learned exit layout');
    check(fc.LearnedWords.label('name',135,'lamp')==='My lamp','fresh session retains existing learned-word name override');
    check(!fc.AttrCalibrator.rememberedFormsFor(135).includes('light'),'existing learned-word Ignore remains authoritative after reopen');
    const untouched=env(), uc=untouched.c;
    vm.runInContext(fs.readFileSync(path.join(ROOT,'js/LearnedWords.js'),'utf8'),uc);
    let scopeReads=0;const oldPool=uc.Actionable.payloadPool,oldRef=uc.Actionable.referenceFor;
    uc.Actionable.payloadPool=()=>{scopeReads++;return oldPool();};uc.Actionable.referenceFor=o=>{scopeReads++;return oldRef(o);};
    const drop={objectId:135,verb:'drop',command:'drop lamp'};
    check(!uc.Actionable.learnedItemScopeFor(drop,'inventory') && scopeReads===0,'never-learned item/action does not touch presentation scope or reference caches');
    uc.LearnedWords.load().rows['manual:135:rub']={objectId:'135',trigger:'rub',original:'rub',label:'Rub',revision:'r1',ignored:false,witnesses:[]};
    scopeReads=0;
    check(!uc.Actionable.learnedItemScopeFor(drop,'inventory') && scopeReads===0,'unrelated authored form on same item does not trigger scope reads');
    const authored=uc.Actionable.learnedItemScopeFor({objectId:135,verb:'rub',command:'rub lamp'},'inventory');
    check(authored && authored.revision==='r1' && scopeReads>0,'matching authored form still receives full live scope validation');
    console.log('Learning persistence:',passes,'PASS, 0 FAIL');
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
