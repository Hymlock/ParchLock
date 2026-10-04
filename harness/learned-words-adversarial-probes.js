// Review-only probes against actual current source. No product mutation.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});const page=await browser.newPage();
 await page.setContent('<div id="fixture"></div>');
 await page.evaluate(()=>{window.$=()=>({closest:()=>({length:0})});window.WorldModel={lastPayload:{discoveredObjects:[],inventory:[]}};});
 await page.addScriptTag({content:fs.readFileSync('js/Actionable.js','utf8')});
 const result=await page.evaluate(()=>{
  const a={id:1,name:'nutritiou',aliases:['food','pellet','pellets','nutritiou'],labelProvenance:'parser-vocabulary'},b={...a,id:2};
  const names={one:Actionable.displayNameFor(a,[a],'a food pellet'),two:[a,b].map(o=>Actionable.displayNameFor(o,[a,b],'a food pellet'))};
  function mark(pool){Actionable.payloadPool=()=>pool;const host=document.querySelector('#fixture');host.textContent='food pellet';Actionable.wrapFirstExact([host],'food pellet',{objectId:1,kind:'inventory'});const m=host.querySelector('.pl-act');return {owners:JSON.parse(m.dataset.candidateIds),objectId:m.dataset.objectId||null,kind:m.dataset.kind};}
  const repeatedId=mark([a,a]);const ref=Actionable.referenceFor(a,[a,a]);
  const mixed=mark([a,b]);
  return {names,repeatedId,distinctReference:ref.unique,mixed};
 });
 assert.equal(result.names.one,'food pellet');assert.deepEqual(result.names.two,['food pellet','food pellet']);
 assert.equal(result.distinctReference,true);assert.equal(result.repeatedId.objectId,'1');assert.deepEqual(result.repeatedId.owners,[1]);
 assert.equal(result.mixed.kind,'object');
 await page.addScriptTag({content:fs.readFileSync('js/ActionSynth.js','utf8')});
 result.allHeldContext=await page.evaluate(()=>{
  const pool=[{id:1,name:'pellet',aliases:['pellet'],attrs:{takeable:true}},{id:2,name:'pellet',aliases:['pellet'],attrs:{takeable:true}}];
  WorldModel.lastPayload={inventory:pool,discoveredObjects:[]};Actionable.payloadPool=()=>pool;
  Actionable.addMoreActions=()=>{};window.ParchLockQol={OpenRadial:(x,y,s)=>window.__slices=s};
  Actionable.Open('pellet','inventory',0,0,null);const inventory=window.__slices.map(s=>s.Command);
  Actionable.Open('pellet','object',0,0,null);const room=window.__slices.map(s=>s.Command);
  return {inventory,room};
 });
 assert(!result.allHeldContext.inventory.includes('take pellet'));assert(result.allHeldContext.room.includes('take pellet'));
 await browser.close();
 const store={},objects=[{id:7,name:'axe',aliases:['axe']}],c=vm.createContext({console,Date,Math,JSON,Map,setTimeout,clearTimeout,window:{},document:{readyState:'loading',addEventListener(){}},localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v},UndoRestoreSync:{generation:0},AttributeSchema:{_getMem:()=>({})},AttrCalibrator:{gameIdentityKey:()=> 'audit-key',hydrate(){},table:{objects:{}}},Actionable:{payloadPool:()=>objects,referenceFor:()=>({unique:true,verified:true}),isGameWord:()=>true},ActionSynth:{commandsForObject:()=>[]}});
 vm.runInContext(fs.readFileSync('js/LearnedWords.js','utf8'),c);const l=c.LearnedWords,r={id:'exact:7:wield',type:'exact',editable:true,objectId:7,trigger:'wield',original:'wield'};
 l.commit(r,'wield','Wield',false,7);l.load().rows[r.id].knownBefore=false;l.commit(r,'wield','Brandish',false,7);
 result.optionalMetadataLost=!Object.hasOwn(l.load().rows[r.id],'knownBefore');assert(!result.optionalMetadataLost);
 const memory={},q=vm.createContext({console,localStorage:{getItem:k=>memory[k]||null,setItem:(k,v)=>memory[k]=v},ParchLock:{GameFilename:'audit.z8.js'}});
 vm.runInContext(fs.readFileSync('js/EquipmentUI.js','utf8'),q);q.EquipmentUI._seqKey=null;q.EquipmentUI.loadSeq();result.ordinalAfterLoadOnly=q.EquipmentUI._seq['7']||null;assert.equal(result.ordinalAfterLoadOnly,null);
  const evidenceStore={};
 function calibratorSession(){const k=vm.createContext({console,Date,Math,JSON,window:{},localStorage:{getItem:key=>evidenceStore[key]||null,setItem:(key,value)=>evidenceStore[key]=value},ZRamReader:{gameIdentityKey:()=> 'same-build'}});vm.runInContext(fs.readFileSync('js/AttrCalibrator.js','utf8'),k);k.AttrCalibrator.dictionaryForm=()=>true;k.AttrCalibrator.hydrate({});return k.AttrCalibrator;}
 const entry={objectId:7,exactForm:'wield',submissionId:1,behavioralAccept:true,d198Correlation:{objectId:7,referenceVerified:true}};
 const first=calibratorSession();assert.equal(first.recordExactForm(entry),true);first.persist({});
 const next=calibratorSession();const acceptedOnNextSession=next.recordExactForm({...entry});
 result.reloadSubmissionCollision={acceptedOnNextSession,confirmations:next.table.objects['7'].exactForms.wield.confirmations};
 assert.equal(acceptedOnNextSession,false);assert.equal(result.reloadSubmissionCollision.confirmations,1);
 console.log(JSON.stringify(result,null,2));console.log('8 repaired and retained-context adversarial checks passed (legacy direct numeric API remains backward compatible).');
})().catch(e=>{console.error(e);process.exitCode=1});


