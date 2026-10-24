// node scan.cjs <Story> <width>: for each property number, count room-like objects whose prop values (ids) share one parent.
const A=require('../../zil-attr-analyzer.js');const [S,W]=[process.argv[2],+process.argv[3]];
const m=A.story(S),v=m[0],u16=a=>m[a]<<8|m[a+1],ot=u16(10),ES=v>3?14:9,base=ot+(v>3?126:62),AB=v>3?6:4;
const o=n=>base+(n-1)*ES,lk=(n,k)=>v>3?u16(o(n)+AB+2*k):m[o(n)+AB+k],par=n=>lk(n,0),pt=n=>u16(o(n)+ES-2);
const max=Math.min(v>3?2000:255,(u16(o(1)+ES-2)-base)/ES|0);
function props(n){let a=pt(n);a+=1+2*m[a];const r=[];while(m[a]){const s=m[a];if(v>3){if(s&0x80){let z=m[a+1]&63||64;r.push({num:s&63,sz:z,d:a+2});a+=2+z;}else{const z=s&64?2:1;r.push({num:s&63,sz:z,d:a+1});a+=1+z;}}else{r.push({num:s&31,sz:(s>>5)+1,d:a+1});a+=2+(s>>5);}}return r;}
const st={};for(let n=1;n<=max;n++)for(const p of props(n)){if(p.sz%W)continue;const ids=[];for(let i=0;i<p.sz;i+=W)ids.push(W==2?u16(p.d+i):m[p.d+i]);if(ids.some(i=>!i||i>max))continue;
 const s=st[p.num]||(st[p.num]={objs:0,par:{}});s.objs++;for(const i of ids)s.par[par(i)]=(s.par[par(i)]||0)+1;}
for(const k in st){const t=Object.entries(st[k].par).sort((a,b)=>b[1]-a[1]).slice(0,3);console.log('prop',k,'objs',st[k].objs,'topParents',JSON.stringify(t));}
