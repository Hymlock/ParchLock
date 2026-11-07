// Read-only: static object-table attribute exemplars for 17 no-name-table Inform titles.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const ROOT=path.resolve(__dirname,'../../../..');
const T=(process.env.T||'').split(',');
const P={clothing:2,container:4,door:5,edible:6,light:9,lockable:10,locked:11,on:13,open:14,openable:15,scenery:17,static:19,supporter:20,switchable:21,worn:24};
const PAT={door:/\b(door|gate|hatch|trapdoor|portcullis|grate|grating)\b/i,container:/\b(box|bag|chest|cupboard|drawer|sack|basket|case|cabinet|crate|safe|jar|bucket|trunk|wardrobe|locker|bin|tin|pocket|holdall|purse|wallet|fridge|refrigerator)\b/i,light:/\b(lamp|lantern|torch|candle|flashlight|match)\b/i,wear:/\b(coat|hat|cloak|jacket|gloves?|shirt|boots?|shoes?|dress|robe|scarf|trousers|mask|ring|overcoat|suit|cap|uniform)\b/i,edible:/\b(apple|bread|food|cake|sandwich|biscuit|cheese|banana|sweets?|chocolate|pie|orange|carrot|fruit|meat|bun|egg)\b/i,supporter:/\b(table|shelf|desk|bench|counter|altar|pedestal|bed|ledge|mantel|mantelpiece|plinth)\b/i};
const A2="abcdefghijklmnopqrstuvwxyz",A3=" \n0123456789.,!?_#'\"/\-:()";
function unblorb(b){if(b.toString('latin1',0,4)!=='FORM')return b;let p=12;while(p+8<=b.length){const id=b.toString('latin1',p,p+4),n=b.readUInt32BE(p+4);if(id==='ZCOD')return b.subarray(p+8,p+8+n);p+=8+n+(n&1);}}
function zs(b,a,abbr,depth=0){let out='',z=[];for(;;){const w=b.readUInt16BE(a);a+=2;z.push((w>>10)&31,(w>>5)&31,w&31);if(w&0x8000)break;}
 let al=0,i=0;while(i<z.length){const c=z[i++];if(al===3){out+=String.fromCharCode(c);al=0;continue}
  if(c===0){out+=' ';continue}if(c>=1&&c<=3){const x=z[i++];if(depth===0&&x!==undefined){const ad=b.readUInt16BE(abbr+2*(32*(c-1)+x))*2;out+=zs(b,ad,abbr,1);}continue}
  if(c===4){al=1;continue}if(c===5){al=2;continue}
  if(al===2&&c===6){const h=z[i++],l=z[i++];out+=String.fromCharCode(((h<<5)|l)&0xff);al=0;continue}
  out+=al===0?A2[c-6]:al===1?A2[c-6].toUpperCase():A3[c-6]||'?';al=0;}return out;}
const res={};
for(const t of T){const src=fs.readFileSync(ROOT+'/games/'+t+'.js','utf8');const b=unblorb(Buffer.from(src.match(/'([A-Za-z0-9+\/=]+)'/)[1],'base64'));
 const sha=crypto.createHash('sha256').update(b).digest('hex');
 const ot=b.readUInt16BE(0x0A),abbr=b.readUInt16BE(0x18),e0=ot+126;let firstProp=1e9;const objs=[];
 for(let n=1;;n++){const e=e0+(n-1)*14;if(e>=firstProp)break;const pa=b.readUInt16BE(e+12);if(pa<firstProp)firstProp=pa;
  const bits=[];for(let k=0;k<48;k++)if(b[e+(k>>3)]&(0x80>>(k&7)))bits.push(k);
  const nl=b[pa];let name='';try{name=nl?zs(b,pa+1,abbr):''}catch(_){}
  // property numbers present
  let q=pa+1+2*nl,props=[];for(let g=0;g<64;g++){const s=b[q];if(!s)break;let num,len,h;if(s&0x80){num=s&63;len=(b[q+1]&63)||64;h=2}else{num=s&63;len=(s&64)?2:1;h=1}props.push(num);q+=h+len;}
  objs.push({n,name,bits,parent:b.readUInt16BE(e+6),child:b.readUInt16BE(e+10),props});}
 res[t]={sha,objs};}
fs.writeFileSync(__dirname+'/raw.json',JSON.stringify(res));
for(const t of T){const o=res[t].objs;console.log('\n=== '+t+' '+res[t].sha.slice(0,12)+' objs='+o.length);
 for(const [k,re] of Object.entries(PAT)){const hits=o.filter(x=>re.test(x.name)).slice(0,6);for(const h of hits)console.log(k.padEnd(9),h.n,JSON.stringify(h.name),h.bits.join(','));}}
