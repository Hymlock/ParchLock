const fs = require('fs'), vm = require('vm'), assert = require('assert');
const store = {}, mem = {}, objects = [{ id: 7, name: 'axe', aliases: ['axe'], attrs: {} }];
let identity = 'build-a', checks = 0;
const ctx = vm.createContext({ console, Date, Math, JSON, Map, setTimeout, clearTimeout,
  window: {}, document: { readyState: 'loading', addEventListener() {} },
  localStorage: { getItem: k => store[k] || null, setItem: (k,v) => { store[k] = v; }, removeItem: k => delete store[k] },
  UndoRestoreSync: { generation: 0 }, ZRamReader: { gameIdentityKey: () => identity },
  AttributeSchema: { _getMem: () => mem, _findIdByName: () => 7 },
  WorldModel: { lastPayload: { inventory: objects, discoveredObjects: [] } },
  Actionable: { payloadPool: () => objects, referenceFor: o => ({ unique: !!o, verified: !!o, noun: o && o.name }),
    isGameWord: w => ['axe','wield','polish','rub','with','examine','look','at','take'].includes(w) },
  ActionSynth: { rules: { default: ['examine'] }, commandsForObject: () => [] }
});
for (const file of ['AttrCalibrator','LearnedWords']) vm.runInContext(fs.readFileSync('js/'+file+'.js','utf8'),ctx);
const L=ctx.LearnedWords, A=ctx.AttrCalibrator;
function test(name, fn) { fn(); checks++; console.log('PASS:',name); }
function seed() { A.hydrate(mem); A.table.objects['7']={exactForms:{wield:{confirmations:2}},allowedVerbs:{rub:{confirmations:2}}}; }
seed();
const evidence=JSON.stringify(A.table);
const original={id:L.rowKey('exact',7,'wield'),type:'exact',editable:true,objectId:7,trigger:'wield',original:'wield'};
test('published and provisional enumeration',()=>{ A.table.objects['7'].exactForms.polish={confirmations:1}; const list=L.records(); assert(list.some(r=>r.trigger==='polish'&&r.state==='Not remembered yet')); });
test('label edit preserves evidence and published form',()=>{ L.commit(original,'wield','Brandish',false,7); assert.equal(L.commandLabel(7,'wield','Wield'),'Brandish'); assert(A.exactFormsFor(7).includes('wield')); });
test('ignore affects learned contribution only',()=>{ L.commit(original,'wield','Brandish',true,7); assert(!A.exactFormsFor(7).includes('wield')); assert(A.allowedVerbsFor(7).includes('rub')); });
test('undo restores last valid override',()=>{ L.undo(); assert(A.exactFormsFor(7).includes('wield')); });
test('replacement suppresses original and starts unconfirmed',()=>{ L.commit(original,'polish','Polish',false,7); assert(!A.exactFormsFor(7).includes('wield')); assert.equal(L.candidates(7)[0].enter,false); });
const candidate=L.candidateForCommand('polish axe');
function observation(c,id,changes={}) { return Object.assign({learnedWordCandidate:c, objectId:7, exactForm:c.form, submissionId:id, behavioralAccept:true, rejected:false, ambiguous:false, d198Correlation:{objectId:7,referenceVerified:true}},changes); }
test('recorder witness has no calibration write',()=>{ const before=JSON.stringify(A.table); A.record(observation(candidate,1)); assert.equal(JSON.stringify(A.table),before); assert.equal(L.candidates(7)[0].enter,false); });
test('duplicate submission cannot promote',()=>{ A.record(observation(candidate,1)); assert.equal(L.candidates(7)[0].enter,false); });
test('refusal and ambiguity cannot promote',()=>{ A.record(observation(candidate,2,{rejected:true})); A.record(observation(candidate,3,{ambiguous:true})); assert.equal(L.candidates(7)[0].enter,false); });
test('second real accepted witness promotes current revision',()=>{ A.record(observation(candidate,4)); assert.equal(L.candidates(7)[0].enter,true); });
test('new revision never inherits old confirmations',()=>{ L.commit(original,'rub','Rub',false,7); assert.equal(L.candidates(7)[0].enter,false); A.record(observation(candidate,5)); assert.equal(L.candidates(7)[0].enter,false); });
test('stale restore generation rejects witness',()=>{ const c=L.candidateForCommand('rub axe'); ctx.UndoRestoreSync.generation++; A.record(observation(c,6)); assert.equal(L.candidates(7)[0].enter,false); });
test('missing dictionary and ambiguous object cannot save',()=>{ assert.throws(()=>L.commit(original,'invented','Invalid',false,7)); assert.throws(()=>L.commit(original,'polish','Invalid',false,99)); });
test('blank draft cannot replace valid record',()=>{ const before=JSON.stringify(L.load()); assert.throws(()=>L.commit(original,'rub','',false,7)); assert.equal(JSON.stringify(L.load()),before); });
test('manual addition is a reviewable suggestion',()=>{ L.commit({id:'manual:new',type:'manual',editable:true,original:''},'look at','Inspect',false,7); assert.equal(L.commands(objects[0]).find(c=>c.verb==='look at').Enter,false); });
test('multiword manual candidate uses full verified form',()=>{ assert.equal(L.candidateForCommand('look at axe').form,'look at'); });
test('stale menu command cannot survive a revision change',()=>{ const cmd=L.commands(objects[0]).find(c=>c.verb==='look at');assert(L.commandCurrent(cmd));L.commit({id:'manual:new',type:'manual',editable:true,original:''},'take','Take',false,7);assert(!L.commandCurrent(cmd));L.undo(); });
test('prepare admits manual non-RPG form through same analyzer',()=>{ A._verbRegex=/^(examine)\s+(.+)$/i; const turn={command:'look at axe'}; assert(A.analyzers.verbSuccess.prepare(turn)); assert.equal(turn.__diagVerbSuccessCtx.exactForm,'look at'); assert(turn.__diagVerbSuccessCtx.learnedWordCandidate); });
test('stat-probe and ambiguous submission never enter analyzer',()=>{ assert.equal(A.analyzers.verbSuccess.prepare({command:'look at axe',source:'stat-probe'}),null); assert.equal(A.analyzers.verbSuccess.prepare({command:'look at axe',source:'ambiguous-reference'}),null); });
test('inspect decisions remain evidence, reversible projection',()=>{ A.table.verbBehavior={disabled:{examine:{confirmed:true,responsesByObject:{}}},substituteVerb:'look at'}; L.commit({id:'behavior:substitute',type:'behavior',trigger:'look at'},'look at','Inspect replacement',true,null); assert.equal(A.defaultInspectVerb(),'examine'); assert(A.inspectVerbCurrentlyDisabled()); L.commit({id:'behavior:disabled:examine',type:'behavior',trigger:'examine'},'examine','Disabled inspect',true,null); assert.equal(A.inspectVerbCurrentlyDisabled(),false); assert.equal(A.table.verbBehavior.disabled.examine.confirmed,true); });
test('names labels never modify command references',()=>{ L.commit({id:'name:7',type:'name',trigger:'axe'},'axe','Battle axe',false,7); assert.equal(L.label('name',7,'axe'),'Battle axe'); assert.equal(ctx.Actionable.referenceFor(objects[0]).noun,'axe'); });
test('status label projection never writes values or evidence',()=>{ L.commit({id:'status:poisoned',type:'status',trigger:'poisoned'},'poisoned','Poison',false,null); assert.equal(L.label('status','poisoned','Poisoned'),'Poison'); assert.equal(ctx.Actionable.referenceFor(objects[0]).noun,'axe'); });
test('storage failure leaves the last valid record and undo intact',()=>{ const before=JSON.stringify(L.load()),length=L._undo.length,set=ctx.localStorage.setItem;ctx.localStorage.setItem=()=>{throw Error('quota');};assert.throws(()=>L.commit(original,'rub','Changed',false,7));ctx.localStorage.setItem=set;assert.equal(JSON.stringify(L.load()),before);assert.equal(L._undo.length,length); });
test('unverified reference cannot confirm a manual form',()=>{ const c=L.candidateForCommand('look at axe');A.record(observation(c,10,{d198Correlation:{objectId:7,referenceVerified:false}}));assert.equal(L.candidates(7).find(r=>r.form==='look at').enter,false); });
test('story change isolates overrides and undo',()=>{ identity='build-b'; assert.deepEqual(Object.keys(L.load().rows),[]); assert.equal(L._undo.length,0); assert.equal(L.commandLabel(7,'wield','Wield'),'Wield'); });
test('malformed/version mismatch fails closed',()=>{ identity='bad'; store[L.PREFIX+'bad']=JSON.stringify({version:2,gameIdentityKey:'bad',rows:{}}); assert.deepEqual(Object.keys(L.load().rows),[]); identity='bad2'; store[L.PREFIX+'bad2']=JSON.stringify({version:1,gameIdentityKey:'bad2',rows:{'manual:x':{label:2}}}); assert.deepEqual(Object.keys(L.load().rows),[]); });
test('persistence writes only override namespace',()=>{ assert(Object.keys(store).every(k=>k.startsWith(L.PREFIX))); });
console.log(checks+' checks passed');
