// lightSource radial check. usage: node run.cjs (cwd=repo). Reuses audit-r43/radial.cjs load() against live js/.
const fs=require('fs'),vm=require('vm'),crypto=require('crypto'),path=require('path');
const JS=path.join(process.cwd(),'js');
const src=fs.readFileSync(path.join(__dirname,'../audit-r43/radial.cjs'),'utf8');
const load=new Function('require','process','JS','fs','vm','crypto','path',src.split('// Audit r43: Hollywood')[0].split('const JS=process.argv[2];')[1]+';return load;')(require,process,JS,fs,vm,crypto,path);
const titles=['Zork1-TheGreatUndergroundEmpire.z3.js','Zork2-TheWizardofFrobozz.z3.js','Zork3-TheDungeonMaster.z3.js','Enchanter.z3.js','Sorcerer.z3.js','Spellbreaker.z3.js','Planetfall.z3.js','Stationfall.z3.js','Infidel.z3.js','Wishbringer.z3.js','Hitchhik.z5.js','Starcross.z3.js','TheLurkingHorror.z3.js','TheWitness.z3.js','Deadline.z3.js','Ballyhoo.z3.js','Moonmist.z3.js','Cutthroats.z3.js','Seastalker.z3.js','Suspect.z3.js','Suspended.z3.js','HollywoodHijinx.z3.js','LeatherGoddessesofPhobos.z3.js','PlunderedHearts.z3.js','Borderzo.z5.js'];
const LIGHT=/\b(lamp|lantern|torch|flashlight|match(es|book)?|candles?|light|glowing|headlamp|lighter|glow|flare)\b/i;
for(const t of titles){
 let E0;try{E0=load(t,1)}catch(e){console.log(t,'LOADFAIL',e.message);continue}
 const max=E0.R.header(E0.mem).version<=3?255:600;
 let P=0;const cand=[];
 for(let i=1;i<=max;i++){let n;try{n=E0.R.shortName(E0.mem,i)}catch(e){break}
  if(!P&&/^(you|yourself|cretin|self|me|myself)$/i.test(n))P=i;
  if(LIGHT.test(n))cand.push(i);}
 const OVR={'TheWitness.z3.js':79,'Spellbreaker.z3.js':52};if(OVR[t])P=OVR[t];
 const E=load(t,P||1);
 // if name-detected player is wrong (radial says take out of it), search for a player id that yields drop
 if(cand.length){const id=cand[0];const ok=q=>{E.payload.playerId=q;E.setParent(id,q);E.payload.inventory=[E.obj(id)];return E.radial(id,'inventory').includes('drop')};if(!P||!ok(P)){for(let q=1;q<=max;q++){try{if(ok(q)){P=q;break}}catch(e){}}}E.payload.playerId=P;}
 console.log('##',t,'player',P);
 for(const id of cand){
  const o=E.obj(id);if(P)E.setParent(id,P);const o2=E.obj(id);
  E.payload.inventory=[o2];E.payload.discoveredObjects=[];
  const r=E.radial(id,'inventory');
  console.log('  ',id,JSON.stringify(o.name),'switchable='+!!o2.attrs.switchable,'lightSource='+!!o2.attrs.lightSource,JSON.stringify(r));
 }
}
