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
console.log('PASS '+checks+' unresolved-player custody controls (X tier)');
