// Audit r43 (from r42): composed radials (base vs cand js dir). usage: node radial.cjs <jsdir>
const fs=require('fs'),vm=require('vm'),crypto=require('crypto'),path=require('path');
const JS=process.argv[2];
function load(story,playerId){
 const bytes=Uint8Array.from(require(process.cwd()+'/work/investigations/zil-attr-analyzer.js').story(story));
 const mem=new DataView(bytes.buffer),digest=crypto.createHash('sha256').update(bytes).digest('hex'),payload={inventory:[],discoveredObjects:[],playerId};
 const c=vm.createContext({console,setTimeout,clearTimeout,window:{},ModuleLibrary:{currentExecutableDigest:()=>digest,currentExecutableIdentity:()=>({digest,header:Array.from(bytes.slice(0,28))})},ZRamProvider:{getMem:()=>mem},WorldModel:{lastPayload:payload},Actionable:{payloadPool:()=>payload.inventory.concat(payload.discoveredObjects),referenceFor:o=>({unique:true,verified:true,noun:o.name}),commandNounFor:o=>o.name,isGameWord:()=>true}});
 for(const f of ['ModuleStatFactsClaude','ZRamReader','GrammarProvider','AttributeSchema','ActionSynth','LearnedWords','SemanticActions','ExitCalibrator'])try{vm.runInContext(fs.readFileSync(path.join(JS,f+'.js'),'utf8'),c)}catch(e){console.log('load',f,e.message)}
 const R=c.ZRamReader,A=c.AttributeSchema,S=c.ActionSynth,h=R.header(mem);
 const base=id=>R.objectBase(h,id);
 const setBit=(id,b,v)=>{const a=base(id)+(b>>3),m=128>>(b&7);mem.setUint8(a,v?mem.getUint8(a)|m:mem.getUint8(a)&~m)};
 const has=(id,b)=>(mem.getUint8(base(id)+(b>>3))&(128>>(b&7)))!==0;
 const obj=id=>{const raw=R.objectLinks(mem,id);return{id,name:R.shortName(mem,id),parentId:raw.parent,attrs:A.applyTo({},raw,mem)};};
 const radial=(id,ctx)=>S.commandsForPayloadObjectId(id,ctx).map(x=>x.verb||x.command||String(x));
 const setParent=(id,p)=>mem.setUint8(base(id)+4,p);
 return {R,A,S,mem,payload,obj,radial,setBit,has,setParent};
}
// Audit r43: Hollywood container 4 + openCapability. usage: node radial.cjs <jsdir>
const E0=load('HollywoodHijinx.z3.js',1);
let P=0;for(let i=1;i<256;i++){try{const n=E0.R.shortName(E0.mem,i);if(/^(you|yourself|cretin|self)$/i.test(n)){P=i;break}}catch(e){}}
const E=load('HollywoodHijinx.z3.js',P||1);
const oc=v=>v.filter(x=>/^(open|close)\b/i.test(x)).join('/')||'-';
const show=(id,tag)=>{const o=E.obj(id);E.payload.discoveredObjects=[o];const r=E.radial(id,'room');console.log(' ',tag||'',id,o.name,'b4='+E.has(id,4),'b25='+E.has(id,25),'b27='+E.has(id,27),'container='+!!o.attrs.container,'supporter='+!!o.attrs.supporter,'isOpen='+!!o.attrs.isOpen,'OC='+oc(r),JSON.stringify(r));};
console.log('player',P);
const C4=[...Array(255).keys()].map(i=>i+1).filter(i=>{try{return E.has(i,4)}catch(e){return false}});
console.log('bit4 carriers',C4.length);
for(const id of C4)show(id,'start');
for(const id of [225,222,199,138]){E.setBit(id,25,1);show(id,'opened');E.setBit(id,25,0);show(id,'closed');}
show(63,'card');
