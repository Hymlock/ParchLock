// E3 room check (claude probe): rooms = most common parent of exit destinations (method of audit-r27/rooms-parent.cjs).
// Lists every object holding the LOCKED bit and flags any that is a room. Optional: dump exits for a title (argv[2]=file).
const fs=require('fs'),vm=require('vm'),crypto=require('crypto');
const an=require(process.cwd()+'/work/investigations/zil-attr-analyzer.js');
const T={'HollywoodHijinx.z3.js':4};const out={};
for(const [file,bit] of Object.entries(T)){
 const bytes=Uint8Array.from(an.story(file)),mem=new DataView(bytes.buffer),digest=crypto.createHash('sha256').update(bytes).digest('hex');
 const c=vm.createContext({console,window:{},ModuleLibrary:{currentExecutableDigest:()=>digest,currentExecutableIdentity:()=>({digest,header:Array.from(bytes.slice(0,28))})},ZRamProvider:{getMem:()=>mem}});
 for(const f of ['ModuleStatFactsClaude','ZRamReader','GrammarProvider','AttributeSchema'])vm.runInContext(fs.readFileSync('js/'+f+'.js','utf8'),c);
 const R=c.ZRamReader,G=c.GrammarProvider;const OT=mem.getUint16(10)+62;let minP=1e9,real=0;for(let i=1;;i++){const pa=mem.getUint16(OT+(i-1)*9+7);if(OT+(i-1)*9>=minP)break;minP=Math.min(minP,pa);real=i;}
 const props=new Set(G.d214DirectionProperties(mem).map(d=>d.prop!=null?d.prop:d));
 const par={},exits={};for(let i=1;i<=real;i++)for(const p of R.listProps(mem,i)||[]){if(!props.has(p.num)||(p.sz!==1&&p.sz<4))continue;const d=R.u8(mem,p.dataAddr);if(d>0&&d<=real){const q=R.objectLinks(mem,d).parent;par[q]=(par[q]||0)+1;(exits[i]=exits[i]||[]).push(p.num+'>'+d);}}
 const top=Object.entries(par).sort((a,b)=>b[1]-a[1]);const rooms=+top[0][0];
 const holders=[],roomHolders=[];let nRooms=0;for(let i=1;i<=real;i++){const L=R.objectLinks(mem,i);if(L.parent===rooms)nRooms++;if(R.attr(L,bit)){const s=i+':'+R.shortName(mem,i)+' parent '+L.parent+':'+R.shortName(mem,L.parent);holders.push(s);if(L.parent===rooms||i===rooms)roomHolders.push(s);}}
 out[file]={bit,sha256:digest,exitDestParents:top.slice(0,3),ROOMS:rooms,nRooms,bitHolders:holders,roomsWithBit:roomHolders};
 if(process.argv[2]===file){for(const i in exits)console.log(i,R.shortName(mem,+i),exits[i].map(e=>e+':'+R.shortName(mem,+e.split('>')[1])).join(' | '))}
}
console.log(JSON.stringify(out,null,1));fs.writeFileSync(__dirname+'/rooms-check.json',JSON.stringify(out,null,1));
