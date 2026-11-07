// Anchor classifier: compass (concealed), direction walls (scenery), yourself (animate,concealed,proper,transparent), rooms (light).
const r=require('./raw.json');
const LAY={PROFILE:{animate:0,concealed:3,proper:16,scenery:17,transparent:23,light:9},L:{animate:0,concealed:2,proper:16,scenery:17,transparent:23,light:9},
 TOY:{animate:0,concealed:2,proper:17,scenery:18,transparent:24,light:10},WIN:{animate:1,concealed:3,proper:18,scenery:19,transparent:25,light:11},TH:{animate:2,concealed:4,proper:18,scenery:19,transparent:25,light:11}};
const out={};
for(const [t,{sha,objs}] of Object.entries(r)){
  const by=re=>objs.filter(o=>re.test(o.name));
  const compass=by(/^compass$/i),walls=by(/^(the )?(north|south|east|west|up|down|northeast|northwest|southeast|southwest|ceiling|floor|ground|sky|inside|outside|in|out)( wall)?$/i),self=by(/^(yourself|your former self)$/i);
  const rooms=objs.filter(o=>!o.parent&&o.name&&!/^compass$/i.test(o.name));
  const common=(set)=>{if(!set.length)return null;let c=set[0].bits.slice();for(const o of set)c=c.filter(b=>o.bits.includes(b));return c;};
  const a={compass:compass.map(o=>o.bits),walls:common(walls),self:self.map(o=>o.bits),roomLight:{}};
  rooms.forEach(o=>o.bits.forEach(b=>a.roomLight[b]=(a.roomLight[b]||0)+1));
  const score={};for(const [L,m] of Object.entries(LAY)){let ok=0,bad=0;
    if(compass.length)compass[0].bits.includes(m.concealed)?ok++:bad++;
    if(a.walls)a.walls.includes(m.scenery)?ok++:bad++;
    for(const s of self)for(const f of ['animate','proper','transparent'])s.bits.includes(m[f])?ok++:bad++;
    const top=Object.entries(a.roomLight).sort((x,y)=>y[1]-x[1])[0];if(top)(+top[0]===m.light)?ok++:bad++;
    score[L]=ok+'/'+(ok+bad);}
  const best=Object.entries(score).filter(([L,s])=>{const[o,n]=s.split('/');return n>0&&o===n;}).map(x=>x[0]);
  out[t]={best,score,anchors:{compass:a.compass,walls:a.walls,self:a.self,roomTop:Object.entries(a.roomLight).sort((x,y)=>y[1]-x[1]).slice(0,3)},n:objs.length};
  console.log(t.padEnd(18),('['+best.join(',')+']').padEnd(14),JSON.stringify(score),'compass',JSON.stringify(a.compass),'walls',JSON.stringify(a.walls),'self',JSON.stringify(a.self),'rooms',JSON.stringify(out[t].anchors.roomTop));
}
require('fs').writeFileSync(__dirname+'/classify.json',JSON.stringify(out,null,1));
