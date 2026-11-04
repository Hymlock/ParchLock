// grok sherlock-find-1104 probe (READ-ONLY). usage: node <this> [TitlePrefix]  (cwd=repo)
// Compares HEAD js/ vs cand-js/ (variable-grammar FIND bytes kept + d214TakeAttribute admits variable family).
const fs=require('fs'),vm=require('vm'),crypto=require('crypto'),path=require('path');
const src=fs.readFileSync(path.join(process.cwd(),'work/investigations/zil-titles/audit-r43/radial.cjs'),'utf8');
const mk=JS=>new Function('require','process','JS','fs','vm','crypto','path',src.split('// Audit r43: Hollywood')[0].split('const JS=process.argv[2];')[1]+';return load;')(require,process,JS,fs,vm,crypto,path);
const loadH=mk(path.join(process.cwd(),'js')),loadC=mk(path.join(__dirname,'cand-js'));
const titles=['Zork1-TheGreatUndergroundEmpire.z3.js','Zork2-TheWizardofFrobozz.z3.js','Zork3-TheDungeonMaster.z3.js','Enchanter.z3.js','Sorcerer.z3.js','Spellbreaker.z3.js','Planetfall.z3.js','Stationfall.z3.js','Infidel.z3.js','Wishbringer.z3.js','Hitchhik.z5.js','Starcross.z3.js','TheLurkingHorror.z3.js','TheWitness.z3.js','Deadline.z3.js','Ballyhoo.z3.js','Moonmist.z3.js','Cutthroats.z3.js','Seastalker.z3.js','Suspect.z3.js','Suspended.z3.js','HollywoodHijinx.z3.js','LeatherGoddessesofPhobos.z3.js','PlunderedHearts.z3.js','Borderzo.z5.js','Sherlock.z5.js'];
const only=process.argv[2],ALL=process.env.ALL;
for(const t of titles){ if(only&&!t.startsWith(only))continue;
 const H0=loadH(t,1);const max=H0.R.header(H0.mem).version<=3?255:600;
 let n=0;for(let i=1;i<=max;i++){try{H0.R.shortName(H0.mem,i);n=i}catch(e){break}}
 let P=0;for(let i=1;i<=n;i++){if(/^(you|yourself|cretin|self|me|myself)$/i.test(H0.R.shortName(H0.mem,i))){P=i;break}}
 const H=loadH(t,P||1),C=loadC(t,P||1);
 const dec=(JS)=>{const bytes=Uint8Array.from(require(process.cwd()+'/work/investigations/zil-attr-analyzer.js').story(t));const mem=new DataView(bytes.buffer);const c=vm.createContext({console,window:{}});for(const f of ['ZRamReader','GrammarProvider'])vm.runInContext(fs.readFileSync(path.join(JS,f+'.js'),'utf8'),c);const G=vm.runInContext('GrammarProvider',c);const d=G.decodeD198(mem);const take=(d.templates||[]).filter(x=>x.verb==='take').map(x=>`${x.objectCount}o[${(x.prepositions||[]).join(',')}]a${x.actionId}f${JSON.stringify(x.findAttributes)}`);return {fam:d.family,cls:d.classification,ev:d.evidence,bit:G.d214TakeAttribute(mem),take};};
 const dh=dec(path.join(process.cwd(),'js')),dc=dec(path.join(__dirname,'cand-js'));
 const takeDiff=[],attrDiff={};
 for(let i=1;i<=n;i++){let lk;try{lk=H.R.objectLinks(H.mem,i);if(!lk)continue}catch(e){continue}
  for(const E of [H,C]){const o=E.obj(i);E.payload.inventory=[];E.payload.discoveredObjects=[o];}
  const a0=H.obj(i).attrs,a1=C.obj(i).attrs;for(const k of ['static','scenery','takeable'])if(!!a0[k]!==!!a1[k])attrDiff[k]=(attrDiff[k]||0)+1;
  let r0,r1;try{r0=H.radial(i,'room')}catch(e){r0=['ERR']}try{r1=C.radial(i,'room')}catch(e){r1=['ERR']}
  const t0=r0.some(v=>/^take\b/i.test(v)),t1=r1.some(v=>/^take\b/i.test(v));
  if(JSON.stringify(r0)!==JSON.stringify(r1))takeDiff.push({id:i,name:H.R.shortName(H.mem,i),parent:lk.parent,takeHead:t0,takeCand:t1,otherChange:JSON.stringify(r0.filter(v=>!/^take\b/i.test(v)))!==JSON.stringify(r1.filter(v=>!/^take\b/i.test(v)))});}
 console.log(`${t} | HEAD fam=${dh.fam} bit=${dh.bit} | CAND fam=${dc.fam} bit=${dc.bit} | radialDiffs=${takeDiff.length} attrDiff=${JSON.stringify(attrDiff)} objs=${n}`);
 if(only||ALL){console.log('  take templates HEAD:',dh.take.join(' ; '));console.log('  take templates CAND:',dc.take.join(' ; '));
  const lost=takeDiff.filter(x=>x.takeHead&&!x.takeCand),gained=takeDiff.filter(x=>!x.takeHead&&x.takeCand),other=takeDiff.filter(x=>x.otherChange);
  console.log(`  lostTake=${lost.length} gainedTake=${gained.length} otherVerbChanges=${other.length}`);
  for(const x of lost)console.log('   LOST',x.id,x.name,'parent',x.parent);for(const x of gained)console.log('   GAINED',x.id,x.name,'parent',x.parent);for(const x of other)console.log('   OTHER',x.id,x.name);
  if(dc.bit!=null){const keep=[];for(let i=1;i<=n;i++){try{if(C.has(i,dc.bit))keep.push(i+':'+C.R.shortName(C.mem,i))}catch(e){}}console.log(`  carriers of bit ${dc.bit} (${keep.length}):`,keep.join(', '));}}
}
