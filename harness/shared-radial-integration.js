const fs=require('fs'),vm=require('vm'),assert=require('assert');
let checks=0,menu,sent=[],draft='',learned={},current=true,cutover=false;
function check(v,m){assert(v,m);checks++;console.log('PASS:',m)}
const c=vm.createContext({console,window:{},document:{addEventListener(){},querySelectorAll:()=>[],body:{classList:{contains:()=>false}}},WorldModel:{lastPayload:{}},Input:{Clear(){draft=''},Inject(t){draft=t},Focus(){}},ParchLockQol:{GetRadialCommands:()=>[],OpenRadial(x,y,s,context){menu={s,context}}},LearnedWords:{commands:o=>learned[o.id]||[],commandCurrent:()=>current},AttrCalibrator:{defaultInspectVerb:()=> 'examine',inspectVerbCurrentlyDisabled:()=>false,allowedVerbsFor:()=>[]}});
for(const f of ['ActionSynth','SemanticActions','Actionable'])vm.runInContext(fs.readFileSync('js/'+f+'.js','utf8'),c);
const A=c.Actionable;A.payloadPool=()=>c.WorldModel.lastPayload.discoveredObjects.concat(c.WorldModel.lastPayload.inventory);A.Submit=(cmd,source)=>sent.push({cmd,source});A.isGameWord=w=>w==='use';c.SemanticActions.CutoverFlag.isEnabled=()=>cutover;
const pellet=id=>({id,name:'pellet',aliases:['pellet'],attrs:{takeable:true,edible:true},confidence:.9,parentId:1});
const box={id:8,name:'box',aliases:['box'],attrs:{container:true},parentId:1},npc={id:9,name:'porter',aliases:['porter'],attrs:{animate:true}};
function scene(items,held=[]){c.WorldModel.lastPayload={playerId:1,discoveredObjects:items.concat(npc),inventory:held};sent=[];draft='';current=true;}
function open(id,kind='object'){A.Open('pellet',kind,100,100,id);return menu;}
function shape(m){return JSON.stringify(m.s.map(s=>[s.Label,s.Command,s.Score,s.Usage,s.Enter,s.TrackTap]));}
for(cutover of [false,true]){
 scene([pellet(2)]);const normal=open(2);scene([pellet(2),pellet(3)]);const duplicate=open(null);
 check(shape(normal)===shape(duplicate),'ground duplicate uses normal action labels, ranking metadata and launchers; semantic='+cutover);
 check(duplicate.context.objectId===null&&duplicate.context.candidateIds.length===2,'shared UI retains candidates without binding an owner');
 duplicate.s.find(s=>s.Label==='Eat').Action();check(sent[0].cmd==='eat pellet'&&sent[0].source==='ambiguous-reference','shared Eat retains learning exclusion');
 duplicate.s.find(s=>s.Label==='Use with...').Action();menu.s.find(s=>s.Label==='porter').Action();check(sent.at(-1).cmd==='use pellet with porter'&&sent.at(-1).source==='ambiguous-reference','shared instrumental launcher uses readable source and normal target selection');
 scene([], [pellet(2),box]);const heldNormal=open(2,'inventory');scene([], [pellet(2),pellet(3),box]);const heldShared=open(null,'inventory');
 check(shape(heldNormal)===shape(heldShared),'held duplicate keeps normal Drop/Give/Put launchers and ranking; semantic='+cutover);
 heldShared.s.find(s=>s.Label==='Put in...').Action();menu.s.find(s=>s.Label==='box').Action();check(sent.at(-1).cmd==='put pellet in box'&&sent.at(-1).source==='ambiguous-reference','shared Put opens normal target submenu and submits complete command');
 heldShared.s.find(s=>s.Label==='Give to...').Action();menu.s.find(s=>s.Label==='porter').Action();check(sent.at(-1).cmd==='give pellet to porter'&&sent.at(-1).source==='ambiguous-reference','shared Give opens normal recipient submenu');
 scene([pellet(2)], [pellet(3)]);check(open(null).s.some(s=>s.Label==='Take'),'held sibling does not suppress ground Take');
 scene([], [pellet(2),pellet(3)]);check(!open(null,'inventory').s.some(s=>s.Label==='Take'),'all-held direct copies do not offer ground Take');
 const nested=[pellet(2),pellet(3)].map(o=>Object.assign(o,{parentId:8}));scene([],nested.concat(box));check(open(null,'inventory').s.some(s=>s.Label==='Take out of box'),'nested duplicates retain ordinary container retrieval');
 scene([pellet(2),Object.assign(pellet(3),{attrs:{takeable:true}})]);check(!open(null).s.some(s=>s.Label==='Eat'),'an unsupported sibling prevents an automatic shared action');
}
cutover=false;
const suggestion=id=>({objectId:id,verb:'rub',noun:'pellet',command:'rub pellet',confidence:.6,Enter:false,learnedWordScope:{id}});
learned={2:[suggestion(2)],3:[Object.assign(suggestion(3),{Enter:true})]};scene([pellet(2),pellet(3)]);let shared=open(null);let rub=shared.s.find(s=>s.Label==='Rub');check(rub&&rub.Enter===false,'any review-only member keeps shared learned suggestion review-only');rub.Action();check(sent.length===1&&sent[0].cmd==='rub pellet'&&sent[0].source==='ambiguous-reference'&&draft==='','shared review-only complete suggestion submits at once (operator rule 2026-10-25)');current=false;draft='';sent=[];rub.Action();check(draft===''&&sent.length===0,'stale learned member cannot execute from an open menu');
learned={2:[suggestion(2)]};scene([pellet(2),pellet(3)]);check(!open(null).s.some(s=>s.Label==='Rub'),'object-specific learned action is not granted to an unsupported copy');
learned={2:[Object.assign(suggestion(2),{verb:'give to',command:'give pellet to '})],3:[Object.assign(suggestion(3),{verb:'give to',command:'give pellet to '})]};scene([pellet(2),pellet(3)]);shared=open(null);shared.s.find(s=>s.Label==='Give to...').Action();check(draft==='give pellet to '&&sent.length===0,'review-only shared stem fills prompt instead of auto-submitting through a target');
learned={};c.AttrCalibrator.allowedVerbsFor=id=>id===3?['rub']:[];scene([pellet(2),pellet(3)]);shared=open(null);shared.s.find(s=>s.Label==='More').Action();check(menu.s.some(s=>s.Label==='Rub'&&s.Enter===false),'More retains learned candidate verbs as editable suggestions');
console.log(checks+' shared radial integration checks passed');
