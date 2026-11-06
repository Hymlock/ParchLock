// Read-only census: Inform attribute-name tables per non-ZIL game.
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'../../..');
const ctx={console};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(ROOT+'/js/ZRamReader.js','utf8')+';this.ZRamReader=ZRamReader;',ctx);
const AS=fs.readFileSync(ROOT+'/js/AttributeSchema.js','utf8');vm.runInContext(AS+';this.AttributeSchema=AttributeSchema;',ctx);
const Z=ctx.ZRamReader,PROFILE=ctx.AttributeSchema.PROFILE;
const zil=new Set(Object.keys(JSON.parse(fs.readFileSync(ROOT+'/work/investigations/2026-10-11-zil-source-flags.json','utf8'))));
const rel=new Set([...fs.readFileSync(ROOT+'/GAMES_INCLUDED.md','utf8').matchAll(/`games\/([^`]+)`/g)].map(m=>m[1]));
const STD=['open','openable','container','door','locked','lockable','light','edible','clothing','worn','scenery','static','supporter','enterable','transparent','switchable','on','animate','talkable','concealed'];
function unblorb(b){if(b.toString('latin1',0,4)!=='FORM')return {b};let p=12;while(p+8<=b.length){const id=b.toString('latin1',p,p+4),n=b.readUInt32BE(p+4);if(id==='ZCOD'||id==='GLUL')return {b:b.subarray(p+8,p+8+n),chunk:id};p+=8+n+(n&1);}return {b:null};}
const rows=[];
for(const f of fs.readdirSync(ROOT+'/games').filter(f=>/\.(z5|z8|zblorb|gblorb)\.js$/.test(f)).sort()){
 const key=f.replace(/\.js$/,''),base=key.replace(/\.[^.]+$/,'');
 if(zil.has(key)||zil.has(base)||zil.has(f))continue;
 const t=fs.readFileSync(ROOT+'/games/'+f,'utf8');const m=t.match(/'([A-Za-z0-9+\/=]+)'/);
 let r={game:f,release:rel.has(f)?'Y':'',kind:'',version:'',compiler:'',inform:'',names:0,std:0,missingStd:'',matchesProfile:'',group:'d-unknown'};
 try{const u=unblorb(Buffer.from(m[1],'base64'));const b=u.b;
  if(b.toString('latin1',0,4)==='Glul'){r.kind='glulx';r.version=b.readUInt32BE(4).toString(16);r.group='c-glulx';
   const s=b.toString('latin1');r.compiler=/Inform 7/.test(s)?'I7-string':(/I7|Inform/.test(s)?'Inform-string':'');rows.push(r);continue;}
  r.kind='zcode';r.version=b[0];r.compiler=b.toString('latin1',0x3C,0x40).replace(/[^\x20-\x7e]/g,'.');
  const mem=new DataView(b.buffer,b.byteOffset,b.byteLength);
  if(zil.has(key)) continue;
  r.inform=Z.isInformCompiled(mem)?'Y':'N';
  const n=Z.informAttributeNames(mem);
  if(n&&n.bits){const names=Object.keys(n.bits);r.names=names.length;const have=STD.filter(s=>s in n.bits);r.std=have.length;r.missingStd=STD.filter(s=>!(s in n.bits)).join(' ');
   let mm=0,tot=0;for(const k of names){if(typeof PROFILE[k]==='number'){tot++;if(PROFILE[k]!==n.bits[k])mm++;}}r.matchesProfile=`${tot-mm}/${tot}`;
   r.group=r.std>=15?'a-names-std':'a2-names-nonstd';}
  else r.group=r.inform==='Y'?'b-inform-no-names':'d-unknown';
 }catch(e){r.group='d-error:'+e.message.slice(0,40);}
 rows.push(r);}
const cols=Object.keys(rows[0]);fs.writeFileSync(__dirname+'/census.csv',[cols.join(',')].concat(rows.map(r=>cols.map(c=>String(r[c]).replace(/,/g,';')).join(','))).join('\n'));
const g={};for(const r of rows){g[r.group]=g[r.group]||[0,0];g[r.group][0]++;if(r.release)g[r.group][1]++;}
console.log(JSON.stringify(g));console.log(rows.filter(r=>!r.group.startsWith('a-')&&r.group!=='c-glulx').map(r=>`${r.game} ${r.release} ${r.compiler} ${r.inform} ${r.group} ${r.names}`).join('\n'));
const a=rows.filter(r=>r.group==='a-names-std');console.log('profile mismatch in a:',a.filter(r=>{const[x,y]=r.matchesProfile.split('/');return x!==y}).map(r=>r.game+' '+r.matchesProfile).join('; '));
console.log('missing std tally:',JSON.stringify(a.reduce((o,r)=>{for(const s of r.missingStd.split(' ').filter(Boolean))o[s]=(o[s]||0)+1;return o},{})));
console.log('compilers:',JSON.stringify(rows.reduce((o,r)=>{o[r.compiler]=(o[r.compiler]||0)+1;return o},{})));
