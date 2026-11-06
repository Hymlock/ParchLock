// grok: Suspect U-cell radial read-back (wearable/edible/on/takeable/lightSource). usage: node <this> (cwd=repo). Read-only.
const fs=require('fs'),vm=require('vm'),crypto=require('crypto'),path=require('path');
const JS=path.join(process.cwd(),'js');
const src=fs.readFileSync(path.join(process.cwd(),'work/investigations/zil-titles/audit-r43/radial.cjs'),'utf8');
const load=new Function('require','process','JS','fs','vm','crypto','path',src.split('// Audit r43: Hollywood')[0].split('const JS=process.argv[2];')[1]+';return load;')(require,process,JS,fs,vm,crypto,path);
const t='Suspect.z3.js';let P=99;const E0={R:{shortName:()=>''}};

const E=load(t,P||1);const bit=(id,b)=>E.R.attr(E.R.objectBase?E.R.objectBase(E.R.header(E.mem),id):0,b);
const ids=process.argv.slice(2).map(Number);
console.log('player',P,E.R.shortName(E.mem,P));
for(const id of ids){const o=E.obj(id);const a=o.attrs||{};
 const pick=k=>a[k]===undefined?'-':(a[k]?1:0);
 const op=o.parentId;E.payload.inventory=[];E.payload.discoveredObjects=[o];const room=E.radial(id,'room');E.payload.discoveredObjects=[];E.setParent(id,P);E.payload.playerId=P;const o2=E.obj(id);E.payload.inventory=[o2];const inv=E.radial(id,'inventory');
 console.log(id,JSON.stringify(o.name),'takeable='+pick('takeable'),'static='+pick('static'),'wearable='+pick('wearable'),'worn='+pick('worn'),'edible='+pick('edible'),'on='+pick('on'),'switchable='+pick('switchable'),'lightSource='+pick('lightSource'),'| room',JSON.stringify(room),'| inv',JSON.stringify(inv));if(E.has(id,5)){E.setBit(id,5,0);E.payload.inventory=[E.obj(id)];console.log('   unworn(bit5=0) inv',JSON.stringify(E.radial(id,'inventory')),'worn='+E.obj(id).attrs.worn);E.setBit(id,5,1);}E.setParent(id,op);}
