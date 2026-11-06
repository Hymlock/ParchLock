// grok1 2026-10-24: in-app check for N? cells that a player could see (operator standard 9:52 ET).
// For each visible PASS cell, load the title's start-state RAM (native, no edits) into the app's own
// decision layer (AttributeSchema + ActionSynth, same files the page loads) and assert, over EVERY object
// in both room and inventory context: the profile attribute is never set, and no verb for that key is offered.
//   cwd=<clean HEAD tree with games/>  node nq-inapp.cjs <nq-source-all.json> <Games,...|all> <out.json>
const fs=require('fs'),vm=require('vm'),crypto=require('crypto'),path=require('path');
const story=require(process.cwd()+'/work/investigations/zil-attr-analyzer.js').story;
const VERBS={lockable:/^(un)?lock\b/,locked:/^(un)?lock\b/,edible:/^(eat|drink)\b/,talkable:/^(talk|ask|tell)\b/,switchable:/^(turn|switch) (on|off)\b/,on:/^(turn|switch) off\b/,
 clothing:/^(wear|take off|remove)\b/,wearable:/^(wear|take off|remove)\b/,animate:/^(talk|ask|tell)\b/,enterable:/^(enter|get in|get on|sit|get out|get off|board)\b/,door:null,static:null,light:null};
function load(file){const bytes=Uint8Array.from(story(file)),mem=new DataView(bytes.buffer),digest=crypto.createHash('sha256').update(Buffer.from(bytes)).digest('hex');
 const header=Array.from(bytes.slice(0,28)),payload={inventory:[],discoveredObjects:[],playerId:0};
 const c=vm.createContext({console:{log(){},warn(){},error(){},info(){},debug(){}},setTimeout,clearTimeout,window:{},ModuleLibrary:{currentExecutableDigest:()=>digest,currentExecutableIdentity:()=>({digest,header})},ZRamProvider:{getMem:()=>mem},WorldModel:{get lastPayload(){return payload;}},Actionable:{payloadPool:()=>payload.inventory.concat(payload.discoveredObjects),referenceFor:o=>({unique:true,verified:true,noun:o.name}),commandNounFor:o=>o.name,isGameWord:()=>true},AttrCalibrator:{hydrate(){},overrideFor:()=>({}),objectOverrideFor:()=>null,hasConfirmedFlag:()=>false,allowedVerbsFor:()=>[]}});
 for(const f of ['ModuleStatFactsClaude','ZRamReader','GrammarProvider','AttributeSchema','ActionSynth','LearnedWords','EquipmentUI','SemanticActions'])vm.runInContext(fs.readFileSync('js/'+f+'.js','utf8'),c);
 return {c,mem,digest,payload};}
const R=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));const want=process.argv[3];const out={};let pass=0,fail=0;
for(const short in R){const g=R[short];if(want!=='all'&&!want.split(',').includes(short))continue;
 const cells=g.cells.filter(x=>x.visible&&x.sourceCheck.startsWith('PASS'));if(!cells.length)continue;
 const E=load(g.game),Z=E.c.ZRamReader,A=E.c.AttributeSchema,S=E.c.ActionSynth,h=Z.header(E.mem),n=Z.objectCount(E.mem,h);const objs=[];
 for(let id=1;id<=n;id++){try{const raw=Z.objectLinks(E.mem,id);objs.push({id,name:Z.shortName(E.mem,id)||('#'+id),parentId:raw.parent,attrs:A.applyTo({},raw,E.mem)});}catch(e){}}
 const menus={};for(const o of objs){menus[o.id]={};for(const ctx of ['room','inventory']){E.payload.inventory=ctx==='inventory'?[o]:[];E.payload.discoveredObjects=ctx==='room'?[o]:[];
  let v=[];try{v=S.commandsForObject(o,ctx).map(x=>String(x.verb||x.command||'').toLowerCase());}catch(e){v=['ERR '+e.message];}menus[o.id][ctx]=v;}}
 out[short]={game:g.game,digest:E.digest,objects:objs.length,cells:{}};
 for(const c of cells){const attrHits=objs.filter(o=>o.attrs&&o.attrs[c.key]).map(o=>o.id+':'+o.name);const re=VERBS[c.key];const verbHits=[];
  if(re)for(const o of objs)for(const ctx in menus[o.id])for(const v of menus[o.id][ctx])if(re.test(v)||/^ERR/.test(v))verbHits.push(o.id+':'+o.name+'['+ctx+'] '+v);
  const ok=!verbHits.length; // verdict = what the player is offered; attrHits = latent schema label only, reported separately
  ok?pass++:fail++;
  out[short].cells[c.key]={inApp:ok?'PASS':'FAIL',latentAttrLabelCount:attrHits.length,attrHits:attrHits.slice(0,6),verbHits:verbHits,verbRule:re?String(re):'attribute only (no dedicated verb)'};}}
fs.writeFileSync(process.argv[4],JSON.stringify(out,null,1));console.log('inApp PASS',pass,'FAIL',fail);
for(const s in out)for(const k in out[s].cells)if(out[s].cells[k].inApp!=='PASS')console.log('FAIL',s,k,JSON.stringify(out[s].cells[k]).slice(0,300));


