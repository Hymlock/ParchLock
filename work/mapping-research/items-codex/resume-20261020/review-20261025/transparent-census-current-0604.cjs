const fs=require('fs'),path=require('path');
const root='C:/Users/hymlo/Downloads/Projects/Parchmap-main/Parchmap-main/games/';
const [file,bitS]=process.argv.slice(2);const bit=+bitS;
const src=fs.readFileSync(root+file,'utf8');const m=src.match(/[A-Za-z0-9+\/]{5000,}={0,2}/);const b=Buffer.from(m[0],'base64');
const w=a=>b.readUInt16BE(a);const ver=b[0];if(ver>3)throw 'v'+ver;
const ot=w(0x0a),ab=w(0x18);const objs=ot+62;
const A2=' \n0123456789.,!?_#\'"/\\-:()';
function zs(a){let out='',sh=0,abbr=0,esc=-1,ec=0;const al=['abcdefghijklmnopqrstuvwxyz','ABCDEFGHIJKLMNOPQRSTUVWXYZ',A2];for(;;){const x=w(a);a+=2;for(const c of [(x>>10)&31,(x>>5)&31,x&31]){if(esc>=0){if(esc===0){ec=c<<5;esc=1}else{out+=String.fromCharCode(ec|c);esc=-1}continue}if(abbr){out+=zs(w(ab+((abbr-1)*32+c)*2)*2);abbr=0;continue}if(c===0)out+=' ';else if(c<4)abbr=c;else if(c<6)sh=c-3;else{if(sh===2&&c===6){esc=0;sh=0;continue}out+=al[sh][c-6];sh=0}}if(x&0x8000)break}return out}
const first=w(objs+7);const n=(first-objs)/9;const res=[];
for(let i=1;i<=n;i++){const e=objs+(i-1)*9;const at=b.readUInt32BE(e);const bits=[];for(let k=0;k<32;k++)if(at&(1<<(31-k)))bits.push(k);const pt=w(e+7);const nm=b[pt]?zs(pt+1):'';if(bits.includes(bit))res.push(i+' "'+nm+'" parent '+b[e+4]+' bits ['+bits+']')}
console.log(file,'bit',bit,'objects',n,'carriers',res.length);console.log(res.join('\n'));
