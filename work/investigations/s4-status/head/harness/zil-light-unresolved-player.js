// D260 correction: actual player identity is required for inventory custody.
// Constructed v5 controls, not native semantics certification.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const fixture=fs.readFileSync('harness/zil-light-forms.js','utf8');
const prefix=fixture.split('const LIGHT=')[0];if(prefix===fixture)throw Error('Loader boundary changed');
const load=new Function('require',prefix+'\nreturn load;')(require),T=load('Sherlock.z5.js');
vm.runInContext(fs.readFileSync('js/Actionable.js','utf8'),T.c);
T.c.Actionable.payloadPool=()=>T.payload.inventory;
const parent=(id,p)=>T.mem.setUint16(T.R.objectBase(T.h,id)+6,p);
const forms=()=>Array.from(T.A.lightForms(T.mem,166,'inventory')||[]);
function command(){const o=T.obj(166);T.payload.inventory=[o];return T.S.commandsForObject(o,'inventory').find(c=>c.lightFormScope);}
let checks=0;function check(name,fn){fn();checks++;console.log('PASS '+name);}
assert.equal(T.F.playerObject,232);
check('Unresolved player plus offstage owner does not imply inventory',()=>{parent(232,0);parent(166,0);assert.equal(T.R.resolvePlayer(T.mem).id,0);assert.equal(forms().length,0);assert(!command());});
check('Initialized actual player directly holding lamp qualifies',()=>{parent(232,38);parent(166,232);T.bit(166,38,0);assert.equal(T.R.resolvePlayer(T.mem).id,232);assert.deepEqual(forms(),['turn on']);assert(T.c.Actionable.radialCommandCurrent(command()));});
check('Nested owner excluded from direct inventory contract',()=>{parent(137,232);parent(166,137);assert.equal(forms().length,0);parent(166,232);});
check('Late loss of both player and owner invalidates old tap without generation change',()=>{const c=command();const g=T.c.UndoRestoreSync.generation;assert(c);parent(166,0);parent(232,0);assert.equal(T.R.resolvePlayer(T.mem).id,0);assert(!T.c.Actionable.radialCommandCurrent(c));assert.equal(T.c.UndoRestoreSync.generation,g);});
check('Restoring actual custody recovers current form',()=>{parent(232,38);parent(166,232);assert.equal(forms().length,1);assert(T.c.Actionable.radialCommandCurrent(command()));});
function withPlayer(id,fn){const real=T.R.resolvePlayer;T.R.resolvePlayer=()=>({id:id,source:'stub'});try{fn();}finally{T.R.resolvePlayer=real;}}
check('Holder id beyond the true object frontier is rejected (n2)',()=>{const big=0xFFFF;parent(166,big);withPlayer(big,()=>{assert.equal(forms().length,0);});parent(166,232);assert.equal(forms().length,1);});
check('Holder equal to the lamp itself (self-loop) is rejected (n2)',()=>{parent(166,166);withPlayer(166,()=>{assert.equal(forms().length,0);});parent(166,232);assert.equal(forms().length,1);});
function withLearned(verbs,fn){const C=T.c.AttrCalibrator,had=C&&C.allowedVerbsFor;if(!C)throw Error('no AttrCalibrator');C.allowedVerbsFor=()=>verbs.slice();try{fn();}finally{C.allowedVerbsFor=had;}}
const verbsOf=()=>{const o=T.obj(166);T.payload.inventory=[o];return T.S.commandsForObject(o,'inventory').map(c=>c.command+(c.lightFormScope?'[LF]':''));};
check('Learned switch pair is superseded by the scoped owner form (lit lamp -> only turn off)',()=>{parent(232,38);parent(166,232);T.bit(166,38,1);withLearned(['switch on','switch off','turn on'],()=>{const v=verbsOf().filter(x=>/ on | off |^(switch|turn) /.test(x));assert.deepEqual(v,['turn off lamp[LF]'],JSON.stringify(v));});T.bit(166,38,0);});
check('Non-owner keeps its learned switch pair (filter only runs with an owner scope)',()=>{const o=T.obj(151);parent(151,232);T.payload.inventory=[o];withLearned(['switch on','switch off'],()=>{const v=T.S.commandsForObject(o,'inventory').map(c=>c.command);assert(v.includes('switch on knife')&&v.includes('switch off knife'),JSON.stringify(v));});});
check('Exact native verb already learned: owner form still scoped, no unscoped duplicate (codex c3df 2)',()=>{parent(232,38);parent(166,232);T.bit(166,38,1);withLearned(['turn off','turn on'],()=>{const v=verbsOf().filter(x=>/ on | off |^(switch|turn) /.test(x));assert.deepEqual(v,['turn off lamp[LF]'],JSON.stringify(v));});T.bit(166,38,0);});
check('Owner gone from live payload: old tap refused, no stub fallback (codex c3df 1)',()=>{parent(232,38);parent(166,232);T.bit(166,38,0);const c=command();assert(c&&T.c.Actionable.radialCommandCurrent(c));T.payload.inventory=[];assert(!T.c.Actionable.radialCommandCurrent(c));const o=T.obj(166);T.payload.inventory=[o,Object.assign({},o)];assert(T.c.Actionable.radialCommandCurrent(c),'identical duplicate rows are one owner (grok 1745)');T.payload.inventory=[o,Object.assign({},o,{parentId:999})];assert(!T.c.Actionable.radialCommandCurrent(c),'conflicting duplicate rows refused');T.payload.inventory=[o];assert(T.c.Actionable.radialCommandCurrent(c));});
console.log('PASS '+checks+' unresolved-player custody controls (X tier)');
