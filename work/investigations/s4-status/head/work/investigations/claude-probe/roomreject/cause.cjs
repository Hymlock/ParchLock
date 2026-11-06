const fs=require('fs'),vm=require('vm'),crypto=require('crypto'),path=require('path');
const JS=process.cwd()+'/js';
for(const story of process.argv.slice(2)){
const bytes=Uint8Array.from(require(process.cwd()+'/work/investigations/zil-attr-analyzer.js').story(story));
const mem=new DataView(bytes.buffer),digest=crypto.createHash('sha256').update(bytes).digest('hex');
const c=vm.createContext({console:{log(){},warn(){}},window:{},ModuleLibrary:{currentExecutableDigest:()=>digest,currentExecutableIdentity:()=>({digest,header:Array.from(bytes.slice(0,28))})},ZRamProvider:{getMem:()=>mem},WorldModel:{lastPayload:{}}});
for(const f of ['ModuleStatFactsClaude','ZRamReader','GrammarProvider','AttributeSchema'])vm.runInContext(fs.readFileSync(path.join(JS,f+'.js'),'utf8'),c);
const R=c.ZRamReader,A=c.AttributeSchema,h=R.header(mem),N=R.objectCount(mem,h);
const fact=c.ModuleStatFactsClaude[digest]||{};
const bits={};for(const k of ['clothing','wearable','worn'])bits[k]=A.bitFor(k,mem);
const fam=(()=>{try{return A._familyOf(mem).classification}catch(e){return '?'}})();
const pc={};for(let i=1;i<=N;i++){const p=R.objectLinks(mem,i).parent;pc[p]=(pc[p]||0)+1}
const ROOMS=+Object.entries(pc).filter(e=>e[0]!='0').sort((a,b)=>b[1]-a[1])[0][0];
const rej=[];for(let i=1;i<=N;i++){if(R.objectLinks(mem,i).parent!==ROOMS)continue;const a=R.attrsFromObject(mem,i)||{};const k=['clothing','wearable','worn'].filter(x=>a[x]);if(k.length)rej.push(i+':'+R.shortName(mem,i)+'['+k+']');}
console.log(story,'fam',fam,'map.wearable',fact.attributeMap&&fact.attributeMap.wearable,'map.clothing',fact.attributeMap&&fact.attributeMap.clothing,'wornAttr',fact.wornAttribute,'bitFor',JSON.stringify(bits),'ROOMS',ROOMS,'rejected',rej.length,'\n  ',rej.join('; '));}
