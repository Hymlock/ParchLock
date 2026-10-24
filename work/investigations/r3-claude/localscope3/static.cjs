const A=require('../../zil-attr-analyzer.js'),crypto=require('crypto');
const F=require('../../2026-10-11-zil-source-flags.json');
const [S,P,H,L,I]=process.argv.slice(2).map((x,i)=>i?+x:x);
const m=A.story(S);const dig=crypto.createHash('sha256').update(m).digest('hex');
const u16=a=>m[a]<<8|m[a+1];const ot=u16(10);const base=ot+62;
const o=n=>base+(n-1)*9;const attr=(n,b)=>!!(m[o(n)+(b>>3)]&(0x80>>(b&7)));
const par=n=>m[o(n)+4],sib=n=>m[o(n)+5],ch=n=>m[o(n)+6],pt=n=>u16(o(n)+7);
const AL='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ \n0123456789.,!?_#\'"/\-:()';
function zs(a){let out='',sh=0,ab=u16(0x18),words=[];for(;;){const w=u16(a);a+=2;words.push((w>>10)&31,(w>>5)&31,w&31);if(w&0x8000)break;}
 let al=0;for(let i=0;i<words.length;i++){const c=words[i];if(sh){const idx=32*(sh-1)+c;sh=0;const ad=u16(ab+idx*2)*2;out+=zs(ad);continue;}
 if(c==0){out+=' ';continue}if(c<4){sh=c;continue}if(c<6){al=c-3;continue}
 if(al==2&&c==6){out+=String.fromCharCode(words[i+1]<<5|words[i+2]);i+=2;al=0;continue}
 out+=AL[al*26+c-6];al=0;}return out;}
const name=n=>{const a=pt(n);return m[a]?zs(a+1):''};
function props(n){let a=pt(n);a+=1+2*m[a];const r=[];while(m[a]){const s=m[a];r.push({num:s&31,sz:(s>>5)+1,d:a+1});a+=2+(s>>5);}return r;}
const max=Math.min(255,(u16(o(1)+7)-base)/9|0);
const fl=F[S].flags;const flags={};for(const k in fl)flags[k]={bit:fl[k].bit,exact:fl[k].exact};
const kids=[];for(let c=ch(H);c;c=sib(c))kids.push({id:c,name:name(c),invisible:attr(c,I)});
const rooms=[];for(let n=1;n<=max;n++){const p=props(n).find(x=>x.num===P);if(!p)continue;const ids=[];for(let i=0;i<p.sz;i++)ids.push(m[p.d+i]);
 rooms.push({id:n,name:name(n),lit:attr(n,L),lg:ids.map(i=>i+':'+name(i)+(par(i)===H?'':'(par'+par(i)+')'))});}
const dark=[];
console.log(JSON.stringify({story:S,digest:dig,flags,holder:{id:H,name:name(H)},kids,rooms},null,1));
