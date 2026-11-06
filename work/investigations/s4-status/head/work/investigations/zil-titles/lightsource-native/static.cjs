// Static census (read-only): story bytes -> dictionary verbs + attribute bits of light carriers + census of LIGHTBIT/ONBIT holders.
const fs=require('fs');const SF=require('../../2026-10-11-zil-source-flags.json');
const T={'Enchanter.z3.js':[175,94],'Infidel.z3.js':[198,44,45,46,47,48,49],'Wishbringer.z3.js':[65],'TheWitness.z3.js':[48,159,53],'Cutthroats.z3.js':[116],'PlunderedHearts.z3.js':[9],'Deadline.z3.js':[50]};
const VERBS=/^(light|ignite|burn|strike|extinguis|extingui|blow|douse|snuff|turn|switch|kindle|unlight|put|out|on|off)$/;
const load=f=>{const s=fs.readFileSync('games/'+f,'utf8');return Buffer.from(s.match(/'([A-Za-z0-9+/=]+)'/)[1],'base64')};
const A0='abcdefghijklmnopqrstuvwxyz',A2=' \n0123456789.,!?_#\'"/\-:()';
function zstr(m,a){let out='',al=0,i=a;for(;;){const w=m.readUInt16BE(i);i+=2;const z=[(w>>10)&31,(w>>5)&31,w&31];for(const c of z){if(c===0)out+=' ';else if(c===4)al=1;else if(c===5)al=2;else if(c<4){}else{out+=al===0?A0[c-6]:al===1?A0[c-6].toUpperCase():(A2[c-6]||'?');al=0}}if(w&0x8000)break}return out}
for(const [f,ids] of Object.entries(T)){const m=load(f);const v=m[0];const dict=m.readUInt16BE(8);const ns=m[dict];const el=m[dict+ns+1];const n=m.readInt16BE(dict+ns+2);const base=dict+ns+4;const words=[];for(let i=0;i<n;i++)words.push(zstr(m,base+i*el).trim());
 const ot=m.readUInt16BE(10)+62;const ob=i=>ot+(i-1)*9;const attrs=i=>{const o=[];for(let b=0;b<32;b++)if(m[ob(i)+(b>>3)]&(128>>(b&7)))o.push(b);return o};const name=i=>{const pa=m.readUInt16BE(ob(i)+7);return m[pa]?zstr(m,pa+1):''};const parent=i=>m[ob(i)+4];
 const fl=(SF[f]||{}).flags||{};const pick=Object.entries(fl).filter(([k])=>/LIGHTBIT|ONBIT|FLAMEBIT|BURNBIT|LIGHT|FLAME/.test(k)).map(([k,x])=>k+'='+x.bit+(x.exact?' exact':' inexact')+' fp'+x.fp+' fn'+x.fn);
 console.log('##',f,'v'+v,'flags:',pick.join('; '));
 console.log('  dict hits:',words.filter(w=>VERBS.test(w)||/^(light|ignit|burn|strik|exting|blow|douse|snuff|unlit|kindl)/.test(w)).join(','));
 for(const i of ids)console.log('  obj',i,JSON.stringify(name(i)),'parent',parent(i),JSON.stringify(name(parent(i))),'attrs',attrs(i).join('.'));
 for(const [k,x] of Object.entries(fl).filter(([k])=>/^(LIGHTBIT|ONBIT|FLAMEBIT)$/.test(k))){const objs=[];for(let i=1;i<=255;i++){try{if(m[ob(i)+(x.bit>>3)]&(128>>(x.bit&7)))objs.push(i+':'+name(i))}catch(e){}}console.log('  holders',k,x.bit,objs.length,objs.filter(s=>!/^[0-9]+:[A-Z]/.test(s)).slice(0,30).join(' | '))}
}
