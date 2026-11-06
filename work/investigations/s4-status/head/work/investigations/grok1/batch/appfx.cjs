// appfx: app-effect snapshot for a tree (cwd). node appfx.cjs <games,...> <out.json>
const fs=require('fs'),vm=require('vm'),crypto=require('crypto');
const story=require(process.cwd()+'/work/investigations/zil-attr-analyzer.js').story;
function load(file){const bytes=Uint8Array.from(story(file)),mem=new DataView(bytes.buffer),digest=crypto.createHash('sha256').update(Buffer.from(bytes)).digest('hex');
 const header=Array.from(bytes.slice(0,28)),payload={inventory:[],discoveredObjects:[],playerId:0};
 const c=vm.createContext({console:{log(){},warn(){},error(){},info(){},debug(){}},setTimeout,clearTimeout,window:{},ModuleLibrary:{currentExecutableDigest:()=>digest,currentExecutableIdentity:()=>({digest,header})},ZRamProvider:{getMem:()=>mem},WorldModel:{get lastPayload(){return payload;}},Actionable:{payloadPool:()=>payload.inventory.concat(payload.discoveredObjects),referenceFor:o=>({unique:true,verified:true,noun:o.name}),commandNounFor:o=>o.name,isGameWord:()=>true},AttrCalibrator:{hydrate(){},overrideFor:()=>({}),objectOverrideFor:()=>null,hasConfirmedFlag:()=>false,allowedVerbsFor:()=>[]}});
 for(const f of ['ModuleStatFactsClaude','ZRamReader','GrammarProvider','AttributeSchema','ActionSynth','LearnedWords','EquipmentUI','SemanticActions'])vm.runInContext(fs.readFileSync('js/'+f+'.js','utf8'),c);
 return {c,mem,payload};}
const out={};for(const g of process.argv[2].split(',')){const E=load(g),Z=E.c.ZRamReader,A=E.c.AttributeSchema,S=E.c.ActionSynth,n=Z.objectCount(E.mem,Z.header(E.mem));const r={};
 for(let id=1;id<=n;id++){let o;try{const raw=Z.objectLinks(E.mem,id);o={id,name:Z.shortName(E.mem,id)||('#'+id),parentId:raw.parent,attrs:A.applyTo({},raw,E.mem)};}catch(e){continue;}
  const m={};for(const ctx of ['room','inventory']){E.payload.inventory=ctx==='inventory'?[o]:[];E.payload.discoveredObjects=ctx==='room'?[o]:[];let v=[];try{v=S.commandsForObject(o,ctx).map(x=>String(x.command||x.verb||''));}catch(e){v=['ERR '+e.message];}m[ctx]=v.sort();}
  let worn=null;try{worn=A.isTrulyWorn?!!A.isTrulyWorn(o.attrs):null;}catch(e){}
  r[id]={name:o.name,takeable:!!o.attrs.takeable,scenery:!!o.attrs.scenery,worn,m};}
 out[g]=r;}
fs.writeFileSync(process.argv[3],JSON.stringify(out));console.log('ok',Object.keys(out).length);
