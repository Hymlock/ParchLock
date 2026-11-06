/* Independent public-lifecycle regression. Not executed until author readiness signal.
 * Run from repo root: node <this file>. No production mutations.
 * Assumptions: outcomes()/recordOutcome() synchronize ready identity; onLifecycle restore
 * plus applyPending('restore_file') is the public authoritative restore path.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');
const crypto = require('crypto').webcrypto;
const root = process.argv[2] || process.cwd();
const source = fs.readFileSync(path.join(root, 'js/SaveState.js'), 'utf8');
const digestA = 'a'.repeat(64), digestB = 'b'.repeat(64);
let passed = 0;
function storage() {
  const data = new Map();
  let fault = () => false;
  return { data, failWhen(f) { fault = f; }, getItem(k) { return data.has(k) ? data.get(k) : null; },
    setItem(k,v) { if (fault(k,v)) { const e = new Error('independent injected quota'); e.name='QuotaExceededError'; throw e; } data.set(k,String(v)); },
    removeItem(k) { if(fault(k,null)) throw new Error('independent removal failure'); data.delete(k); },
    key(i) { return [...data.keys()][i] ?? null; }, get length() { return data.size; } };
}
function page(local, session, initialDigest=digestA, filename='games/independent.z5.js') {
  let digest = initialDigest;
  const warnings=[];
  const context = {
    console, crypto, Date, Math, JSON, Number, Object, Array, String, RegExp, Map, Set, WeakMap,
    localStorage:local, sessionStorage:session,
    location:{href:'https://independent.invalid/play.html?story='+encodeURIComponent(filename), search:'?story='+encodeURIComponent(filename)},
    URL, URLSearchParams, setTimeout, clearTimeout,
    ParchLock:{StoryPath:filename,GameFilename:filename,GameId:'native-short'},
    ModuleLibrary:{currentExecutableDigest:() => digest}, Transcript:{digest:initialDigest},
    Message:{Show:(...x)=>warnings.push(x)},
    ParchLockMap:{Rooms:[],Clear(){this.Rooms=[];},Save(){},Draw(){}},
    WorkspaceUI:{MapKey:()=> 'PL_MapSlots_'+filename,ValidateMap:d=>d},
    Actionable:{labelSnapshot:()=>({schema:1,labels:{}}),applyLabelSnapshot(){},clearLabelSnapshot(){}},
    module:{exports:{}},
  };
  context.window=context;
  vm.createContext(context);
  vm.runInContext(source,context,{filename:'SaveState.js'});
  const s=context.SaveState || context.module.exports;
  return {s,context,warnings,ready(d=digestA){digest=d;context.Transcript.digest=d;return s.outcomes();}};
}
function total(p, deaths, wins=0, label='totals') {
  const value=p.s.outcomes();
  assert.ok(value, label+': identity ready');
  assert.equal(value.deaths,deaths,label+': deaths');
  assert.equal(value.wins,wins,label+': wins');
  passed++;
}
function save(p,name) { p.s.onLifecycle('save',{name}); }
function restore(p,name) { p.s.onLifecycle('restore',{name}); p.s.applyPending('restore_file',1); }
function event(p,key,kind='death'){p.s.recordOutcome(kind,key);}

// Separate VM contexts simulate page reload, preserving only browser storage.
{
 const local=storage(),session=storage();let p=page(local,session);
 total(p,0);save(p,'A');event(p,'page1|death1');total(p,1);restore(p,'A');total(p,1,0,'old save preserves cumulative count');
 event(p,'page1|death1');total(p,1,0,'same event dedup');event(p,'page1|death2');event(p,'page1|win1','win');save(p,'B');
 p=page(local,session);total(p,2,1,'reopen');restore(p,'A');total(p,2,1,'reopen older save');
 p.s.startPlaythrough('new-game');total(p,0);event(p,'page2|other');save(p,'C');
 restore(p,'B');total(p,2,1,'switch earlier playthrough');restore(p,'C');total(p,1,0,'switch independent playthrough');
 const q=page(local,session,digestB,'games/other.z5.js');total(q,0,0,'exact digest isolation');
}
{
 const local=storage(),session=storage();let p=page(local,session);
 total(p,0);event(p,'runA');save(p,'A');
 const nonce=p.s.prepareNewGame();assert.ok(nonce,'prepared intent');
 // Sidecars remain writable; only ledger writes fail.
 local.failWhen(k=>!k.startsWith('PL_SaveState_')&&!k.startsWith('PL_Map'));
 p=page(local,session);total(p,0,0,'new intent selected despite ledger quota');
 restore(p,'A');total(p,1,0,'restore supersedes retained new intent');
 local.failWhen(()=>false);
 p=page(local,session);total(p,1,0,'latest selection survives reload and recovery');
}
{
 const local=storage(),session=storage();let p=page(local,session);
 total(p,0);event(p,'runA');save(p,'A');
 // Earlier queued SAVE must outrank restore-time stale disk sidecar.
 p=page(local,session,null);p.s.startPlaythrough('new-game');event(p,'runB');event(p,'runB2');save(p,'A');restore(p,'A');p.ready();
 total(p,2,0,'pending save->restore binds queued new run');
}
{
 const local=storage(),session=storage();let p=page(local,session);
 total(p,0);event(p,'runA');save(p,'A');
 // Later mutations cannot alter a captured restore binding.
 const delayed=page(local,session,null);restore(delayed,'A');
 p.s.startPlaythrough('new-game');event(p,'runB');event(p,'runB2');save(p,'A');
 delayed.ready();total(delayed,1,0,'restore-time metadata survives later overwrite');
}
{
 const local=storage(),session=storage();const p=page(local,session,null);
 assert.equal(p.s.importReady(),false,'import refuses unresolved identity');
 assert.equal(local.length,0,'readiness check writes nothing');passed++;
}
// Execute actual Qol importer and extracted unchanged real Map.Save body.
for (const faultIndex of [1,2,3,4,0]) {
 const local=storage(),session=storage();const p=page(local,session);total(p,0);event(p,'local1');save(p,'A');
 const states=JSON.parse(JSON.stringify(p.s.exportFor(['A'])));states.saves.A.playthrough.deaths=5;
 const c=p.context;vm.runInContext(fs.readFileSync(path.join(root,'js/Qol.js'),'utf8'),c);
 c.ParchLockQol.EscapeHtml=x=>String(x);
 Object.assign(c.ParchLockMap,{RebuildRoomsList(){},RebuildNotesList(){},ApplyNotesAddButtonPref(){},PersistenceBlocked:false});
 const mapSource=fs.readFileSync(path.join(root,'js/Map.js'),'utf8');
 const actualSave=mapSource.match(/Save: (\(\) => \{[\s\S]*?\n    \}),\r?\n\r?\n    Load:/)[1];
 c.ParchLockMap.Save=vm.runInContext('('+actualSave+')',c);
 local.setItem('dirent:save:native-short:A','before');local.setItem('PL_Map_'+c.ParchLock.GameFilename,'[]');
 const before=JSON.stringify([...local.data].sort());let writes=0;
 local.failWhen(()=>++writes===faultIndex);
 const pkg={Story:c.ParchLock.GameFilename,Map:[],Save:[{Key:'dirent:save:native-short:A',Data:'after'}],SaveStates:states};
 c.ParchLockQol.ImportPackageData(JSON.stringify(pkg));local.failWhen(()=>false);
 if(faultIndex){assert.equal(JSON.stringify([...local.data].sort()),before,'rollback every storage key after write '+faultIndex);total(p,1,0,'rollback preserves memory '+faultIndex);assert.ok(p.warnings.some(x=>x[0]==='Import Failed'));}
 else {total(p,5,0,'actual Qol success refreshes same run');assert.ok(p.warnings.some(x=>x[0]==='Import Complete'));}
 passed++;
}
// Actual tutorial close path, including library skip and pre-navigation refusal.
for(const mode of ['play','library','blocked']){
 const local=storage(),session=storage();const p=page(local,session);const c=p.context;let nav=0;
 c.document={readyState:'loading',addEventListener(){},removeEventListener(){},getElementById(){return null;},body:{classList:{remove(){}}}};
 c.Global={TutorialMarkComplete(){}};c.location.replace=()=>nav++;
 vm.runInContext(fs.readFileSync(path.join(root,'js/Tutorial.js'),'utf8'),c);
 c.Tutorial._page=mode==='library'?'library':'play';c.Tutorial.markLibraryDone=()=>{};
 if(mode==='blocked')session.failWhen(()=>true);
 c.Tutorial.close(true);
 assert.equal(nav,mode==='play'?1:0,'actual tutorial navigation '+mode);
 if(mode==='play'){const q=page(local,session);total(q,0,0,'tutorial selection loads clean run');}
 passed++;
}
// Actual story-ended button callback, pre-navigation selection and storage refusal.
for(const blocked of [false,true]){
 const local=storage(),session=storage();const p=page(local,session);const c=p.context;const handlers={};
 c.ModuleLibrary.openManager=()=>{};c.Message.ShowHelp=()=>{};c.ProductInfo={showAbout(){}};c.ParchLockQol={ShowDisplay(){}};
 c.Global={ToggleTheme(){},GetUrlParameter:()=>c.ParchLock.StoryPath};
 c.$=selector=>({off(){return this;},on(name,fn){handlers[selector]=fn;return this;}});
 vm.runInContext(fs.readFileSync(path.join(root,'js/WorkspaceUI.js'),'utf8'),c);
 c.WorkspaceUI.HasStory=()=>true;c.WorkspaceUI.OfferStoryEnded();
 const prior=c.location.href;if(blocked)session.failWhen(()=>true);
 handlers['#story-ended-restart']();
 assert.equal(c.location.href===prior,blocked,'actual story restart navigation refusal');passed++;
}
console.log('Independent public lifecycle: '+passed+' scenario checkpoints PASS');

