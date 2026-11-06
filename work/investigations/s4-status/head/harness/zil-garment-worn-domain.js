// Original Moonmist RAM; explicit test-only parent/bit edits are X-tier controls.
// Native garment/accessibility proofs are retained separately, never manufactured here.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const original=Uint8Array.from(require(process.cwd()+'/work/investigations/zil-attr-analyzer.js').story('Moonmist.z3.js'));
const mem=new DataView(original.buffer.slice(0)),digest='bcf65075f2343fd3d10606141d7dbfa2c50f8bbf96b65161e2bda0f7fc65e3b0';
let provider=mem,hydrated=null,checks=0;
const identity={digest,header:Array.from(original.slice(0,28))};
const c=vm.createContext({console,ModuleLibrary:{currentExecutableDigest:()=>digest,currentExecutableIdentity:()=>identity},ZRamProvider:{getMem:()=>provider},AttrCalibrator:{hydrate:m=>{hydrated=m;},overrideFor:()=>({worn:{bit:21}}),objectOverrideFor:()=>null,learnedWornBit:()=>21}});
for(const file of ['ModuleStatFactsClaude','ZRamReader','GrammarProvider','AttributeSchema'])vm.runInContext(fs.readFileSync((process.env.DOMAIN_SOURCE_ROOT||'.')+'/js/'+file+'.js','utf8'),c);
const R=c.ZRamReader,A=c.AttributeSchema,F=c.ModuleStatFactsClaude[digest],h=R.header(mem),base=id=>R.objectBase(h,id);
function check(name,fn){fn();checks++;console.log('PASS '+name);}
function restore(){new Uint8Array(mem.buffer).set(original);provider=mem;}
function bit(id,n,on){const p=base(id)+Math.floor(n/8),mask=1<<(7-n%8);mem.setUint8(p,on?mem.getUint8(p)|mask:mem.getUint8(p)&~mask);}
function parent(id,n){mem.setUint8(base(id)+4,n);}
function state(id,view=mem){return A.applyTo({},R.objectLinks(view,id),view);}
function both(attrs,expected){assert.strictEqual(attrs.worn,expected);assert.strictEqual(attrs.isWorn,expected);}
check('actual original tweed state belongs to garment domain',()=>both(state(78),true));
check('actual unworn exercise state remains false despite calibration',()=>both(state(198),false));
check('second garment state uses raw worn bit rather than custody',()=>{parent(198,42);bit(198,21,true);bit(78,21,false);both(state(198),true);both(state(78),false);restore();});
check('native-qualified nonwearable lantern remains false when held',()=>{parent(153,42);both(state(153),false);});
for(const id of [7,12,33,62,126,151,37,66])check('room/root/global never gains worn aliases '+id,()=>both(state(id),false));
check('offstage garment with constructed worn bit remains false',()=>{parent(78,0);both(state(78),false);restore();});
check('dropped garment with cleared bit stays unworn',()=>{parent(78,76);bit(78,21,false);both(state(78),false);restore();});
check('custody alone never creates worn state',()=>{parent(198,42);both(state(198),false);restore();});
check('source NPC-costume relation preserves raw garment state',()=>{parent(113,167);bit(113,21,true);both(state(113),true);bit(113,21,false);both(state(113),false);restore();});
check('constructed nested state is bit-owned, not an accessibility claim',()=>{parent(78,59);both(state(78),true);bit(78,21,false);both(state(78),false);restore();});
check('nonwearable cannot become worn from constructed bit alone',()=>{parent(153,42);bit(153,21,true);both(state(153),false);restore();});
check('forged input attributes cannot override original-memory state',()=>{const o=R.objectLinks(mem,198);o.attrBytes=R.objectLinks(mem,78).attrBytes;both(A.applyTo({},o,mem),false);});
check('parent outside measured table fails closed',()=>{parent(78,254);both(state(78),false);restore();});
check('object beyond measured table fails closed',()=>both(A.applyTo({},Object.assign({},R.objectLinks(mem,78),{id:254}),mem),false));
for(const [key,bad]of [['objectCount',254],['objectCount','253'],['roomRootObject',66],['roomRootObject',0],['roomRootObject',254]])check('invalid domain '+key+'='+bad,()=>{const old=F.equipmentState[key];F.equipmentState[key]=bad;both(state(78),false);F.equipmentState[key]=old;});
check('malformed owned selector cannot expose the unqualified raw room bit',()=>{const old=F.equipmentState.wornWhen;F.equipmentState.wornWhen='invalid';both(state(33),false);F.equipmentState.wornWhen=old;});
check('missing measured worn bit cannot fall back to learned bit',()=>{delete F.wornAttribute;both(state(78),false);F.wornAttribute=21;});
check('missing measured wearable bit fails closed',()=>{delete F.attributeMap.wearable;both(state(78),false);F.attributeMap.wearable=29;});
check('unknown family fails closed',()=>{const family=A._familyOf;A._familyOf=()=>({classification:'unknown'});both(state(78),false);A._familyOf=family;});
check('changed root role fails closed',()=>{bit(37,29,true);both(state(78),false);restore();});
check('changed property boundary fails closed',()=>{mem.setUint16(base(1)+7,2997+9);both(state(78),false);restore();});
const wrong=new DataView(original.buffer.slice(0));wrong.setUint8(2,wrong.getUint8(2)^1);
check('explicit wrong supplied view is never replaced by correct provider',()=>{provider=mem;hydrated=null;both(state(78,wrong),false);assert.strictEqual(hydrated,wrong);});
check('explicit correct view is never replaced by wrong provider',()=>{provider=wrong;hydrated=null;both(state(78,mem),true);assert.strictEqual(hydrated,mem);provider=mem;});
check('omitted-memory call retains provider fallback',()=>{provider=mem;both(A.applyTo({},R.objectLinks(mem,78)),true);});
check('no player or room heuristic is consulted',()=>{const rp=R.resolvePlayer,er=R.enclosingRoom;R.resolvePlayer=()=>{throw Error('forbidden player inference');};R.enclosingRoom=()=>{throw Error('forbidden room inference');};both(state(78),true);R.resolvePlayer=rp;R.enclosingRoom=er;});
check('stronger declared names are preserved',()=>{const names=R.informAttributeNames;R.informAttributeNames=()=>({bits:{worn:21,clothing:29}});assert.equal(state(33).worn,true);R.informAttributeNames=names;});
check('exception cannot resurrect owned raw room bit',()=>{const names=R.informAttributeNames;R.informAttributeNames=()=>{throw Error('unavailable declarations');};both(state(33),false);R.informAttributeNames=names;});
check('throwing digest accessor cannot leak learned room/global worn state',()=>{const getter=c.ModuleLibrary.currentExecutableDigest;try{c.ModuleLibrary.currentExecutableDigest=()=>{throw Error('digest unavailable');};both(state(33),false);both(state(66),false);}finally{c.ModuleLibrary.currentExecutableDigest=getter;}});
check('missing executable identity fails closed for digest-owned domain',()=>{const getter=c.ModuleLibrary.currentExecutableIdentity;try{c.ModuleLibrary.currentExecutableIdentity=()=>null;both(state(78),false);both(state(33),false);}finally{c.ModuleLibrary.currentExecutableIdentity=getter;}});
check('throwing executable identity fails closed for digest-owned domain',()=>{const getter=c.ModuleLibrary.currentExecutableIdentity;try{c.ModuleLibrary.currentExecutableIdentity=()=>{throw Error('identity unavailable');};both(state(78),false);}finally{c.ModuleLibrary.currentExecutableIdentity=getter;}});
check('wrong identity header cannot authenticate the garment domain',()=>{const getter=c.ModuleLibrary.currentExecutableIdentity;try{c.ModuleLibrary.currentExecutableIdentity=()=>({digest,header:Array(28).fill(0)});both(state(78),false);}finally{c.ModuleLibrary.currentExecutableIdentity=getter;}});
console.log(checks+' garment-domain checks passed');
