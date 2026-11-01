// Independent post-power current-source audit: constructed X-tier only.
const fs=require('fs'),vm=require('vm'),assert=require('assert'),crypto=require('crypto');
const files=['js/ActionSynth.js','js/Actionable.js','js/AttributeSchema.js','js/ModuleStatFactsClaude.js','js/LearnedWords.js','harness/zil-light-forms.js'];
const hash=()=>Object.fromEntries(files.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')]));
const before=hash(),checks=[];
const prefix=fs.readFileSync('harness/zil-light-forms.js','utf8').split('const LIGHT=')[0];
const load=new Function('require',prefix+'\nreturn load;')(require);
function fixture(file){const T=load(file);vm.runInContext(fs.readFileSync('js/Actionable.js','utf8'),T.c);T.c.Actionable.payloadPool=()=>T.payload.inventory.concat(T.payload.discoveredObjects);return T;}
function check(name,fn){fn();checks.push(name);}
const T=fixture('Sherlock.z5.js');T.parent(232,38);T.parent(166,232);T.bit(166,38,0);
const lamp=T.obj(166);T.payload.inventory=[lamp];
const menu=()=>Array.from(T.S.commandsForObject(lamp,'inventory'));
let row=menu().find(c=>c.lightFormScope);
check('actual reference unique/verified and unchanged tap accepted',()=>{const r=T.c.Actionable.referenceFor(lamp);assert(r.unique&&r.verified);assert(row&&T.c.Actionable.radialCommandCurrent(row));});
check('missing actual live owner rejects stale light tap',()=>{T.payload.inventory=[];assert(!T.c.Actionable.radialCommandCurrent(row));T.payload.inventory=[lamp];});
check('same-id same-parent duplicate representation accepted',()=>{T.payload.discoveredObjects=[Object.assign({},lamp)];assert(T.c.Actionable.radialCommandCurrent(row));T.payload.discoveredObjects=[];});
check('same-id conflicting-parent representation rejected',()=>{T.payload.discoveredObjects=[Object.assign({},lamp,{parentId:38})];assert(!T.c.Actionable.radialCommandCurrent(row));T.payload.discoveredObjects=[];});
check('state flip rejects prior scoped command',()=>{T.bit(166,38,1);assert(!T.c.Actionable.radialCommandCurrent(row));});
T.c.AttrCalibrator.allowedVerbsFor=()=>['turn off','turn on','switch off','switch on'];
let current=menu().filter(c=>/^(turn|switch) (on|off) /.test(c.command));
check('already-learned native verb receives scope; opposing/alternate inferred forms removed',()=>{assert.equal(current.length,1);assert.equal(current[0].verb,'turn off');assert(current[0].lightFormScope);assert(T.c.Actionable.radialCommandCurrent(current[0]));});
check('matching native learned verb rejects later state flip',()=>{T.bit(166,38,0);assert(!T.c.Actionable.radialCommandCurrent(current[0]));});
const S=fixture('Starcross.z3.js');S.parent(239,198);S.parent(144,239);S.parent(176,239);S.bit(176,24,0);S.bit(144,24,0);
const suit=S.obj(176),other=S.obj(144);suit.aliases=['tattered','suit'];other.aliases=['space','suit'];S.payload.inventory=[suit,other];
let wear=Array.from(S.S.commandsForObject(suit,'inventory')).find(c=>c.identityWearScope);
check('real alias-qualified Wear survives reconstruction',()=>{assert(wear,JSON.stringify(Array.from(S.S.commandsForObject(suit,'inventory'))));assert(S.c.Actionable.radialCommandCurrent(wear));});
check('missing actual live Wear owner refuses stale tap',()=>{S.payload.inventory=[other];assert(!S.c.Actionable.radialCommandCurrent(wear));S.payload.inventory=[suit,other];});
check('duplicate same-parent Wear owner accepted',()=>{S.payload.discoveredObjects=[Object.assign({},suit)];assert(S.c.Actionable.radialCommandCurrent(wear));S.payload.discoveredObjects=[];});
check('duplicate conflicting-parent Wear owner refused',()=>{S.payload.discoveredObjects=[Object.assign({},suit,{parentId:198})];assert(!S.c.Actionable.radialCommandCurrent(wear));S.payload.discoveredObjects=[];});
check('More remains a source-level action path',()=>{const src=fs.readFileSync('js/Actionable.js','utf8');assert(src.includes("Label: 'More'"));assert(src.includes('addMoreActions: function'));});
const after=hash();assert.deepStrictEqual(after,before);
const result={tier:'constructed/X; More source-presence only, not GUI proof',sourceStable:true,hashes:before,checks,verdict:'ACCEPT focused two-blocker correction; final shared gates and Sherlock hidden-child policy excluded'};
fs.writeFileSync(__dirname+'/power-recovery-action-audit.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
