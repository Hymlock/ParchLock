// grok leak-census-1104 (READ-ONLY). usage: node <this> (cwd=repo). For each ZIL title: which non-structural flags
// resolve via I6 PROFILE fallback (no attributeMap entry), and which composed radials change if that flag fails closed.
const fs=require('fs'),vm=require('vm'),crypto=require('crypto'),path=require('path');
const JS=path.join(process.cwd(),'js');
const src=fs.readFileSync(path.join(__dirname,'../../audit-r43/radial.cjs'),'utf8');
const load=new Function('require','process','JS','fs','vm','crypto','path',src.split('// Audit r43: Hollywood')[0].split('const JS=process.argv[2];')[1]+';return load;')(require,process,JS,fs,vm,crypto,path);
const titles=['Zork1-TheGreatUndergroundEmpire.z3.js','Zork2-TheWizardofFrobozz.z3.js','Zork3-TheDungeonMaster.z3.js','Enchanter.z3.js','Sorcerer.z3.js','Spellbreaker.z3.js','Planetfall.z3.js','Stationfall.z3.js','Infidel.z3.js','Wishbringer.z3.js','Hitchhik.z5.js','Starcross.z3.js','TheLurkingHorror.z3.js','TheWitness.z3.js','Deadline.z3.js','Ballyhoo.z3.js','Moonmist.z3.js','Cutthroats.z3.js','Seastalker.z3.js','Suspect.z3.js','Suspended.z3.js','HollywoodHijinx.z3.js','LeatherGoddessesofPhobos.z3.js','PlunderedHearts.z3.js','Borderzo.z5.js','Sherlock.z5.js'];
const FLAGS=['concealed','edible','general','light','moved','on','proper','scenery','scored','static','switchable','talkable','visited','workflag','male','female','neuter','pluralname'];
const only=process.argv[2];
const summary=[];
for(const t of titles){ if(only&&!t.startsWith(only))continue;
 let B;try{B=load(t,1)}catch(e){console.log(t,'LOADFAIL',e.message);continue}
 const max=B.R.header(B.mem).version<=3?255:600;
 const digest=crypto.createHash('sha256').update(Uint8Array.from(require(process.cwd()+'/work/investigations/zil-attr-analyzer.js').story(t))).digest('hex');
 const ctxFacts=(()=>{try{return vm.runInNewContext(fs.readFileSync(path.join(JS,'ModuleStatFactsClaude.js'),'utf8')+';ModuleStatFactsClaude',{console,window:{}})}catch(e){return {}}})();
 const fact=ctxFacts[digest]||{};const map=fact.attributeMap||{};
 const leak=[];
 for(const f of FLAGS){const b=B.A.bitFor(f,B.mem);const src=Object.prototype.hasOwnProperty.call(map,f)?(map[f]===null?'map-null':'map'):'PROFILE';
  if(src==='PROFILE'&&b!==null)leak.push([f,b]);}
 let n=0;for(let i=1;i<=max;i++){try{B.R.shortName(B.mem,i);n=i}catch(e){break}}
 let P=0;for(let i=1;i<=n;i++){if(/^(you|yourself|cretin|self|me|myself)$/i.test(B.R.shortName(B.mem,i))){P=i;break}}
 const C=load(t,P||1),B2=load(t,P||1);const leakSet=new Set(leak.map(x=>x[0]));
 const orig=C.A.bitFor.bind(C.A);C.A.bitFor=(f,m)=>leakSet.has(f)?null:orig(f,m);
 const diffs=[];const attrDiff={};
 for(const [ctxName] of [['room'],['inventory']]) for(let i=1;i<=n;i++){
  let hit;try{if(!B2.R.objectLinks(B2.mem,i))continue;hit=leak.filter(([f,b])=>B2.has(i,b))}catch(e){continue}if(!hit.length)continue;
  for(const E of [B2,C]){const o=E.obj(i);E.payload.inventory=ctxName==='inventory'?[o]:[];E.payload.discoveredObjects=ctxName==='room'?[o]:[];if(ctxName==='inventory'&&P)E.setParent(i,P);}
  let r0,r1;try{r0=B2.radial(i,ctxName)}catch(e){r0=['ERR']}try{r1=C.radial(i,ctxName)}catch(e){r1=['ERR']}
  if(ctxName==='room'){const a0=B2.obj(i).attrs,a1=C.obj(i).attrs;for(const k of ['static','scenery','takeable','on','switchable','light','edible','concealed'])if(!!a0[k]!==!!a1[k])attrDiff[k]=(attrDiff[k]||0)+1;}
  if(JSON.stringify(r0)!==JSON.stringify(r1))diffs.push({ctx:ctxName,id:i,name:B2.R.shortName(B2.mem,i),bits:hit.map(x=>x[0]).join('+'),head:r0,failClosed:r1});
 }
 const map0=Object.keys(map).length;
 console.log('##',t,'digest',digest.slice(0,8),'attributeMapKeys',map0,'player',P,'PROFILE-fallback flags:',leak.map(x=>x[0]+'='+x[1]).join(' ')||'none','radialDiffs',diffs.length,'finalAttrDiffs(room)',JSON.stringify(attrDiff),'objFrontier',n);
 for(const d of diffs.slice(0,process.env.ALL?9999:40))console.log('   ',d.ctx,d.id,JSON.stringify(d.name),'['+d.bits+']','HEAD',JSON.stringify(d.head),'FAILCLOSED',JSON.stringify(d.failClosed));
 summary.push([t,leak.length,diffs.length]);
}
console.log('SUMMARY',JSON.stringify(summary));



