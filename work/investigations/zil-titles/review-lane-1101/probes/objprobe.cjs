// grok-review read-only probe: object short names, attributes, parent from original story bytes.
// usage: node objprobe.cjs <Game.z3.js> <id,id,...|all> [attr]
const A=require(process.cwd()+'/work/investigations/zil-attr-analyzer.js');
const [game,ids,attrQ]=process.argv.slice(2);
const b=Uint8Array.from(A.story(game));const v=b[0];
const w=a=>(b[a]<<8)|b[a+1];
const abbr=w(0x18),obj=w(0x0a);
const A2=' \n0123456789.,!?_#\'"/\\-:()';
function zs(a){let out='',alph=0,shift=-1,abbrN=-1,zc=[];for(;;){const x=w(a);a+=2;zc.push((x>>10)&31,(x>>5)&31,x&31);if(x&0x8000)break;}
 for(let i=0;i<zc.length;i++){const c=zc[i];
  if(abbrN>=0){const ad=w(abbr+2*(32*(abbrN-1)+c))*2;out+=zs(ad);abbrN=-1;continue;}
  if(shift===-2){ // 10-bit
   const hi=c,lo=zc[++i];out+=String.fromCharCode((hi<<5)|lo);shift=-1;continue;}
  if(c===0){out+=' ';continue;}
  if(c<=3){abbrN=c;continue;}
  if(c===4||c===5){shift=c-3;continue;}
  const al=shift>0?shift:0;shift=-1;
  if(al===2&&c===6){shift=-2;continue;}
  out+=al===0?String.fromCharCode(97+c-6):al===1?String.fromCharCode(65+c-6):A2[c-6];}
 return out;}
const big=v>3,es=big?14:9,base=obj+(big?126:62),nattr=big?48:32;
function O(n){const e=base+(n-1)*es;const attrs=[];for(let i=0;i<nattr;i++)if(b[e+(i>>3)]&(0x80>>(i&7)))attrs.push(i);
 const par=big?w(e+6):b[e+4],sib=big?w(e+8):b[e+5],ch=big?w(e+10):b[e+6],pa=w(e+(big?12:7));
 const name=b[pa]?zs(pa+1):'';return {n,name,par,sib,ch,attrs};}
const count=Math.min(Math.floor((w(e0())-base)/es),2000);function e0(){return base+(big?12:7);}
let list=ids==='all'?Array.from({length:count},(_,i)=>i+1):ids.split(',').map(Number);
for(const n of list){const o=O(n);if(attrQ!==undefined&&!o.attrs.includes(+attrQ))continue;
 console.log(n+'\t'+JSON.stringify(o.name)+'\tparent='+o.par+'('+(o.par?JSON.stringify(O(o.par).name):'')+')\tattrs='+o.attrs.join(','));}
