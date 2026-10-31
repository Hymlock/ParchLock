const fs=require('fs');const src=fs.readFileSync(process.argv[2],'utf8');const b=Buffer.from(src.match(/'([A-Za-z0-9+/=]+)'/)[1],'base64');
const w=a=>b[a]<<8|b[a+1];const abbr=w(0x18);
function zs(a){let out='',sh=0,ab=-1,esc=0,ec=0;const A=['abcdefghijklmnopqrstuvwxyz','ABCDEFGHIJKLMNOPQRSTUVWXYZ',' \n0123456789.,!?_#\'"/\-:()'];
 for(;;){const x=w(a);a+=2;for(const c of [(x>>10)&31,(x>>5)&31,x&31]){if(esc){if(esc==2){ec=c;esc=1}else{out+=String.fromCharCode(ec<<5|c);esc=0}continue}
 if(ab>=0){out+=zs(w(abbr+2*(32*ab+c))*2);ab=-1;continue}
 if(c==0)out+=' ';else if(c<4)ab=c-1;else if(c==4)sh=1;else if(c==5)sh=2;else{if(sh==2&&c==6){esc=2}else out+=A[sh][c-6];sh=0}}
 if(x&0x8000)return out}}
console.log('ver',b[0],'release',w(2),'serial',b.slice(0x12,0x18).toString(),'inform?',b.slice(0x3c,0x40).toString());
const ot=w(0x0a)+63*2;const n=parseInt(process.argv[3]||'250');
for(let i=1;i<=n;i++){const e=ot+(i-1)*14;const pt=w(e+12);if(pt<0x40||pt>b.length)break;const at=[];for(let k=0;k<48;k++)if(b[e+(k>>3)]&(0x80>>(k&7)))at.push(k);
 const nm=b[pt]?zs(pt+1):'';console.log(i,JSON.stringify(nm),'p',w(e+6),'attrs',at.join(','))}
