// I7 static anchor proof: test the I6 linklpa PROFILE (and whole-block shifts k) against each game's own initial object table.
// Anchors (I6 library source): selfobj "yourself" has animate concealed proper transparent; compass directions have scenery;
// structural: non-room objects with children carry container|supporter|animate|transparent; open implies openable or door; worn implies clothing.
const fs=require('fs'),vm=require('vm');const root=process.cwd();const story=require(root+'/work/investigations/zil-attr-analyzer.js').story;
const P={animate:0,clothing:2,concealed:3,container:4,door:5,light:9,open:14,openable:15,proper:16,scenery:17,supporter:20,transparent:23,worn:26};
function run(file){
  const bytes=Uint8Array.from(story(file)),mem=new DataView(bytes.buffer);
  const c=vm.createContext({console:{log(){},warn(){}},window:{},document:{readyState:'loading',addEventListener(){}},UndoRestoreSync:{generation:1},ModuleLibrary:{currentExecutableDigest:()=>'x',currentExecutableIdentity:()=>({})},ZRamProvider:{getMem:()=>mem}});
  vm.runInContext(fs.readFileSync(root+'/js/ZRamReader.js','utf8'),c);const R=c.ZRamReader,h=R.header(mem),n=R.objectCount(mem,h),nb=h.version<=3?32:48;
  const O=[];for(let i=1;i<=n;i++){const L=R.objectLinks(mem,i);if(!L)break;let name='';try{name=String(R.shortName(mem,i)||'');}catch(e){}
    const bits=new Set();L.attrBytes.forEach((b,j)=>{for(let k=0;k<8;k++)if(b&(0x80>>k))bits.add(j*8+k);});O.push({i,name:name.toLowerCase(),p:L.parent,c:L.child,bits});}
  const best=[];
  for(let k=0;k+26<nb;k++){const b=f=>P[f]+k,has=(o,f)=>o.bits.has(b(f));let ok=0,bad=0,notes=[];
    const self=O.filter(o=>/^(yourself|your former self|you)$/.test(o.name));
    for(const o of self)for(const f of ['animate','transparent'])has(o,f)?ok++:(bad++,notes.push('self!'+f));
    const dirs=O.filter(o=>/^(north|south|east|west|up|down|northeast|northwest|southeast|southwest|in|out)( wall)?$/.test(o.name)||/^the (north|south|east|west) wall$/.test(o.name));
    let dS=dirs.filter(o=>has(o,'scenery')).length;ok+=dS;bad+=dirs.length-dS;if(dirs.length-dS)notes.push('dirs scenery '+dS+'/'+dirs.length);
    const holders=O.filter(o=>o.p&&o.c&&!self.includes(o));let hk=holders.filter(o=>['container','supporter','animate','transparent'].some(f=>has(o,f))).length;ok+=hk;bad+=holders.length-hk;if(holders.length-hk)notes.push('holders '+hk+'/'+holders.length);
    const op=O.filter(o=>has(o,'open'));let opk=op.filter(o=>has(o,'openable')||has(o,'door')||has(o,'container')).length;ok+=opk;bad+=op.length-opk;if(op.length-opk)notes.push('open '+opk+'/'+op.length);
    const wn=O.filter(o=>has(o,'worn'));let wk=wn.filter(o=>has(o,'clothing')).length;ok+=wk;bad+=wn.length-wk;if(wn.length-wk)notes.push('worn '+wk+'/'+wn.length);
    const lit=O.filter(o=>!o.p&&has(o,'light')).length;
    best.push({k,ok,bad,lit,self:self.length,dirs:dirs.length,holders:holders.length,notes:notes.join('; ')});}
  best.sort((a,b)=>(a.bad-b.bad)||(b.ok-a.ok));return{file,v:h.version,n,best:best.slice(0,2)};
}
const o=JSON.parse(fs.readFileSync(root+'/work/investigations/inform-all/coverage.json','utf8'));
const files=process.argv[2]?process.argv.slice(2):o.nonzil.filter(r=>r.unmapped.length).map(r=>r.file);
const res=[];for(const f of files){try{const r=run(f);res.push(r);const a=r.best[0],b=r.best[1];
  console.log(f.padEnd(22),'v'+r.v,'best k='+a.k,'ok='+a.ok,'bad='+a.bad,'lit='+a.lit,'self='+a.self,'dirs='+a.dirs,'hold='+a.holders,a.notes?'['+a.notes+']':'','| next k='+b.k+' ok='+b.ok+' bad='+b.bad);}catch(e){console.log(f,'ERR',e.message);}}
fs.writeFileSync(root+'/work/investigations/inform-all/anchors.json',JSON.stringify(res,null,1));
