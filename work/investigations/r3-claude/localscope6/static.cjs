// Usage: node static.cjs <Story> <prop> <holder> <litBit> <invisibleBit|-1> <width>
// Same as localscope3/static.cjs, generalised to v5 object layout and 2-byte ids.
const A=require('../../zil-attr-analyzer.js'),crypto=require('crypto');
const F=require('../../2026-10-11-zil-source-flags.json');
const [S,P,H,L,I,W]=process.argv.slice(2).map((x,i)=>i?+x:x);
const m=A.story(S);const dig=crypto.createHash('sha256').update(m).digest('hex');
const v=m[0],u16=a=>m[a]<<8|m[a+1];const ot=u16(10);
const ES=v>3?14:9,base=ot+(v>3?126:62),AB=v>3?6:4;
const o=n=>base+(n-1)*ES;const attr=(n,b)=>b>=0&&!!(m[o(n)+(b>>3)]&(0x80>>(b&7)));
const lk=(n,k)=>v>3?u16(o(n)+AB+2*k):m[o(n)+AB+k];
const par=n=>lk(n,0),sib=n=>lk(n,1),ch=n=>lk(n,2),pt=n=>u16(o(n)+ES-2);
const AL='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ \n0123456789.,!?_#\'"/\-:()';
function zs(a,d=0){let out='',sh=0,ab=u16(0x18),words=[];for(;;){const w=u16(a);a+=2;words.push((w>>10)&31,(w>>5)&31,w&31);if(w&0x8000)break;}
 let al=0;for(let i=0;i<words.length;i++){const c=words[i];if(sh){const idx=32*(sh-1)+c;sh=0;if(d<2)out+=zs(u16(ab+idx*2)*2,d+1);continue;}
 if(c==0){out+=' ';continue}if(c<4){sh=c;continue}if(c<6){al=c-3;continue}
 if(al==2&&c==6){out+=String.fromCharCode(words[i+1]<<5|words[i+2]);i+=2;al=0;continue}
 out+=AL[al*26+c-6];al=0;}return out;}
const name=n=>{const a=pt(n);return m[a]?zs(a+1):''};
function props(n){let a=pt(n);a+=1+2*m[a];const r=[];
 while(m[a]){const s=m[a];if(v>3){if(s&0x80){let z=m[a+1]&63||64;r.push({num:s&63,sz:z,d:a+2});a+=2+z;}else{const z=s&64?2:1;r.push({num:s&63,sz:z,d:a+1});a+=1+z;}}
 else{r.push({num:s&31,sz:(s>>5)+1,d:a+1});a+=2+(s>>5);}}return r;}
const max=Math.min(v>3?2000:255,(u16(o(1)+ES-2)-base)/ES|0);
const fl=(F[S]||{}).flags||{};const flags={};for(const k in fl)flags[k]={bit:fl[k].bit,exact:fl[k].exact};
const kids=[];for(let c=ch(H);c;c=sib(c))kids.push({id:c,name:name(c),invisible:I<0?null:attr(c,I),attrs:[...Array(v>3?48:32).keys()].filter(b=>attr(c,b))});
const rooms=[];for(let n=1;n<=max;n++){const p=props(n).find(x=>x.num===P);if(!p)continue;const ids=[];for(let i=0;i<p.sz;i+=W)ids.push(W==2?u16(p.d+i):m[p.d+i]);
 rooms.push({id:n,name:name(n),parent:par(n),lit:attr(n,L),sz:p.sz,lg:ids.map(i=>i+':'+(i&&i<=max?name(i):'?')+(i&&i<=max&&par(i)===H?'':'(par'+(i<=max?par(i):'?')+')'))});}
for(const k of kids)k.listedBy=rooms.filter(r=>r.lg.some(x=>x.startsWith(k.id+':')&&!x.includes('(par'))).map(r=>r.id+(r.lit?'L':'d'));
console.log(JSON.stringify({story:S,version:v,digest:dig,flags,holder:{id:H,name:name(H)},kids,rooms},null,1));
