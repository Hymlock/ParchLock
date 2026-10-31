// grok: read-only object/attribute dump for an Inform Z story (v4+). node objdump.cjs <file> [bits...]
const A=require(process.cwd()+'/work/investigations/zil-attr-analyzer.js');
const m=Buffer.from(A.story(process.argv[2]));const v=m[0];const u16=a=>m.readUInt16BE(a);
const abbr=u16(0x18);const alph=['abcdefghijklmnopqrstuvwxyz','ABCDEFGHIJKLMNOPQRSTUVWXYZ',' \n0123456789.,!?_#\'"/\\-:()'];
function zs(a,depth=0){let out='',sh=0,zs=[];for(;;){const w=u16(a);a+=2;zs.push((w>>10)&31,(w>>5)&31,w&31);if(w&0x8000)break;}
 for(let i=0;i<zs.length;i++){const c=zs[i];if(sh>=10){/*abbr*/const ad=u16(abbr+2*(32*(sh-10)+c))*2;if(depth<2)out+=zs_(ad,depth+1);sh=0;continue;}
  if(c===0){out+=' ';continue;}if(c>=1&&c<=3){sh=10+c-1;continue;}if(c===4){sh=1;continue;}if(c===5){sh=2;continue;}
  if(sh===2&&c===6){const z=(zs[i+1]<<5)|zs[i+2];i+=2;out+=String.fromCharCode(z);sh=0;continue;}
  out+=alph[sh][c-6];sh=0;}return out;}
function zs_(a,d){return zs(a,d);}
const ot=u16(0x0A);const base=ot+63*2;const firstProp=u16(base+12);const n=(firstProp-base)/14|0;
const want=process.argv.slice(3).map(Number);const objs=[];
for(let i=1;i<=n;i++){const e=base+(i-1)*14;const bits=[];for(let b=0;b<48;b++)if(m[e+(b>>3)]&(0x80>>(b&7)))bits.push(b);
 const pa=u16(e+12);const nm=m[pa]?zs(pa+1):'';objs.push({i,p:u16(e+6),c:u16(e+10),nm,bits});}
for(const o of objs){if(want.length&&!want.some(b=>o.bits.includes(b)))continue;console.log(o.i,'p'+o.p,JSON.stringify(o.nm),o.bits.join(','));}
console.log('objects',n,'version',v);
