// Research-only counterfactual fact audit. No story RAM writes or product-file edits.
const fs=require('fs'),path=require('path'),{pathToFileURL}=require('url');
const {chromium}=require(process.cwd()+'/node_modules/playwright');
(async()=>{const b=await chromium.launch();try{const p=await b.newPage();await p.addInitScript(()=>{sessionStorage.setItem('PL_ParchLockSplashSeen','1');for(const k of ['PL_TutorialSeen','PL_MobileTutorialSeen','PL_LearnedWordsTutorialSeen'])localStorage.setItem(k,'1');});
await p.goto(pathToFileURL(path.resolve('play.html')).href+'?story=games/Moonmist.z3.js');await p.waitForTimeout(3500);
const result=await p.evaluate(()=>{const m=ZRamProvider.getMem(),digest=ModuleLibrary.currentExecutableDigest(),fact=ModuleStatFactsClaude[digest];
if(!m||!fact)throw Error('missing loaded story/fact');const saved=JSON.stringify(fact);
const ids=[33,62,78,126,151,198,217];
const take=label=>({label,wornBit:AttributeSchema.bitFor('worn',m),rows:ids.map(id=>({id,name:ZRamReader.shortName(m,id),parent:ZRamReader.objectLinks(m,id).parent,worn:!!ZRamReader.attrsFromObject(m,id).worn,wearable:!!ZRamReader.attrsFromObject(m,id).wearable,plausibleRoom:ZRamReader.isPlausibleMapRoom(m,id)}))});
try{const baseline=take('current');fact.attributeMap.worn=21;const originalProposal=take('author attributeMap.worn21');delete fact.attributeMap.worn;fact.wornAttribute=21;const stateOwner=take('counterfactual wornAttribute21');return {digest,baseline,originalProposal,stateOwner,tier:'counterfactual consumer guard only; not native flag proof'};}
finally{const restore=JSON.parse(saved);for(const k of Object.keys(fact))delete fact[k];Object.assign(fact,restore);}});
fs.writeFileSync(path.join(__dirname,'moonmist-worn-safety.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));}finally{await b.close();}})();
