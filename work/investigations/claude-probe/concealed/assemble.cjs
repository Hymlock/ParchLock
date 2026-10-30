// Assemble concealed packets (codex shape) from claude-probe native raw runs. Asserts every claimed row.
const fs=require('fs'),crypto=require('crypto'),assert=require('assert');const D=__dirname;
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');const load=f=>JSON.parse(fs.readFileSync(D+'/'+f));
const txt=x=>x.reply.join(' ').replace(/\s+/g,' ');
// find: hidden examine (bit 1, can't see) -> reveal command (bit 1->0) -> examine succeeds (before bit 0)
function positive(file,id,examine,reveal,okRe){let r=load(file);assert(r.sourceStable&&!r.error,file+' unstable/error');
 let ri=r.rows.findIndex(x=>x.command===reveal&&x.before.objects[id].invisible&&!x.after.objects[id].invisible);assert(ri>=0,'no reveal '+id);
 let hi=-1;for(let i=ri-1;i>=0;i--)if(r.rows[i].command===examine){hi=i;break}assert(hi>=0);let h=r.rows[hi];
 assert(h.before.objects[id].invisible&&/can't see/i.test(txt(h)),'hidden examine not refused '+id);
 let vi=r.rows.findIndex((x,i)=>i>ri&&x.command===examine);let v=r.rows[vi];assert(!v.before.objects[id].invisible&&!/can't see/i.test(txt(v))&&okRe.test(txt(v)),'visible examine failed '+id);
 return{id,name:r.rows[ri].after.objects[id].name,rawFile:file,room:h.after.room,roomName:h.after.roomName,hiddenRow:{index:hi,command:examine,invisibleBefore:true,reply:txt(h)},revealRow:{index:ri,command:reveal,before:1,after:0,reply:txt(r.rows[ri])},visibleRow:{index:vi,command:examine,invisibleBefore:false,reply:txt(v)}}}
function negative(file,id,examine){let r=load(file);let i=r.rows.findIndex(x=>x.command===examine&&x.before.objects[id]&&!x.before.objects[id].invisible);let x=r.rows[i];assert(i>=0&&!/can't see/i.test(txt(x)));return{id,name:x.before.objects[id].name,rawFile:file,room:x.before.room,index:i,command:examine,invisible:false,reply:txt(x)}}
function negScope(file,nameRe,examine){let r=load(file);let i=r.rows.findIndex(x=>x.command===examine&&!/can't see/i.test(txt(x)));let x=r.rows[i];let o=x.before.scope.find(s=>nameRe.test(s.name));assert(o&&o.invisible===false);return{id:o.id,name:o.name,rawFile:file,room:x.before.room,index:i,command:examine,invisible:false,reply:txt(x)}}
const raws=fs=>fs.map(f=>({file:f,sha256:sha(D+'/'+f)}));
const base=(story,bit,files)=>{let r=load(files[0]);return{story,digest:r.rows[0].before.digest,attribute:'concealed',bit,rawFiles:raws(files),assetSha256:r.assetSha256,readerSha256:r.readerSha256,runner:'run-native.cjs (codex concealed native shape; ordinary commands, passive RAM reads, no VM/RNG/fact writes)'}};
const out=(n,p)=>{fs.writeFileSync(D+'/packet-'+n+'.json',JSON.stringify(p,null,2));console.log(n,p.verdict,(p.positives||[]).map(x=>x.id+':'+x.name).join(','),p.negative&&p.negative.id)};
// Cutthroats bit 30
{let pos=[positive('cutthroats-ferry-run1.json',155,'examine ferry','wait',/bobs up and down/),positive('cutthroats-native-run4.json',63,'examine first hole','drill safe with drill',/holes go/)];
 out('cutthroats',{...base('Cutthroats.z3.js',30,['cutthroats-ferry-run1.json','cutthroats-native-run4.json']),positives:pos,negative:negative('cutthroats-native-run4.json',64,'examine drill'),
 restores:['codex-cutthroats-bar89 (ferry run) and codex-cutthroats-wreck (hole run): ordinary native RESTORE from a copy of codex cutthroats-native-profile'],
 sourceReferences:['boat.zil:4 FERRY FLAGS INVISIBLE','events.zil:41 I-FERRY-APPROACHING FCLEAR FERRY INVISIBLE; events.zil:98 I-FERRY-GONE FSET','boat.zil:1275 HOLE-1 FLAGS INVISIBLE','boat.zil:1303 drilling the safe FCLEARs HOLE-1'],
 limitations:['FERRY re-hides on a daemon (I-FERRY-GONE); RAM after-state can read 1 on the same turn the examine still succeeded because the daemon runs after the action.','HOLE-2 not reached: the glass case was not in this wreck run and the drill battery died (WRECK-FOUND differs from the reference walk).','Wreck-entry FCLEARs (airtight/locker doors, holes) are location-scoped and not used as positives.'],
 verdict:'PASS',status:'Two native hidden-to-visible positives plus visible negative; peer review required'})}
// Seastalker bit 12
{let pos=[positive('seastalker-native-run4.json',237,'examine ship','ne',/keel of a freighter/)];
 out('seastalker',{...base('Seastalker.z3.js',12,['seastalker-native-run4.json']),positives:pos,negative:negScope('seastalker-native-run4.json',/sonar/i,'examine sonar'),
 nameEntry:'Tom / Jones / yes (game start prompt)',sourceReferences:['sub.zil:1271 FREIGHTER FLAGS INVISIBLE','sub.zil:1296 FREIGHTER-WARNING FCLEAR FREIGHTER INVISIBLE'],
 limitations:['Second owner not reached: freighter collision ends the jericho route (RNG differs from the reference walk); SPECIAL-TOOL (116, Aquadome Bly office, revealed by SEARCH or leaving) and SNARK/THORPE-SUB (203/202, battle) are past that point.','GASH (110) reveal is PROB 20 on exit from the crawl space; did not fire in run4 (fired once in run3 without bracketing examines).'],
 verdict:'PARTIAL',blocker:'Freighter collision on the sub voyage; needs a manual evasive heading to reach the Aquadome for SPECIAL-TOOL.',status:'One native positive plus visible negative'})}
// Lurking bit 20
{let r=load('lurking-native-run6.json');out('lurkinghorror',{...base('TheLurkingHorror.z3.js',20,['lurking-native-run6.json']),positives:[],
 observed:{boltCutter45:'bit 1 while held by the invisible URCHIN; urchin flees on sight in this RNG, so SHOW HAND TO URCHIN never landed',rod231:'bit 1 throughout; brick-wall route not reached'},
 routeFixes:['TURN ON PC / LOGIN 872325412 / PASSWORD UHLERSOTH needed before CLICK ON EDIT (jericho route omits them)'],
 sourceReferences:['frob.zil:269 SHOW HAND to urchin FCLEARs BOLT-CUTTER','cs.zil:3272 brick wall FCLEARs ROD','frob.zil:487 cutting wire FCLEARs URCHINS'],
 verdict:'PARTIAL',blocker:'Urchin RNG: the urchin retreats on sight and never stays for SHOW HAND; everything after (rod, chain, urchins) depends on the bolt cutter.',status:'No positive proven'})}
// Borderzone bit 17
out('borderzone',{story:'Borderzo.z5.js',attribute:'concealed',bit:17,positives:[],sourceReferences:['globals.zil:118 GLOBAL-OBJECTS FLAGS INVISIBLE','globals.zil:414 PROTAGONIST FLAGS INVISIBLE','bystander.zil:1653 COMP-BLOOD-STAIN ;INVISIBLE commented out'],
 sourceTriage:'remaining-source-triage.json lists writes:[] for Borderzone: no FSET/FCLEAR of INVISIBLE anywhere in the source, so no in-game action can reveal an object.',
 verdict:'FAIL',blocker:'Not provable by construction: only GLOBAL-OBJECTS and the PROTAGONIST carry INVISIBLE and nothing clears it.',status:'No native run made'});
