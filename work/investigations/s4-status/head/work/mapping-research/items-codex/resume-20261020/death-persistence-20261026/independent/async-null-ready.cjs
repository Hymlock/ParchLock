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

(async()=>{
 const local=storage(),session=storage();const p=page(local,session,null);let calls=0;
 p.context.ModuleLibrary.whenExecutableIdentityReady=()=>{
  calls++;return calls>20?Promise.reject(new Error('Independent safety bound stops original microtask loop')):Promise.resolve(null);
 };
 p.s.outcomes();
 await new Promise(resolve=>setTimeout(resolve,10));
 console.log('identity subscription calls before any external observation: '+calls);
 assert.equal(calls,1,'resolved null readiness must not self-subscribe');
 p.ready();total(p,0,0,'future ordinary observation materializes exact identity');
  const q=page(storage(),storage(),null);let resolveReady;
 q.context.ModuleLibrary.whenExecutableIdentityReady=()=>new Promise(resolve=>resolveReady=resolve);
 q.s.recordOutcome('death','pending-event');q.context.ModuleLibrary.currentExecutableDigest=()=>digestA;
 resolveReady();await new Promise(resolve=>setTimeout(resolve,5));total(q,1,0,'genuine deferred ready flushes queued outcome');
 const sl=storage(),r=page(sl,storage(),null);let resolveOld;
 r.context.ModuleLibrary.whenExecutableIdentityReady=()=>new Promise(resolve=>resolveOld=resolve);
 r.s.recordOutcome('death','abandoned-context');r.context.ParchLock.StoryPath='games/other.z5.js';
 r.context.ModuleLibrary.currentExecutableDigest=path=>path==='games/other.z5.js'?digestB:digestA;
 resolveOld();await new Promise(resolve=>setTimeout(resolve,5));
 assert.equal(sl.getItem('PL_Playthroughs_'+digestA),null,'stale path callback must not flush abandoned events');
 total(r,0,0,'new story isolated after abandoned callback');
 console.log('async null/deferred/stale-path regression PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});

