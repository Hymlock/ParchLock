// grok: Suspect U-cell radial read-back (wearable/edible/on/takeable/lightSource). usage: node <this> (cwd=repo). Read-only.
const fs=require('fs'),vm=require('vm'),crypto=require('crypto'),path=require('path');
const JS=path.join(process.cwd(),'js');
const src=fs.readFileSync(path.join(process.cwd(),'work/investigations/zil-titles/audit-r43/radial.cjs'),'utf8');
const load=new Function('require','process','JS','fs','vm','crypto','path',src.split('// Audit r43: Hollywood')[0].split('const JS=process.argv[2];')[1]+';return load;')(require,process,JS,fs,vm,crypto,path);
const t='Suspect.z3.js';let P=99;const E0={R:{shortName:()=>''}};

const E=load(t,P||1);const bit=(id,b)=>E.R.attr(E.R.objectBase?E.R.objectBase(E.R.header(E.mem),id):0,b);
const rows=[];let tab={};for(let id=1;id<=220;id++){let o;try{o=E.obj(id)}catch(e){break}const a=o.attrs;const anim=E.has(id,31);E.payload.inventory=[];E.payload.discoveredObjects=[o];const r=E.radial(id,'room');const k=`b22=${+E.has(id,22)} takeable=${+!!a.takeable} static=${+!!a.static} scenery=${+!!a.scenery} anim=${+anim} roomTake=${+r.includes('take')}`;(tab[k]=tab[k]||[]).push(id+':'+o.name);}
for(const k of Object.keys(tab))console.log(k,'n='+tab[k].length,tab[k].slice(0,8).join(', '));