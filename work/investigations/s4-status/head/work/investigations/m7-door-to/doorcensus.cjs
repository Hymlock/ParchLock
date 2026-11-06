const fs=require('fs'),vm=require('vm');const c={console,window:{}};vm.createContext(c);vm.runInContext(fs.readFileSync(process.cwd()+'/js/ZRamReader.js','utf8'),c);const R=vm.runInContext('ZRamReader',c);
const inv=require(process.cwd()+'/work/investigations/zil-titles/grok-lane-1031/inform-plan/inventory.json');const rows=Array.isArray(inv)?inv:inv.titles;
let tot={titles:0,doors:0,obj:0,routine:0,other:0};const per=[];
for(const r of rows){if(!/^z/.test(r.vm||''))continue;let raw;try{raw=fs.readFileSync(process.cwd()+'/games/'+r.file,'utf8')}catch(e){continue}const m=raw.match(/processBase64Zcode\s*\(\s*['"]([\s\S]*?)['"]\s*\)/);if(!m)continue;const b=Buffer.from(m[1].replace(/\s+/g,''),'base64');const mem=new DataView(b.buffer,b.byteOffset,b.length);
let t;try{t=R.informPropertyNames(mem)}catch(e){continue}const dt=t&&t.names&&t.names.door_to;if(dt==null)continue;tot.titles++;const h=R.header(mem),n=R.objectCount(mem,h);let d=0,o=0,ro=0,ot=0;
for(let id=1;id<=n;id++){let ps;try{ps=R.listProps(mem,id)||[]}catch(e){continue}const q=ps.find(x=>x.num===dt);if(!q)continue;d++;if(q.sz===2){const v=R.u16(mem,q.dataAddr);if(v>0&&v<=n)o++;else ro++;}else ot++;}
tot.doors+=d;tot.obj+=o;tot.routine+=ro;tot.other+=ot;if(d)per.push(r.title+' '+d+'/'+o);}
console.log(JSON.stringify(tot));console.log(per.slice(0,40).join(' | '));

