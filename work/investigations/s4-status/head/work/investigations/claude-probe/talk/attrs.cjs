// static object-table attribute dump from the story file (v3), for one or more bits
const fs=require('fs');const [g,...bits]=process.argv.slice(2);
const s=fs.readFileSync('games/'+g,'utf8');const b=Buffer.from(s.match(/processBase64Zcode\('([^']+)'/)[1],'base64');
const w=a=>b.readUInt16BE(a);const ot=w(0x0a);const base=ot+62;
const name=i=>{const e=base+(i-1)*9;const pa=w(e+7);const len=b[pa];let out='',a=pa+1;const A=['abcdefghijklmnopqrstuvwxyz',"ABCDEFGHIJKLMNOPQRSTUVWXYZ",' \n0123456789.,!?_#\'"/\-:()'];let al=0,zs=[];for(let k=0;k<len;k++){const x=w(a);a+=2;zs.push((x>>10)&31,(x>>5)&31,x&31);}
for(let k=0;k<zs.length;k++){const z=zs[k];if(z===0)out+=' ';else if(z===4)al=1;else if(z===5)al=2;else if(z<4){k++;out+='~';}else{if(al===2&&z===6){out+='?';k+=2;}else out+=A[al][z-6];al=0;}}return out;};
const attr=(i,bt)=>(b[base+(i-1)*9+(bt>>3)]>>(7-(bt&7)))&1;
for(const bt of bits.map(Number)){const l=[];for(let i=1;i<=255;i++){if(base+(i-1)*9+9>w(base+7))break;if(attr(i,bt))l.push(i+':'+name(i));}console.log('bit',bt,l.length,l.join(' | '));}
