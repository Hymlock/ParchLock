// Identity Wear R3 (four-seat ACCEPTED PROPOSAL-identity-wear-r3 sha 4a1e90a7, codex correction to packet
// instruction 3): fact wearForms offers bare WEAR for exact direct-held, unworn owners only (Infidel ring 2,
// Lurking Horror gloves 203 / boots 104, Starcross suit 144, LH hyrax 133, Starcross junk suit 176). Original story bytes with test-only RAM edits;
// native evidence is separate (work/investigations/grok2/wear-concealed/cold-*.json, radial-infidel-ring-held-unworn.json).
const fs=require('fs'),vm=require('vm'),crypto=require('crypto'),assert=require('assert');
let n=0;function check(name,fn){fn();n++;console.log('PASS '+name);}
const TITLES=[
  {game:'Infidel.z3.js',digest:'91f78d4bbb6bcea5b3a6047e1efbb0ae1efa1c2382d360e679285526125babb3',worn:22,owners:{2:'ring'},other:33,container:31},
  {game:'TheLurkingHorror.z3.js',digest:'1862ef7ce4c25abd32d442392fe7eaba9c1595ed5411df75e99b06f43af6f5af',worn:3,owners:{203:'gloves',104:'boots',133:'hyrax'},other:199,playerGlobal:[188,56],room:202},
  {game:'Starcross.z3.js',digest:'1d9a69257349060823893f4cfa616f1040a3b41cbf38a6717199f206cd8f678c',worn:24,owners:{144:'suit',176:'suit'},other:71}];
function load(t){
  const bytes=Uint8Array.from(require(process.cwd()+'/work/investigations/zil-attr-analyzer.js').story(t.game));
  const mem=new DataView(bytes.buffer),digest=crypto.createHash('sha256').update(bytes).digest('hex');
  assert.strictEqual(digest,t.digest,t.game+' exact digest');
  const payload={inventory:[],discoveredObjects:[],playerId:null},names={};
  const c=vm.createContext({console,setTimeout,clearTimeout,window:{},document:{readyState:'loading',addEventListener(){}},
    UndoRestoreSync:{generation:7},
    ModuleLibrary:{currentExecutableDigest:()=>digest,currentExecutableIdentity:()=>({digest,header:Array.from(bytes.slice(0,28))})},
    ZRamProvider:{getMem:()=>mem},WorldModel:{lastPayload:payload},
    AttrCalibrator:{dictionaryForm:()=>true,exactFormsFor:()=>[],RPG_VERBS:[],ITEM_SUGGESTION_VERBS:[],hasConfirmedFlag:()=>false},
    Actionable:{payloadPool:()=>payload.inventory.concat(payload.discoveredObjects),referenceFor:o=>({unique:true,verified:true,noun:names[o.id]||o.name}),
      commandNounFor:o=>names[o.id]||o.name,isGameWord:()=>true}});
  for(const f of ['ModuleStatFactsClaude','ZRamReader','GrammarProvider','AttributeSchema','ActionSynth','LearnedWords','SemanticActions','EquipmentUI'])vm.runInContext(fs.readFileSync('js/'+f+'.js','utf8'),c);
  const R=c.ZRamReader,A=c.AttributeSchema,h=R.header(mem);
  if(t.playerGlobal)mem.setUint16(h.globals+2*t.playerGlobal[0],t.playerGlobal[1]);
  const player=R.resolvePlayer(mem).id;assert(player>0,t.game+' player');
  const room=t.room||R.objectLinks(mem,player).parent;
  if(t.room)mem.setUint8(R.objectBase(h,player)+4,room);
  payload.playerId=player;
  c.Actionable.radialCommandCurrent=function(command){return(command.sharedMembers||[command]).every(function(x){
    if(x.wornRemovalScope&&!c.ActionSynth.wornRemovalCommandCurrent(x))return false;
    if(x.identityWearScope&&(command.sharedMembers||!c.ActionSynth.identityWearCommandCurrent(x)))return false;return true;});};
  const parent=(id,p)=>mem.setUint8(R.objectBase(h,id)+4,p);
  const setWorn=(id,on)=>{const at=R.objectBase(h,id)+(t.worn>>3),m=0x80>>(t.worn&7),b=mem.getUint8(at);mem.setUint8(at,on?b|m:b&~m);};
  const object=id=>{const raw=R.objectLinks(mem,id);return{id,name:names[id]||R.shortName(mem,id),parentId:raw.parent,attrs:A.applyTo({},raw,mem)};};
  // where: 'held' | 'ground' | {in: containerId}
  function place(id,where){
    if(where==='held')parent(id,player);else if(where==='ground')parent(id,room);else{parent(where.in,player);parent(id,where.in);}
    payload.inventory=[];payload.discoveredObjects=[];
    if(where==='ground')payload.discoveredObjects=[object(id)];
    else{payload.inventory=[object(id)];if(where.in)payload.inventory.push(object(where.in));}
  }
  return {c,R,A,S:c.ActionSynth,mem,h,F:c.ModuleStatFactsClaude[digest],payload,player,room,names,place,setWorn,object};
}
const verbs=list=>list.map(x=>x.verb);
for(const t of TITLES){
  const T=load(t),S=T.S;
  check(t.game+': exact fact row binds wearForms '+JSON.stringify(Object.keys(t.owners))+' and wornAttribute '+t.worn,()=>{
    assert.deepStrictEqual(Array.from(T.F.wearForms.objects).sort(),Object.keys(t.owners).map(Number).sort());assert.strictEqual(T.F.wornAttribute,t.worn);});
  for(const [idS,noun] of Object.entries(t.owners)){
    const id=Number(idS);T.names[id]=noun;const tag=t.game+' '+noun+' '+id+': ';
    check(tag+'held-unworn shows Wear (main inventory, payload id, semantic) with identity scope',()=>{
      T.setWorn(id,false);T.place(id,'held');
      const inv=S.commandsForObject(T.object(id),'inventory',null);const w=inv.find(x=>x.verb==='wear');
      assert(w&&w.command==='wear '+noun&&w.identityWearScope,JSON.stringify(verbs(inv)));
      assert.deepStrictEqual(JSON.parse(JSON.stringify(w.identityWearScope)),{kind:'identity-wear-held-direct',digest:t.digest,generation:7,id,noun,command:'wear '+noun});
      assert(!verbs(inv).includes('remove'),'held-unworn never shows Remove');
      assert(verbs(S.commandsForPayloadObjectId(id,'inventory')).includes('wear'));
      const sem=T.c.SemanticActions.resolveForPayloadObjectId(id,'inventory')||[];
      const sw=sem.find(x=>x.verb==='wear');assert(sw&&sw.identityWearScope,'semantic keeps scope');
      assert(S.identityWearCommandCurrent(w),'tap current');});
    check(tag+'Equipment Yourself offers Wear for the held-unworn owner',()=>{
      T.setWorn(id,false);T.place(id,'held');
      const rows=T.c.EquipmentUI.yourselfCommands(T.object(id),{}),forms=rows.map(x=>x.Form);assert(forms.includes('wear'),JSON.stringify(forms));
      // codex #6000: the Equipment row must keep the identity-Wear descriptor and its own label (not "Drop").
      const wr=rows.find(x=>x.Form==='wear');assert(wr.ScopedCommand&&wr.ScopedCommand.identityWearScope,'Equipment Wear keeps identityWearScope');
      assert(wr.Label==='Wear','Equipment Wear label is Wear, got '+wr.Label);});
    check(tag+'room-kind caller (TranslatorUI/LearnedWords/evidence) on an actually held owner keeps Wear',()=>{
      T.setWorn(id,false);T.place(id,'held');const o=T.object(id);
      assert(verbs(S.commandsForObject(o,'room')).includes('wear'));
      assert(verbs(S.commandsForObject(o,'room',null,{allowAmbiguousReference:true,directEvidenceOnly:false})).includes('wear'));
      assert(verbs(S.commandsForEvidenceObject(o,'room')).includes('wear'));});
    check(tag+'worn (measured bit '+t.worn+') shows Remove/Drop, never Wear; capability not inferred from worn state',()=>{
      T.setWorn(id,true);T.place(id,'held');
      const v=verbs(S.commandsForObject(T.object(id),'inventory',null));
      assert(!v.includes('wear'),JSON.stringify(v));assert(v.includes('remove')||v.includes('drop'),JSON.stringify(v));
      assert.strictEqual(S.identityWearScopeFor(T.object(id),noun),null);T.setWorn(id,false);});
    check(tag+'on the ground: no Wear (room, evidence and payload callers)',()=>{
      T.place(id,'ground');const o=T.object(id);
      assert(!verbs(S.commandsForObject(o,'room')).includes('wear'));assert(!verbs(S.commandsForEvidenceObject(o,'room')).includes('wear'));
      assert(!verbs(S.commandsForPayloadObjectId(id,'room')).includes('wear'));});
    if(t.container)check(tag+'nested in a held container: no Wear (held-direct only)',()=>{
      T.place(id,{in:t.container});const o=T.object(id);
      assert(!verbs(S.commandsForPayloadObjectId(id,'inventory')).includes('wear'));
      assert.strictEqual(S.identityWearScopeFor(o,noun),null);});
    check(tag+'tap currency: generation, worn, custody, noun and digest drift all reject',()=>{
      T.setWorn(id,false);T.place(id,'held');const w=S.commandsForObject(T.object(id),'inventory',null).find(x=>x.verb==='wear');
      assert(S.identityWearCommandCurrent(w));
      T.c.UndoRestoreSync.generation=8;assert(!S.identityWearCommandCurrent(w));T.c.UndoRestoreSync.generation=7;
      T.setWorn(id,true);assert(!S.identityWearCommandCurrent(w));T.setWorn(id,false);
      T.place(id,'ground');assert(!S.identityWearCommandCurrent(w));T.place(id,'held');
      T.names[id]=noun+'x';assert(!S.identityWearCommandCurrent(w));T.names[id]=noun;
      const ml=T.c.ModuleLibrary,old=ml.currentExecutableDigest;ml.currentExecutableDigest=()=>'0'.repeat(64);assert(!S.identityWearCommandCurrent(w));ml.currentExecutableDigest=old;
      assert(S.identityWearCommandCurrent(w));
      assert(!T.c.Actionable.radialCommandCurrent({verb:'wear',command:w.command,sharedMembers:[w,w]}));});
    check(tag+'malformed or drifted wearForms -> absent',()=>{
      T.setWorn(id,false);T.place(id,'held');const saved=T.F.wearForms,o=()=>T.object(id);
      const bad=[undefined,null,[],{objects:[id],verb:'wear'},{objects:[id],verb:'put on',scope:'held-direct'},{objects:[id],verb:'wear',scope:'held'},
        {objects:id,verb:'wear',scope:'held-direct'},{objects:[String(id)],verb:'wear',scope:'held-direct'},{objects:[],verb:'wear',scope:'held-direct'},
        {objects:[id],verb:'wear',scope:'held-direct',extra:1},{objects:[99999],verb:'wear',scope:'held-direct'}];
      try{for(const b of bad){if(b===undefined)delete T.F.wearForms;else T.F.wearForms=b;
        assert.strictEqual(S.identityWearScopeFor(o(),noun),null,JSON.stringify(b));}}finally{T.F.wearForms=saved;}
      const sw=T.F.wornAttribute;try{T.F.wornAttribute=99;assert.strictEqual(S.identityWearScopeFor(o(),noun),null);}finally{T.F.wornAttribute=sw;}
      assert(S.identityWearScopeFor(o(),noun));});
    check(tag+'non-unique, unverified or mismatched noun -> absent',()=>{
      T.place(id,'held');const ref=T.c.Actionable.referenceFor;
      T.c.Actionable.referenceFor=o=>({unique:false,verified:true,noun});assert.strictEqual(S.identityWearScopeFor(T.object(id),noun),null);
      T.c.Actionable.referenceFor=o=>({unique:true,verified:false,noun});assert.strictEqual(S.identityWearScopeFor(T.object(id),noun),null);
      T.c.Actionable.referenceFor=ref;assert.strictEqual(S.identityWearScopeFor(T.object(id),'other'),null);});
    check(tag+'no bare one-object WEAR template -> absent',()=>{
      T.place(id,'held');const G=T.c.GrammarProvider,old=G.decodeD198;
      G.decodeD198=m=>{const f=old(m);return Object.assign({},f,{templates:(f.templates||[]).filter(x=>x.verb!=='wear')});};
      try{assert.strictEqual(S.identityWearScopeFor(T.object(id),noun),null);}finally{G.decodeD198=old;}});
    check(tag+'another object holding it (not the player) -> absent',()=>{T.place(id,'held');T.mem.setUint8(T.R.objectBase(T.h,id)+4,t.other);assert.strictEqual(S.identityWearScopeFor(T.object(id),noun),null);T.place(id,'held');});
  }
  check(t.game+': held non-owner '+t.other+' gets no identity Wear',()=>{
    T.place(t.other,'held');const list=S.commandsForObject(T.object(t.other),'inventory',null);
    assert(!list.some(x=>x.identityWearScope),JSON.stringify(verbs(list)));assert.strictEqual(S.identityWearScopeFor(T.object(t.other)),null);});
}
check('other titles: only the three first-batch digests carry wearForms (Infidel knapsack 31 stays out: take auto-wears)',()=>{
  const c=vm.createContext({});vm.runInContext(fs.readFileSync('js/ModuleStatFactsClaude.js','utf8'),c);
  const rows=vm.runInContext('ModuleStatFactsClaude',c),with_=Object.keys(rows).filter(k=>rows[k]&&rows[k].wearForms);
  assert.deepStrictEqual(with_.sort(),TITLES.map(t=>t.digest).sort());
  assert(!rows[TITLES[0].digest].wearForms.objects.includes(31));});
console.log(n+' identity-wear checks passed; native evidence is separate.');
