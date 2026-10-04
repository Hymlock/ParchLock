const fs=require('fs'),vm=require('vm'),assert=require('assert');
let checks=0;function test(n,fn){fn();checks++;console.log('PASS:',n)}
const store={},mem={};let key='a',filename='a.z8.js';
const obj={id:7,name:'axe',aliases:['axe'],attrs:{takeable:true}},payload={discoveredObjects:[obj],inventory:[]};
function boot(){
 const c=vm.createContext({console,Date,Math,JSON,Map,Set,setTimeout:()=>0,clearTimeout(){},window:{},document:{readyState:'loading',addEventListener(){},querySelector:()=>null},localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v},ParchLock:{get GameFilename(){return filename}},UndoRestoreSync:{generation:0},ZRamReader:{gameIdentityKey:()=>key},AttributeSchema:{_getMem:()=>mem},WorldModel:{lastPayload:payload},Actionable:{payloadPool:()=>payload.discoveredObjects.concat(payload.inventory),referenceFor:o=>({unique:true,verified:true,noun:o.name}),isGameWord:()=>true,disambiguatedNoun:o=>o.name},Global:{Prefs:{}}});
 for(const n of ['TurnRecorder','ActionSynth','EquipmentUI','AttrCalibrator','LearnedWords'])vm.runInContext(fs.readFileSync('js/'+n+'.js','utf8'),c);
 c.AttrCalibrator._splitAnyVerbNoun=command=>{const parts=command.split(' ');return {verb:parts[0],objectId:7,noun:'axe'}};
 c.AttrCalibrator.hydrate(mem);return c;
}
let c=boot(),L=c.LearnedWords,A=c.AttrCalibrator,R=c.TurnRecorder;
function submit(command){R.onAcceptedSubmit(command,'typed');return {objectId:7,exactForm:command.split(' ')[0],submissionId:R._submissionId,pageEpoch:R.pageEpoch,behavioralAccept:true,d198Correlation:{objectId:7,referenceVerified:true}}}
let first=submit('wield axe');
test('unknown first submitted try visible without success or evidence',()=>{assert(L.records().some(r=>r.trigger==='wield'));assert(!A.table.objects['7']);assert(!L.candidates().length)});
test('classification write grants no override/suppression/command and no Undo',()=>{assert(!L.override('exact:7:wield'));assert(!L.suppressed('exact',7,'wield'));assert(!L.commands(obj).length);assert.equal(L._undo.length,0)});
test('accepted first hit persists once',()=>{assert(A.recordExactForm(first));assert(!A.recordExactForm(first));A.persist(mem);assert.equal(A.table.objects['7'].exactForms.wield.confirmations,1)});
const firstEpoch=R.pageEpoch;c=boot();L=c.LearnedWords;A=c.AttrCalibrator;R=c.TurnRecorder;
test('reload hides one-confirmation row but retains count',()=>{assert(!L.records().some(r=>r.trigger==='wield'));assert.equal(A.table.objects['7'].exactForms.wield.confirmations,1)});
const second=submit('wield axe');
test('actual fresh recorder epoch reuses numeric1 and advances stored count',()=>{assert.equal(second.submissionId,1);assert.notEqual(second.pageEpoch,firstEpoch);assert(A.recordExactForm(second));assert.equal(A.table.objects['7'].exactForms.wield.confirmations,2);A.persist(mem)});
test('same event delivered twice after generation change still counts once',()=>{c.UndoRestoreSync.generation++;assert(!A.recordExactForm(second));assert.equal(A.table.objects['7'].exactForms.wield.confirmations,2)});
test('confirmed unknown stays visible after projection clear and provider later gains it',()=>{L.clearProjection();c.ActionSynth.rules.magic=['wield'];obj.attrs.magic=true;assert(L.records().some(r=>r.type==='exact'&&r.trigger==='wield'));delete obj.attrs.magic;delete c.ActionSynth.rules.magic});
submit('take axe');
test('independently provided verb hidden from learned but appears in Story actions',()=>{assert(!L.records().some(r=>r.section==='learned'&&r.trigger==='take'));assert(L.records().some(r=>r.section==='actions'&&r.trigger==='take'));assert(L.load().rows['exact:7:take'].knownBefore)});
test('classification survives ordinary edits, Ignore, Undo and document reload',()=>{const r=L.records().find(r=>r.id==='exact:7:wield');L.commit(r,'wield','Brandish',true,7);assert.strictEqual(L.load().rows[r.id].knownBefore,false);L.undo();assert.strictEqual(L.load().rows[r.id].knownBefore,false);L._data=null;assert.strictEqual(L.load().rows[r.id].knownBefore,false)});
test('Undo keeps a later independent classification without making a label override',()=>{const r=L.records().find(r=>r.id==='exact:7:wield');L.commit(r,'wield','Brandish',false,7);submit('polish axe');L.undo();assert.strictEqual(L.load().rows['exact:7:polish'].knownBefore,false);assert(!L.override('exact:7:polish'))});
test('legacy missing-provenance confirmed row remains visible',()=>{A.table.objects['7'].exactForms.legacy={confirmations:2};assert(L.records().some(r=>r.trigger==='legacy'))});
test('legacy bare submission number advances from count1 with qualified actual recorder key',()=>{A.table.objects['7'].exactForms.rub={confirmations:1,submissionId:1};const e=submit('rub axe');assert(A.recordExactForm(e));assert.equal(A.table.objects['7'].exactForms.rub.confirmations,2)});
test('restore clears only provisional display; calibration persists',()=>{submit('unknown axe');const before=JSON.stringify(A.table);L.clearProjection();assert(!L.records().some(r=>r.trigger==='unknown'));assert.equal(JSON.stringify(A.table),before)});
test('module switch isolates records and return restores confirmed forms',()=>{A.persist(mem);key='b';L.records();assert(!L.records().some(r=>r.trigger==='wield'));key='a';assert(L.records().some(r=>r.trigger==='wield'))});
test('ordinal owner registers ground objects once, reuses them for equipment and reload',()=>{filename='a.z8.js';const E=c.EquipmentUI;E.registerInstances([obj,{...obj,id:8}]);const seq=E._seq['7'];E.registerInstances([obj,obj]);assert.equal(E._seq['7'],seq);assert.notEqual(E._seq['8'],seq);E._seqKey=null;E.loadSeq();assert.equal(E._seq['7'],seq)});
test('empty filename and demo/projection ids never persist ordinals',()=>{filename='';const E=c.EquipmentUI;E.registerInstances([obj]);assert(!store.PL_EquipSeq_);filename='real';E.registerInstances([{id:999,demo:true}]);assert(!E._seq['999'])});
test('unconfirmed/current-stale status diagnostics cannot claim active condition',()=>{c.StatTracker={model:()=>({stats:{health:{key:'health',label:'Health',value:50,confirmed:false}},conditions:{poison:{key:'poison',label:'Poisoned',state:'confirmed'}}}),visibleStats:()=>[],visibleConditions:()=>[]};const rs=L.records().filter(r=>r.section==='status');assert(rs.every(r=>r.state==='unknown'));assert(rs.every(r=>r.diagnostic.includes('Not shown')))});
test('shared display correction preserves command nouns and candidate ownership against accepted baseline',()=>{
 const objects=[{id:11,name:'nutritiou',aliases:['food','pellet','nutritiou'],labelProvenance:'parser-vocabulary',attrs:{takeable:true}},{id:12,name:'nutritiou',aliases:['food','pellet','nutritiou'],labelProvenance:'parser-vocabulary',attrs:{takeable:true}}];
 function model(source){const k=vm.createContext({console,window:{},document:{addEventListener(){},querySelectorAll:()=>[]},WorldModel:{lastPayload:{discoveredObjects:objects,inventory:objects}},$(){return {text:()=>'',closest:()=>({length:0})}}});vm.runInContext(source,k);k.Actionable.Scope.lastInventoryText='a food pellet';const pool=k.Actionable.payloadPool();k.Actionable.CommandNouns=k.Actionable.commandNounsForPool(pool);return {k,pool,nouns:pool.map(o=>k.Actionable.commandNounFor(o)),refs:pool.map(o=>k.Actionable.referenceFor(o))};}
 const before=model(require('child_process').execFileSync('git',['show','8983d55:js/Actionable.js'],{encoding:'utf8'})),after=model(fs.readFileSync('js/Actionable.js','utf8'));
 assert.equal(JSON.stringify(after.nouns),JSON.stringify(before.nouns));assert.equal(JSON.stringify(after.refs),JSON.stringify(before.refs));assert(after.pool.every(o=>o.displayName==='food pellet'));
});
test('later same-revision recorder witness survives cosmetic Undo',()=>{
 const id='manual:late',r={id,type:'manual',editable:true,objectId:7,trigger:'wield',original:''};
 L.commit(r,'wield','Wield',false,7);L.commit(r,'wield','Brandish',false,7);L.load().rows[id].witnesses=['independent-late'];L.undo();assert(L.load().rows[id].witnesses.includes('independent-late'));
});
test('invalid optional membership metadata never discards existing valid overrides',()=>{
 const data=L.load();data.rows['manual:late'].knownBefore='invalid';store[L.PREFIX+key]=JSON.stringify(data);L._data=null;assert(L.load().rows['manual:late']);assert.equal(L.load().rows['manual:late'].knownBefore,undefined);
});
test('existing nested take and ordinary edible drink count as independent provider forms',()=>{
 const bag={id:88,name:'bag',attrs:{container:true}};payload.playerId=1;payload.inventory=[{...obj,parentId:88}, {...bag,parentId:1}];
 assert(L.independentForms(payload.inventory[0]).includes('take'));payload.inventory=[];obj.attrs.edible=true;assert(L.independentForms(obj).includes('drink'));const promoted={...obj,examineOnly:true};assert(!L.independentForms(promoted).includes('drink'));delete obj.attrs.edible;
});
test('distinct physical rows retain aliases and authoritative held attributes',()=>{
 const k=vm.createContext({console,window:{},document:{addEventListener(){}},WorldModel:{lastPayload:{inventory:[{id:7,attrs:{worn:true},parentId:1}]} }});vm.runInContext(fs.readFileSync('js/Actionable.js','utf8'),k);
 const rows=k.Actionable.distinctObjects([{id:7,aliases:['red'],attrs:{worn:false}},{id:7,aliases:['vial'],attrs:{worn:false}}]);assert.equal(rows.length,1);assert.deepEqual(Array.from(rows[0].aliases),['red','vial']);assert(rows[0].attrs.worn);assert.equal(rows[0].parentId,1);
});
test('legacy automatic built-in rows hide without deleting evidence',()=>{
 const forms=A.table.objects['7'].exactForms;forms.take={confirmations:2};forms.examine={confirmations:2};
 delete L.load().rows['exact:7:take'];const before=JSON.stringify(forms);
 assert(!L.records().some(r=>r.section==='learned'&&r.type==='exact'&&['take','examine'].includes(r.trigger)));
 assert.equal(JSON.stringify(forms),before);
});
test('banner visibility defaults and explicit preferences',()=>{
 ['learned','actions','names','status'].forEach(k=>delete c.Global.Prefs['LearnedWordsShow_'+k]);
 assert(L.sectionEnabled('learned'));assert(L.sectionEnabled('status'));assert(!L.sectionEnabled('actions'));assert(!L.sectionEnabled('names'));
 c.Global.Prefs.LearnedWordsShow_learned=false;assert(!L.sectionEnabled('learned'));
});
console.log(checks+' consensus contract checks passed');
