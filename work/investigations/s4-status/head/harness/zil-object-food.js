// Actual original-memory consumers; test-only containment edits are not native proof.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const story=require(process.cwd()+'/work/investigations/zil-attr-analyzer.js').story;
const digest='2d097ac9e4081b68658d0331345176946253cb349ed66eeff88533826cae29d0';
const mem=new DataView(Uint8Array.from(story('Spellbreaker.z3.js')).buffer);
const identity={digest,header:Array.from(new Uint8Array(mem.buffer).slice(0,28))};
const payload={playerId:52,inventory:[],discoveredObjects:[]};let ambiguous=false,checks=0;
const c=vm.createContext({console,ModuleLibrary:{currentExecutableDigest:()=>digest,currentExecutableIdentity:()=>identity},ZRamProvider:{getMem:()=>mem},WorldModel:{lastPayload:payload},Actionable:{payloadPool:()=>payload.inventory.concat(payload.discoveredObjects),referenceFor:o=>({unique:!ambiguous,noun:o.name}),commandNounFor:o=>o.name,isGameWord:()=>true},AttrCalibrator:{hydrate(){},overrideFor:()=>({}),objectOverrideFor:()=>null,hasConfirmedFlag:()=>false,allowedVerbsFor:()=>[]}});
for(const file of ['ModuleStatFactsClaude','ZRamReader','GrammarProvider','AttributeSchema','ActionSynth','LearnedWords'])vm.runInContext(fs.readFileSync('js/'+file+'.js','utf8'),c);
const A=c.AttributeSchema,R=c.ZRamReader,S=c.ActionSynth,L=c.LearnedWords,F=c.ModuleStatFactsClaude[digest],h=R.header(mem);
const parent=(id,p)=>mem.setUint8(R.objectBase(h,id)+4,p);
const check=(name,fn)=>{try{fn();checks++;}catch(e){e.message=name+': '+e.message;throw e;}};
function obj(id){const raw=R.objectLinks(mem,id);return{id,name:R.shortName(mem,id),parentId:raw.parent,attrs:A.applyTo({},raw,mem)};}
function held(){parent(43,52);parent(123,52);parent(170,52);payload.inventory=[43,123,170].map(obj);payload.discoveredObjects=[];return payload.inventory;}
function offers(id,eat){const o=held().find(x=>x.id===id),verbs=S.commandsForObject(o,'inventory').map(x=>x.verb),forms=L.independentForms(o);assert.equal(verbs.includes('eat'),eat);assert.equal(forms.includes('eat'),eat);assert(!verbs.includes('drink'));assert(!forms.includes('drink'));return o;}
check('real original dictionary classifies validated ZIL',()=>{const f=c.GrammarProvider.decodeD198(mem);assert.equal(f.classification,'confirmed-zil-family');assert.equal(f.evidence,'validated');});
check('first native identity feeds both consumers',()=>offers(43,true));
check('second native identity feeds both consumers',()=>offers(123,true));
check('nonfood control gains neither action',()=>offers(170,false));
check('identity capability has no fabricated bit',()=>assert.strictEqual(A.bitFor('edible',mem),null));
check('owner requires an actual member object ID',()=>{assert(!A.measuredFlagOwner(mem,'edible'));assert(!A.measuredFlagOwner(mem,'edible',170));assert(A.measuredFlagOwner(mem,'edible',43));});
check('forged nonmember attrs are not authenticated',()=>{const knife=obj(170);knife.attrs.edible=true;assert.equal(S.trustworthyAttrs(knife).edible,false);});
for(const bad of [[],[43,43],[43,'123'],[43,null],[43,0],[43,999999]])check('whole malformed list fails closed '+JSON.stringify(bad),()=>{const old=F.attributeObjects.edible;F.attributeObjects.edible=bad;offers(43,false);assert.strictEqual(A.bitFor('edible',mem),null);F.attributeObjects.edible=old;});
check('unknown digest grants no new food choice',()=>{c.ModuleLibrary.currentExecutableDigest=()=>null;offers(43,false);c.ModuleLibrary.currentExecutableDigest=()=>digest;});
check('rejected supplied-memory identity grants no choice',()=>{mem.setUint8(2,mem.getUint8(2)^1);offers(43,false);mem.setUint8(2,mem.getUint8(2)^1);});
check('unknown family grants no identity capability',()=>{const old=A._familyOf;A._familyOf=()=>({classification:'unknown'});offers(43,false);A._familyOf=old;});
check('explicit null bit declaration stays stronger',()=>{F.attributeMap.edible=null;offers(43,false);delete F.attributeMap.edible;});
check('explicit measured bit stays stronger than membership',()=>{F.attributeMap.edible=7;assert.equal(A.bitFor('edible',mem),7);offers(43,false);delete F.attributeMap.edible;});
check('declared attribute names stay stronger',()=>{const old=R.informAttributeNames;R.informAttributeNames=()=>({bits:{edible:7}});assert.equal(A.bitFor('edible',mem),7);assert.equal(obj(43).attrs.edible,false);R.informAttributeNames=old;});
check('identity capability wins over conflicting flag calibration',()=>{c.AttrCalibrator.overrideFor=()=>({edible:{bit:30}});offers(43,true);offers(170,false);c.AttrCalibrator.overrideFor=()=>({});});
check('ambiguous parser reference produces no command',()=>{const food=offers(43,true);ambiguous=true;assert.equal(S.commandsForObject(food,'inventory').length,0);ambiguous=false;});
check('nested food retains existing Take-only boundary',()=>{parent(198,52);parent(43,198);const food=obj(43),bag={id:198,name:'zipper',parentId:52,attrs:{container:true,open:true}};payload.inventory=[bag,food];assert(!S.commandsForObject(food,'inventory','zipper').some(x=>x.verb==='eat'));assert(!L.independentForms(food).includes('eat'));});
check('room food remains a capability in existing room context',()=>{parent(43,45);const food=obj(43);payload.inventory=[];payload.discoveredObjects=[food];assert(S.commandsForObject(food,'room').some(x=>x.verb==='eat'));assert(L.independentForms(food).includes('eat'));});
check('D201 genuine measured food survives direct-evidence restriction without Drink',()=>{const food=offers(43,true);food.examineOnly=true;const forms=S.commandsForEvidenceObject(food,'inventory');assert(forms.some(x=>x.verb==='eat'));assert(!forms.some(x=>x.verb==='drink'));assert(!L.independentForms(food).includes('drink'));});
check('consumed/offstage target is not restored to payload',()=>{parent(43,0);payload.inventory=[];payload.discoveredObjects=[];assert.equal(S.commandsForPayloadObjectId(43,'inventory').length,0);});
check('switching back to valid identity recomputes membership',()=>offers(43,true));
check('throwing identity provider cannot clear unrelated Inform edible bits',()=>{const im=new DataView(Uint8Array.from(story('anchor.z8.js')).buffer),x=vm.createContext({console,ModuleLibrary:{currentExecutableDigest:()=>{throw Error('identity unavailable');}},ZRamProvider:{getMem:()=>im}});for(const file of ['ModuleStatFactsClaude','ZRamReader','AttributeSchema'])vm.runInContext(fs.readFileSync('js/'+file+'.js','utf8'),x);const rr=x.ZRamReader,aa=x.AttributeSchema,bit=aa.bitFor('edible',im);assert(Number.isInteger(bit));let food;for(let id=1;id<=rr.objectCount(im);id++){const o=rr.objectLinks(im,id);if(rr.attr(o,bit)){food=o;break;}}assert(food,'original Inform edible-bit control');assert.equal(aa.applyTo({},food,im).edible,true);});
console.log(checks+' object-defined food capability checks passed');
