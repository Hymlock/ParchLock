// grok: Suspect U-cell radial read-back (wearable/edible/on/takeable/lightSource). usage: node <this> (cwd=repo). Read-only.
const fs=require('fs'),vm=require('vm'),crypto=require('crypto'),path=require('path');
const JS=path.join(process.cwd(),'js');
const src=fs.readFileSync(path.join(process.cwd(),'work/investigations/zil-titles/audit-r43/radial.cjs'),'utf8');
const load=new Function('require','process','JS','fs','vm','crypto','path',src.split('// Audit r43: Hollywood')[0].split('const JS=process.argv[2];')[1]+';return load;')(require,process,JS,fs,vm,crypto,path);
const t='Suspect.z3.js';let P=99;const E0={R:{shortName:()=>''}};

const E=load(t,P||1);const bit=(id,b)=>E.R.attr(E.R.objectBase?E.R.objectBase(E.R.header(E.mem),id):0,b);
const A=E.A;for(const k of ['on','switchable','lightSource','edible','wearable','clothing','static','scenery','takeable','worn'])console.log(k,'bitFor=',A.bitFor(k,E.mem));
for(const id of [96,93,84,190,94,95]){const bits=[];for(let b=0;b<32;b++)if(E.has(id,b))bits.push(b);const o=E.obj(id);console.log(id,o.name,'bits',bits.join(','),'on='+o.attrs.on,'switchable='+o.attrs.switchable);}