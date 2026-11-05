// M7 R2 condition 3: census re-run excluding alias-layout titles (door_to shares a
// compass property number, e.g. Vacation door_to = n_to = 7), plus the count of door
// objects that the implemented ZRamReader.doorToHint actually accepts.
//   node work/investigations/m7-door-to/doorcensus-r2.cjs
const fs=require('fs'),vm=require('vm');
const inv=require(process.cwd()+'/work/investigations/zil-titles/grok-lane-1031/inform-plan/inventory.json');const rows=Array.isArray(inv)?inv:inv.titles;
const DIRS=['n_to','s_to','e_to','w_to','ne_to','nw_to','se_to','sw_to','u_to','d_to','in_to','out_to'];
let tot={titles:0,aliasExcluded:[],doors:0,obj:0,routine:0,other:0,hintDoors:0,hintTitles:0};const per=[];
for(const r of rows){if(!/^z/.test(r.vm||''))continue;let raw;try{raw=fs.readFileSync(process.cwd()+'/games/'+r.file,'utf8')}catch(e){continue}
 const m=raw.match(/processBase64Zcode\s*\(\s*['"]([\s\S]*?)['"]\s*\)/);if(!m)continue;const b=Buffer.from(m[1].replace(/\s+/g,''),'base64');const mem=new DataView(b.buffer,b.byteOffset,b.length);
 const c={console,window:{},ZRamProvider:{getMem:()=>mem}};vm.createContext(c);for(const f of ['AttributeSchema','ZRamReader'])vm.runInContext(fs.readFileSync(process.cwd()+'/js/'+f+'.js','utf8'),c);const R=vm.runInContext('ZRamReader',c);
 let t;try{t=R.informPropertyNames(mem)}catch(e){continue}const dt=t&&t.names&&t.names.door_to;if(dt==null)continue;
 if(DIRS.some(k=>t.names[k]===dt)){tot.aliasExcluded.push(r.title);continue;}
 tot.titles++;const h=R.header(mem),n=R.objectCount(mem,h);let d=0,o=0,ro=0,ot=0,hd=0;
 for(let id=1;id<=n;id++){let ps;try{ps=R.listProps(mem,id)||[]}catch(e){continue}const q=ps.find(x=>x.num===dt);if(!q)continue;d++;
  if(q.sz===2){const v=R.u16(mem,q.dataAddr);if(v>0&&v<=n)o++;else ro++;}else ot++;
  // hint accepted from at least one side (roomId 0 = no current-room exclusion)
  if(R.doorToHint(mem,id,0))hd++;}
 tot.doors+=d;tot.obj+=o;tot.routine+=ro;tot.other+=ot;tot.hintDoors+=hd;if(hd)tot.hintTitles++;if(d)per.push(r.title+' '+d+'/'+o+'/'+hd);}
console.log(JSON.stringify(tot));console.log('title doors/static/hint: '+per.join(' | '));
