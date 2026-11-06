// Real catalog-module statistics inspection. No injected world or stat values.
const { chromium } = require('playwright');
const path = require('path');
const { pathToFileURL } = require('url');
const assert = require('assert');
const fs = require('fs');
const crypto = require('crypto');
// Fail before launching Chromium when the concurrently maintained data file
// is malformed; a browser fallback to an empty registry is not valid proof.
new (require('vm').Script)(fs.readFileSync(path.resolve('js/ModuleStatFacts.js'),'utf8'),{filename:'js/ModuleStatFacts.js'});
new (require('vm').Script)(fs.readFileSync(path.resolve('js/ModuleStatFactsClaude.js'),'utf8'),{filename:'js/ModuleStatFactsClaude.js'});
const file = process.argv[2] || 'CounterfeitMonkey.gblorb.js';
const verify = process.argv.includes('--verify');
const verifyV3=process.argv.includes('--verify-v3');
const verifyGuss=process.argv.includes('--verify-guss');
const verifyProwess=process.argv.includes('--verify-prowess');
const verifyNoScore=process.argv.includes('--verify-no-score');
const verifyGrid=process.argv.includes('--verify-grid');
const verifyQuestionGate=process.argv.includes('--verify-question-gate');
const quick=process.argv.includes('--quick');
const verifyProgress=process.argv.includes('--verify-progress');
const verifyMetrics=process.argv.includes('--verify-metrics');
const metricDetails={
 'ScrollThief.gblorb.js':{score:{value:0,max:100,rank:'Inept Burglar'},act:{value:1},problems:{value:1},time:{value:'11:15 pm'},turns:{value:1}},
 'BlueLacuna.gblorb.js':{time:{value:'Night'},chapter:{value:1,max:10},regions:{value:1,max:22},'first choice':{value:'art'}},
 'AndromedaApocalypse.gblorb.js':{achievements:{pattern:'Hell of a Storm.*Gettare Rinors.*'}},
 'CosmoServe.gblorb.js':{'chance of success':{value:0},time:{value:'8:01 am'}},
 'RoversDayOut.gblorb.js':{memory:{pattern:'[0-9]+[.][0-9]+PB'}},
 'anchor.z8.js':{score:{value:0,max:100},day:{value:1},progress:{value:'at the threshold of a foreboding mystery'}},
 'Heroine.z8.js':{score:{value:0,max:400,rank:'schoolgirl'},date:{value:'Eight years before 2001'}},
 'inhumane.z5.js':{score:{value:0,max:300,rank:'Novice Adventurer'}},
 'tatctae.z8.js':{score:{value:0,max:200,rank:'crazy scientist with no brain whatsoever'}},
 'SpAdventure.z5.js':{score:{value:36,max:350,rank:'Adventurer'}},
 'Zork1-TheGreatUndergroundEmpire.z3.js':{score:{value:0,max:350,rank:'Beginner'},health:{band:'perfect'}},
 'TheLurkingHorror.z3.js':{score:{value:0,max:100,rank:'Freshman'},health:{value:'good'}},
 'Ralph.z5.js':{score:{value:0,max:30,rank:'Ralph, at your service'},health:{value:'great'}},
 'sherbet.z5.js':{score:{value:0,max:30,rank:'Embassy Stablehand'}},
 'risorg.z8.js':{score:{value:0,max:50,rank:'failed the admission criteria'},health:{value:'peak physical condition'}},
 'HugeCave.z8.js':{score:{value:0,max:1001,rank:'Rank Amateur'},locations:{value:1,max:300},treasures:{value:0}},
 'KoA.z5.js':{score:{value:0,max:6000},locations:{value:1,max:200}},
 'Shapes.z5.js':{score:{value:0,max:125},locations:{value:1,max:94}},
 'Zork2-TheWizardofFrobozz.z3.js':{score:{value:0,max:400,rank:'Beginner'}},
 'Starcross.z3.js':{score:{value:0,max:400,rank:'Beginner'}},
 'Infidel.z3.js':{score:{value:0,max:400,rank:'a fumbling beginner'}},
 'HollywoodHijinx.z3.js':{score:{value:0,max:150}},
 'Cutthroats.z3.js':{score:{value:0,max:250,rank:'a chicken of the sea'},money:{value:20}},
 'Wishbringer.z3.js':{score:{value:0,max:100}},
 'Stationfall.z3.js':{score:{value:0,max:80,rank:'Insignificant Nobody'},day:{value:1},time:{pattern:'[0-9]+'},health:{value:'good'}},
 'Zork3-TheDungeonMaster.z3.js':{score:{value:0,max:7}},
 'Borderzo.z5.js':{time:{pattern:'\\d{2}:\\d{2}'},health:{value:'good enough shape'}},
 'Hitchhik.z5.js':{score:{value:0,max:400}},
 'zdungeon.z5.js':{score:{value:0,max:646,rank:'Beginner'}},
 'stiffmst.z5.js':{score:{value:0,max:100},locations:{value:1,max:4}},
 'vgame.z8.js':{progress:{value:0,rank:'Palace Minister'},tone:{value:'cordial'}},
 'huntdark.z5.js':{quarry:{value:'still alive'},health:{value:'still alive'}},
 'dumont.z5.js':{'keys seen':{value:0},'keys turned':{value:0},'shutdown elements':{value:0,max:5}},
 'degen.z5.js':{task:{value:'completed'},health:{value:'Never have you been in better health.'}},
 'devdoit.z5.js':{temptations:{value:0,max:7}},
 'death.z5.js':{score:{value:0,max:100},diagnosis:{value:"Well, you have a stomach full of chili, but you're ready to kick ass."}},
 'gourmet.zblorb.js':{score:{value:0,max:100}},
 'ChildsPlay.zblorb.js':{score:{value:0,max:100}},
 'bookvol.z5.js':{tasks:{value:0,max:0},time:{pattern:'Sunday \\d{1,2}:\\d{2} [ap]m'}},
 'cabal.z5.js':{score:{value:349,max:350}},
 'csbb.z8.js':{holiness:{value:0,max:100},magic:{value:80}},
 'forms.z5.js':{season:{value:'Autumn'},time:{value:'Evening'}},
 'devours.z5.js':{time:{value:'4:17:00 am'}},
 'geb.z5.js':{score:{value:0,max:100}},
 'curves.z8.js':{time:{pattern:'Monday, 10:\\d{2} am'}},
 'curses.z5.js':{date:{value:'June 3rd, 1993'},score:{value:0,max:550,rank:'hapless Tourist'},health:{value:'still breathing'}}
}[file];
const details={ 'gussdeath.z3.js':{score:0,max:10,rank:null},'dejavu.z3.js':{score:0,max:50,rank:'somnambulist'},'Advent.z5.js':{score:36,max:350,rank:'Adventurer'},'Adventureland.z5.js':{score:0,max:100,rank:null},'alice3.z5.js':{score:0,max:0,rank:null},'acorncourt.z5.js':{score:0,max:30,rank:null} }[file];
const commands = verifyQuestionGate?['@question-equipment','yes','@question-equipment','no','@normal-command-guard']:verify ? ['yes','yes','yes','@space','tutorial off','north','east','wave x-remover at codex','enter code','north','score','goals','inventory','@equipment','@reopen','undo','@equipment'] : verifyMetrics?(file==='ScrollThief.gblorb.js'?['@key:s','@equipment','@reopen']:file==='BlueLacuna.gblorb.js'?['@key:n','man','woman','art','@equipment','@reopen']:file==='CosmoServe.gblorb.js'?['no','@space','@equipment','@reopen']:file==='HugeCave.z8.js'?['@advance-space','no','@equipment','@reopen']:file==='KoA.z5.js'?['no','@equipment','@reopen']:file==='Borderzo.z5.js'?['@key:1','@equipment','@reopen']:file==='stiffmst.z5.js'?['@key:2','@advance-space','@equipment','@reopen']:file==='vgame.z8.js'?['@key:1','@advance-space','@equipment','@reopen']:file==='bookvol.z5.js'?['@key:b','@equipment','@reopen']:file==='csbb.z8.js'?['no','@advance-space','@equipment','@reopen']:['RoversDayOut.gblorb.js','anchor.z8.js','Heroine.z8.js','tatctae.z8.js','Ralph.z5.js','sherbet.z5.js','curves.z8.js','curses.z5.js','cabal.z5.js','gourmet.zblorb.js','huntdark.z5.js'].includes(file)?['@advance-space','@equipment','@reopen']:['@equipment','@reopen']):verifyProgress?['@space','@equipment','north','@reopen']:verifyGrid?['wait']:verifyNoScore?(file==='CragneManor.gblorb.js'?['@space','yes','yes','@space','@equipment','@reopen']:file==='RobinAndOrchid.gblorb.js'?['@space','@equipment','@reopen']:file==='Alabaster.gblorb.js'?['yes','@space','@advance-space','@equipment','@reopen']:file==='deadreck.z5.js'?['@advance-space','no','@equipment','@reopen']:['@equipment','@reopen']):verifyProwess?['@space','@equipment','repose','@reopen']:verifyGuss?['@equipment','wait','@equipment']:process.argv.slice(3).filter(x=>!x.startsWith('--'));
if (verify && file !== 'CounterfeitMonkey.gblorb.js') throw Error('No validated scenario yet for '+file);
function executableIdentity(filename) {
 const script=fs.readFileSync(path.resolve('games',filename),'utf8');
 const match=script.match(/processBase64Zcode\s*\(\s*['"]([^'"]+)['"]\s*\)/);
 assert(match,'story wrapper contains executable data');
 const bytes=Buffer.from(match[1],'base64');
 let executable=bytes;
 if(bytes.toString('ascii',0,4)==='FORM'){
  const candidates=[];
  for(let offset=12;offset+8<=bytes.length;){
   const size=bytes.readUInt32BE(offset+4),end=offset+8+size;
   assert(end<=bytes.length,'Blorb chunk is bounded');
   if(['GLUL','ZCOD'].includes(bytes.toString('ascii',offset,offset+4))) candidates.push(bytes.subarray(offset+8,end));
   offset=end+(size%2);
  }
  assert.strictEqual(candidates.length,1,'one executable chunk');executable=candidates[0];
 }
 return crypto.createHash('sha256').update(executable).digest('hex');
}
if(process.argv.includes('--identity')){console.log(JSON.stringify({file,executableSha256:executableIdentity(file)}));process.exit(0);}
if(process.argv.includes('--contract')){
 const S=require('../js/StatTracker.js');
 const digest=executableIdentity('gussdeath.z3.js');
 global.ModuleLibrary={currentExecutableIdentity:()=>({digest})};
 global.Actionable={isGameWord:()=>true};
 S.reset();
 assert(S.measuredScoreProbe() && Object.keys(S.model().stats).length===0,'facts authorize a form, never seed numeric readings');
 S.recordObservation(S.model(),'score',{label:'Score',value:0,max:null,unit:'plain'});
 S.recordObservation(S.model(),'score',{label:'Score',value:0,max:null,unit:'plain'});
 S.applyScoreReply('You have so far scored 0 out of a possible 10, in 0 turn.');
 S.recordObservation(S.model(),'score',{label:'Score',value:0,max:null,unit:'plain'});
 assert.strictEqual(S.model().stats.score.max,10,'numerator-only grid preserves command-owned maximum');
 assert(S.needsScoreProbe(),'command-only relationship is re-read on opening');
 S.recordObservation(S.model(),'score',{label:'Score',value:0,max:12,unit:'fraction'});
 assert(!S.needsScoreProbe(),'current authored grid bound avoids a command');
 S.applyScoreReply('You have so far scored 0 out of a possible 10, in 0 turn.');
 S.forgetReadings(S.model());assert.strictEqual(S.model().stats.score.max,null,'restore/load clears bound readings');
 global.ModuleLibrary.currentExecutableIdentity=()=>({digest:'changed-build'});
 assert.strictEqual(S.measuredScoreProbe(),null,'changed executable cannot use measured fact');
 global.ModuleLibrary.currentExecutableIdentity=()=>({digest});
 delete global.Actionable;assert.strictEqual(S.measuredScoreProbe(),null,'absent lexical provider fails closed');
 global.Actionable={isGameWord:()=>false};assert.strictEqual(S.measuredScoreProbe(),null,'unowned lexical token fails closed');
 S._probeActive={measuredFact:{command:'score'}};
 function line(text){const classes=new Set(['BufferLine']);return {nodeType:1,textContent:text,classList:{contains:x=>classes.has(x),add:x=>classes.add(x)},querySelectorAll:()=>[],setAttribute(){},classes};}
 const response=line('You have so far scored 0 out of a possible 10, in 1 turn.');
 const event=line('You have so far scored 0 out of a possible 10, in 1 turn. A guard arrives.');
 S.claimProbeNode(response);S.claimProbeNode(event);
 assert(response.classes.has('pl-stat-probe')&&event.classes.has('pl-stat-probe'),'whole probe turn hidden including game events');
 global.ModuleLibrary.currentExecutableIdentity=()=>({digest:executableIdentity('TreasuresofaSlaversKingdom.z8.js')});global.Actionable={isGameWord:()=>true};
 S.reset();assert(S.measuredProbe('prowess')&&Object.keys(S.model().stats).length===0,'combat fact seeds no readings');
 const combat='You wield only your bare, callused FIST. Adjusting for your abilities and progress, you do from 2 to 7 points of damage with each successful blow. Your odds of striking true are 80%. Your armor is only your rippling, well-tanned SKIN. You are uninjured, with your full complement of 15 Hit Points. A mighty Warrior, indeed!';
 assert(S.applyProwessReply(combat)&&S.model().stats.damage.upper===7&&S.model().stats.damage.max==null,'damage interval has no gauge denominator');
 assert(!S.applyProwessReply(combat.replace('2 to 7','8 to 7')),'reversed interval refused');
 S._probeActive={measuredFact:{command:'prowess',replyFamily:'combat-prowess'}};
 const combatLine=line(combat),mixedLine=line(combat+' A guard arrives.');S.claimProbeNode(combatLine);S.claimProbeNode(mixedLine);
 assert(combatLine.classes.has('pl-stat-probe')&&mixedLine.classes.has('pl-stat-probe'),'combat events emitted during probe are hidden');
 S.forgetReadings(S.model());assert(!S.model().stats.damage.confirmed&&!S.model().stats['hit odds'].confirmed,'restore invalidates combat readings');
 S.applyScoreReply('There is no score in this story.');assert(S.model().scoreUnavailable&&!S.needsScoreProbe(),'explicit no-score suppresses repeated command');
 S.forgetReadings(S.model());assert(!S.model().scoreUnavailable,'absence reading clears on restore/load');
 S.model().fulfillment='checking';S._probeActive=null;S._probeQueue=[];S._hideCarryProbe=false;S._carryProbeTimer=null;S.runProbeQueue();assert(S.model().fulfillment==='complete','carry-only queue completes without extra SCORE');
 const decoder=require('../js/StatusGridDecoder.js');decoder.installStatTracker(S);
 for(const value of ['2:26 pm','1 minute','Unstarted']){const decoded=decoder.decode('Hall     Time: '+value);assert(decoded.metrics.some(x=>x.key==='time'&&x.value===value)&&!decoded.roomCandidates.some(x=>x.startsWith('Time:'))&&S.statsFromColumns(S.splitColumns('Hall     Time: '+value)).time.value===value,'whole labelled time preserved: '+value);}
 S.reset();S.recordObservation(S.model(),'time',{label:'Time',value:'Unstarted',max:null,unit:'text'});S.recordObservation(S.model(),'time',{label:'Time',value:'Unstarted',max:null,unit:'text'});S._events=[];S.recordObservation(S.model(),'time',{label:'Time',value:'1 minute',max:null,unit:'text'});assert(S._events.length===0,'text transition never emits NaN numeric delta');
 const pair=decoder.decode('Forest     0/3',['Score','Moves']);assert(pair.metrics.some(x=>x.key==='turns'&&x.value===3)&&pair.metrics.every(x=>x.max==null),'measured pair is score/moves, never fraction maximum');assert(decoder.decode('Forest     0/3').metrics.length===0,'unowned pair remains ambiguous');
 for(const reply of ['(There is no score in this game.)',"There's no score in this game."]){S.reset();S.applyScoreReply(reply);assert(S.model().scoreUnavailable&&!S.needsScoreProbe(),'measured absence variant suppresses repeat SCORE');}
 assert(!S.parseScoreReply('No score was recorded for the previous match.'),'unrecognized absence wording does not suppress SCORE');
 S.reset();const expReply='You have achieved 0 out of 250 experience points. Your certainty is Lost.';
 const exp=S.parsePrintedMetrics(expReply);assert(exp.experience.value===0&&exp.experience.max===250&&exp.experience.boundSemantics==='maximum','EXP denominator never becomes current EXP');
 assert(S.parsePrintedMetrics('EXP: 20/50').experience.value===20,'labelled EXP fraction does not backtrack to a partial number');
 S.recordPrintedMetrics(S.model(),expReply,'score');assert(S.model().scoreMetricKey==='experience'&&S.model().stats.certainty.value==='Lost','command-owned EXP and certainty are distinct readings');
 S.recordObservation(S.model(),'experience',{label:'EXP',value:1,max:null,unit:'plain'});assert(S.model().stats.experience.max===250,'numerator grid preserves EXP command bound');
 S.forgetReadings(S.model());assert(S.model().stats.experience.max===null&&!S.model().stats.certainty.confirmed,'restore invalidates EXP bound and certainty');
 S.reset();S.recordPrintedMetrics(S.model(),expReply,'examine');assert(!S.model().stats.certainty,'unowned certainty prose is not a SCORE reading');
 assert(decoder.decode('Hall     2',['Moves']).metrics.some(x=>x.key==='turns'&&x.value===2),'authenticated single-field layout reads compact Moves');
 assert(decoder.decode('Hall     2').metrics.length===0,'unowned bare number remains ambiguous');
 S.reset();const holinessFact={command:'holiness',fields:['holiness.max'],replyFamily:'labelled-holiness'};
 assert(S.applyMeasuredMetricReply(holinessFact,'Your current holiness is 0 out of a possible holiness of 100, in 0 moves.')&&S.model().stats.holiness.max===100,'measured custom bound stays under its printed metric');
 S.recordObservation(S.model(),'holiness',{label:'Holiness',value:1,max:null,unit:'plain'});assert(S.model().stats.holiness.max===100,'grid numerator preserves measured custom bound');
 S.forgetReadings(S.model());assert(S.model().stats.holiness.max===null&&!S.model().stats.holiness.confirmed,'restore clears custom bound/readings');
 const magicFact={command:'magic',fields:['magic'],replyFamily:'possessive-magic'};
 assert(S.applyMeasuredMetricReply(magicFact,"Lornedei's magic is currently at 80.")&&S.model().stats.magic.label==="Lornedei's magic",'possessive metric retains its printed owner');
 S._fulfillmentStartedAt=S.model().stats.magic.readAt;assert(!S.needsMeasuredMetricProbe(magicFact),'fresh carry reading avoids duplicate MAGIC');
 S._fulfillmentStartedAt=S.model().stats.magic.readAt+1;assert(S.needsMeasuredMetricProbe(magicFact),'next opening refreshes command-only metric');
 S._probeActive={measuredFact:magicFact};const magicLine=line("Lornedei's magic is currently at 80."),magicEvent=line("Lornedei's magic is currently at 80. A guard arrives.");S.claimProbeNode(magicLine);S.claimProbeNode(magicEvent);assert(magicLine.classes.has('pl-stat-probe')&&magicEvent.classes.has('pl-stat-probe'),'custom probe reply and its turn events are hidden');
 for(const [raw,key,value] of [['Hall     Monday, 10:00 am','time','Monday, 10:00 am'],['Hall     June 3rd, 1993','date','June 3rd, 1993'],['Hall     Time:   Evening','time','Evening'],['Hall     Season: Autumn','season','Autumn']]){assert(S.statsFromColumns(S.splitColumns(raw))[key]?.value===value,'authored textual grid preserved: '+value);}
 assert(S.statsFromColumns(S.splitColumns('Hall     Time: 5252')).time.value===5252,'numeric galactic clock keeps numeric semantics');
 const bunny=S.parseScoreReply('You have scored 0 out of 60 points.\nYou have reached the rank of Novice Adventurer.');assert(bunny.max===60&&bunny.rank==='Novice Adventurer','measured score variant retains separate rank line');
 const aug=S.parseScoreReply('You have so far scored 0 out of a possible 70, in 1 turn, earning you the status of Musical Neophyte.');assert(aug.max===70&&aug.rank==='Musical Neophyte','authored status-of classification is retained');
 const fine=S.parseDiagnoseReply('You feel fine, and your memory is unimpaired.');assert(fine.health.value==='fine'&&fine.memory.value==='unimpaired','qualitative health and memory remain separate printed facts');
 S.reset();S.applyDiagnoseReply('You feel fine, and your memory is unimpaired.');assert(S.model().stats.health.unit==='text'&&S.model().stats.memory.value==='unimpaired','qualitative diagnosis has no invented ordinal scale');
 assert(!S.parseDiagnoseReply('You feel a little gravitationally inclined at the moment.'),'non-health diagnosis does not invent health');
 assert(!S.parseDiagnoseReply('The doctor says, "You feel fine."'),'quoted third-party line does not become direct health');
 assert(S.parseDiagnoseReply('Hang on a moment... yes, you\'re still breathing. Keep it up!').health.value==='still breathing','measured breathing assertion remains qualitative');
 assert(S.parseScoreReply('You have so far scored 0 out of a possible 86, in 2 turns, making you a Hairless Ape.').rank==='Hairless Ape','measured making-you classification is retained');
 assert(S.parseScoreReply('[You\'re one point short of the full 350.]').score===349,'remaining points determine current score without a seed');
 assert(!S.parseScoreReply('[You\'re almost there.]'),'unsupported qualitative estimate is not a score');
 assert(S.parseScoreReply('Score is not kept, but you can type SUMMARY to see some of what you have accomplished.').unavailable,'explicit no-score is distinct from narrative SUMMARY');
 const physical=S.parseDiagnoseReply("Well, you have a stomach full of chili, but you're ready to kick ass.");assert(physical.diagnosis.unit==='text'&&!physical.health,'physical report is preserved without invented health scale');
 assert(S.parseScoreReply('You have so far scored 0 out of a possible 200, in 1 turn. This makes you an innocent young woman.').rank==='innocent young woman','printed classification is stored');
 S.reset();S.recordPrintedMetrics(S.model(),'You have completed your divine Task.','score');assert(S.model().stats.task.value==='completed','command-owned task completion is retained');
 S.reset();S.recordPrintedMetrics(S.model(),'You have completed your divine Task.','examine');assert(!S.model().stats.task,'unowned narrative does not create task progress');
 assert(S.parseDiagnoseReply('Never have you been in better health.').health.unit==='text','qualitative health has no invented scale');
 S.reset();assert(S.applyMeasuredMetricReply({command:'score',fields:['temptations.max'],replyFamily:'named-counter-score'},'You have achieved 0 out of a possible 7 temptations, in 1 turn.')&&S.model().stats.temptations.max===7&&!S.model().stats.score,'named counter does not invent Score');
 assert(S.parseScoreReply('Grunk have 0 out of 7 so far.').max===7,'Grunk printed maximum retained');
 assert(S.parseScoreReply("You have so far scored 0 out of a possible, oh, let's say, 100, and in 1 turn no less.".replace(/ /g,'\u00a0')).max===100,'nonbreaking spaces preserve authored score syntax');
 assert(!S.parseDiagnoseReply('You are caught up in the collective chanting.\nThe wizard says "Magic as we know it is dying."'),'NPC dialogue is not player health');
 assert(S.parseDiagnoseReply('Your health is good, but you feel a bit worried about your family.').health.value==='good','direct qualitative health retained');
 assert(S.parseDiagnoseReply('On the verge of swooning from hunger.').hunger.unit==='text','authored hunger is qualitative');
 S.reset();assert(S.applyMeasuredMetricReply({replyFamily:'paired-counter-score'},'The score is: (Jack 1/Life 0)')&&S.model().stats.jack.value===1&&S.model().stats.life.value===0&&!S.model().stats.score,'paired counters retain separate names');
 S.reset();assert(S.applyMeasuredMetricReply({replyFamily:'ribbon-progress-score'},'You have experienced approximately 1 percent of this entry, earning you the coveted "Accidental Patron" white ribbon.')&&S.model().stats.progress.unit==='percent'&&S.model().rank==='Accidental Patron','ribbon progress retains rank without colour state');
 S.reset();assert(S.applyMeasuredMetricReply({replyFamily:'turns-only-score'},"After 2 turns, you still haven't found the truth about yourself.")&&S.model().scoreUnavailable&&S.model().stats.turns.value===2,'turns-only report does not invent score');
 const clipped='Hall     Score: 0/200     Time: 1';assert(!decoder.decode(clipped,null,clipped.length).metrics.some(x=>x.key==='time')&&decoder.decode(clipped,null,clipped.length).metrics.some(x=>x.key==='score'),'VM-width clipped last field omitted; earlier field retained');
 const complete='Hall     Score: 0/200     Time: 11:00am ';assert(decoder.decode(complete,null,complete.length).metrics.some(x=>x.key==='time'&&x.value==='11:00am'),'padded complete clock retained');
 assert(decoder.decode('Vault     Turn 2     0% complete').metrics.some(x=>x.key==='progress'&&x.unit==='percent'),'authored completion grid is percent progress');
 assert(S.parseScoreReply('There is no score. Either you defeat the Warlock Lord or you die.').unavailable,'explicit bare no-score confirms absence');
 assert(S.parseDiagnoseReply("Your virtual body's integrity appears to be normal.").health.value==='normal','virtual integrity remains qualitative health');
 S.reset();assert(S.applyMeasuredMetricReply({replyFamily:'percent-progress-score'},'You have so far scored 0% in 2 turns.')&&S.model().stats.progress.value===0,'percent report does not invent maximum');
 S.reset();assert(S.applyMeasuredMetricReply({replyFamily:'no-score-turns'},'No score 0 at all, but 0, you have this many turns2 .Hmm..')&&S.model().scoreUnavailable&&S.model().stats.turns.value===2,'explicit no-score retains moves');
 assert(S.parseScoreReply('Your score would be 0 [total of 646 points], in 1 move.\nThis score gives you a rank of Beginner.').max===646,'bracket total retains maximum');
 S.reset();S.recordPrintedMetrics(S.model(),'You have visited 1 locations (out of 4 in the game).','score');assert(S.model().stats.locations.max===4,'visited locations is separate bounded counter');
 S.reset();assert(S.applyMeasuredMetricReply({replyFamily:'rivals-progress'},'Thus far, you have eliminated none of your rivals. This gives you the rank of Palace Minister, still.')&&S.model().rank==='Palace Minister','rival progress retains classification');
 assert(S.statsFromColumns(S.splitColumns('Salon     Tone: cordial')).tone.value==='cordial','authored tone remains text');

 assert(S.parseScoreReply('You have so far scored 1 out of a possible 300, in 1 turn,\nSorry Excuse for a Reclaimer.').rank==='Sorry Excuse for a Reclaimer','rank on its own score continuation line');
 for(const [text,rank] of [
 ['You have so far scored 0 out of a possible 100, in 1 turn, which makes you -- Ralph, at your service.','Ralph, at your service'],
 ['You have so far scored 0 out of a possible 100, in 1 turn, the kind of score one would expect of the Embassy Stablehand.','Embassy Stablehand'],
 ['You have so far scored 0 out of a possible 100, in 1 turn, meaning you failed the admission criteria.','failed the admission criteria']]) {
  assert(S.parseScoreReply(text).rank===rank,'printed classification '+rank);
  assert(S.isOwnedStandardScoreLine(text),'exact numeric classification ownership '+rank);
 }
 assert(!S.isOwnedStandardScoreLine('Your score is 0 (total of 350 points), in 0 moves. A guard strikes you.'),'mixed event stays visible');
 assert(S.isOwnedStandardScoreLine('Your score is 0 (total of 350 points), in 0 moves.'),'classic ZIL ownership');
 assert(S.parseDiagnoseReply("You feel great, somehow as if you'd just been taught new tricks.").health.value==='great','great qualitative health');
 assert(S.parseDiagnoseReply("You're in peak physical condition; as peak as can be expected for a Classics student.").health.value==='peak physical condition','peak health without numeric scale');
 assert(S.parseDiagnoseReply('You are wide awake, and are in good health.').health.value==='good','combined sleep and health');
 assert(S.parseDiagnoseReply('You feel well-rested, and you are well-fed. In all other respects, you are in good health.').health.value==='good','combined Stationfall diagnosis');
 S.reset();S._probeQueue=[];S._probeActive=null;S._hideCarryProbe=false;S._carryProbeTimer=null;S.model().fulfillment='checking';global.Message={IsOpen:true};S.runProbeQueue();assert(S.model().fulfillment==='complete','carry-only completion does not wait on unrelated notice');delete global.Message;

 const customCases=[
 ['completed-adventure',['complete','turns'],'You have completed 0% of this adventure in 2 moves.','complete',0],
 ['metaphysical-quota',['quota.max','turns'],'You have amassed a metaphysical quota of 0 out of a possible 50, in 1 turn.','quota',0],
 ['adventurers-killed',['adventurers','turns'],'You have so far killed 0 adventurers in 1 turn.','adventurers',0],
 ['perfect-score',['score'],'You are a perfect 10.','score',10],
 ['casualty-cycles',['casualties','population','cycles'],'There have been 3,000 casualties (original population: 30,172,000) in 0 cycles.','population',30172000],
 ['mule-report',['date','time','location','value'],'Status report: MULE\nDate: 9/22/2062\nTime:  8:00 am\nLocation: DISCONNECTED\nAll systems functioning normally.\nAccording to my estimation, the objects I have collected have a total value of approximately 0 hundred dollars American.','value',0]
 ];for(const [replyFamily,fields,text,key,value] of customCases){S.reset();assert(S.applyMeasuredMetricReply({replyFamily,fields},text)&&S.model().stats[key].value===value,'custom printed '+replyFamily);}
 assert(!S.model().stats.score,'MULE report does not invent score');
 S.reset();S.applyMeasuredMetricReply({replyFamily:'perfect-score',fields:['score']},'You are a perfect 10.');assert(S.model().stats.score.max===null,'perfect adjective does not imply denominator');

 assert(decoder.decode('DISCONNECTED     09/22/2062     8:00 am').metrics.some(x=>x.key==='date'&&x.value==='09/22/2062'),'printed numeric date remains intact');
 assert(decoder.decode('Outside the Real Estate Office     day one').metrics.some(x=>x.key==='day'&&x.value===1),'printed word day is parsed without story name');
 assert(S.isOwnedStandardScoreLine('In a total of 1 turns, you have achieved a score of 0 points out of a possible 100.'),'achieved SCORE quiet ownership');
 assert(S.isOwnedStandardScoreLine('You have scored 0 out of 1, in this many turns: 1 ..'),'measured turns wording quiet ownership');

 S.reset();S.model().scoreMetricKey='quota';S.applyMeasuredMetricReply({replyFamily:'metaphysical-quota',fields:['quota.max','turns']},'You have amassed a metaphysical quota of 0 out of a possible 50, in 1 turn.');S.recordObservation(S.model(),'quota',{label:'Metaphysical quota',value:0,max:null,unit:'plain'});assert(S.model().stats.quota.max===50&&S.scoreMetricKey(S.model())==='quota','semantic score counter preserves printed bound after grid refresh');
 assert(decoder.decode('Drowning     Score: 0     Eight years before 2001').metrics.some(x=>x.key==='date'&&x.value==='Eight years before 2001'),'printed relative chronology retained without invented year');

 S.reset();assert(S.applyMeasuredMetricReply({replyFamily:'casualty-cycles',fields:['casualties','population','cycles']},'There have been 3,000 casualties (original population: 30,172,000) in 1 cycle.')&&S.model().stats.cycles.value===1,'singular cycle preserves custom report');
 S.reset();assert(S.applyMeasuredMetricReply({replyFamily:'completed-adventure',fields:['complete','turns','time spent']},'You have completed 0% of this adventure in 1 move.\nSome additional Statistics:\nYou spent 1 turns in the spacecraft. This accounts for 100% of your time.')&&S.model().stats['time spent'].value==='spacecraft: 1 turns (100%)','full per-location time breakdown retained');
 assert(S.isOwnedStandardScoreLine('Your score is 0 of a possible 100, in 1 move. Graded on the curve, you are in the class of Freshman.'),'Infocom score plus class owns singular move');

 S._probeActive={measuredFact:{command:'score',replyFamily:'inform-score'}};
 const infocomOwned=line('Your score is 0 of a possible 100, in 1 move. Graded on the curve, you are in the class of Freshman.');S.claimProbeNode(infocomOwned);assert(infocomOwned.classes.has('pl-stat-probe'),'actual ownership seam accepts singular Infocom class report');
 const eventLine=line('Your score is 0 of a possible 100, in 1 move. A guard strikes you.');S.claimProbeNode(eventLine);assert(eventLine.classes.has('pl-stat-probe'),'same ownership seam hides whole probe turn');

 const originalMeasured=S.measuredScoreProbe;S.measuredScoreProbe=()=>({command:'score',replyFamily:'mystery-progress-score',fields:['score.max','progress']});S.reset();S.applyScoreReply('You have so far scored 0 out of a possible 100 points; you are at the threshold of a foreboding mystery.');assert(S.model().stats.score.max===100&&S.model().stats.progress.value==='at the threshold of a foreboding mystery'&&S.model().rank===null,'score-owned milestone stays qualitative Progress');
 S._probeActive={measuredFact:S.measuredScoreProbe()};const mysteryLine=line('You have so far scored 0 out of a possible 100 points; you are at the threshold of a foreboding mystery.');S.claimProbeNode(mysteryLine);assert(mysteryLine.classes.has('pl-stat-probe'),'exact milestone ownership');S.measuredScoreProbe=originalMeasured;
 for(const text of ['Do you want to continue? (y/n)>','Do you want silly ZSCII graphics? (y/n)>','Would you like to read the introduction? (YES or NO)>','"And what\'s your name, little boy or--little boy?"','Please answer yes or no.>'])assert(S.isQuestionPromptText(text),'observed startup question blocks automatic probe');
 assert(!S.isQuestionPromptText('The guard asks you a question.')&&!S.isQuestionPromptText('What do you want to do?'),'ordinary narrative/command prompt remains available');

 S.reset();global.Actionable={isGameWord:()=>false};const fixtureDigest='fixture-glulx-form';const fixtureFact={command:'score',fields:['score.max'],replyFamily:'inform-score',outcome:'line',format:'glulx',validatedForm:true};S.SupplementalProbeFacts[fixtureDigest]=fixtureFact;
 let fixtureIdentity={digest:fixtureDigest,format:'gblorb',bytes:new Uint8Array([0x47,0x6c,0x75,0x6c])};global.ModuleLibrary.currentExecutableIdentity=()=>fixtureIdentity;
 assert(S.measuredScoreProbe()&&S.canAsk('score'),'isolated exact Glulx form needs no Z dictionary');
 assert(!S.measuredProbe('diagnose'),'unproved sibling form remains closed');
 assert(Object.keys(S.model().stats).length===0,'Glulx capability seeds no current reading');
 fixtureFact.validatedForm=false;assert(!S.measuredScoreProbe(),'unproved Glulx form remains closed');fixtureFact.validatedForm=true;
 fixtureIdentity.bytes[0]=0;assert(!S.measuredScoreProbe(),'wrong executable magic remains closed');fixtureIdentity.bytes[0]=0x47;
 fixtureIdentity.format='z5';assert(!S.measuredScoreProbe(),'Glulx exception cannot authorize Z form');fixtureIdentity.format='gblorb';
 fixtureIdentity.digest='different-build';assert(!S.measuredScoreProbe(),'changed executable cannot reuse exact proof');
 delete S.SupplementalProbeFacts[fixtureDigest];S.reset();
 S.reset();assert(S.applyMeasuredMetricReply({replyFamily:'chapter-regions',fields:['chapter','regions','first choice']},"You've made it to chapter two (out of ten), exploring three regions (out of twenty-two). And never forget that at first you chose love.")&&S.model().stats.chapter.value===2&&S.model().stats.chapter.max===10&&S.model().stats.regions.value===3&&S.model().stats.regions.max===22&&S.model().stats['first choice'].value==='love','progress parses changed words and authored choice');
 S.reset();assert(S.applyMeasuredMetricReply({replyFamily:'achievement-list',fields:['achievements']},'Achievements for Andromeda Apocalypse:\nHell of a Storm ( -???- )\nSurvivor ( achieved )')&&S.model().stats.achievements.value==='Hell of a Storm ( -???- ); Survivor ( achieved )'&&!S.model().stats.score,'preserve every printed achievement state without inventing points');
 assert(decoder.decode('ACU -> NOOP : TRUE     Memory: 508.4PB ').metrics.some(x=>x.key==='memory'&&x.value==='508.4PB'),'memory decimal and authored PB survive grid');
 delete fixtureFact.replyFamily;fixtureIdentity.digest=fixtureDigest;S.SupplementalProbeFacts[fixtureDigest]=fixtureFact;assert(!S.measuredScoreProbe(),'Glulx form without reply family remains closed');delete S.SupplementalProbeFacts[fixtureDigest];
 assert(S.isQuestionPromptText('Beside you, Rume shifts again, and you must choose. Do you make art, or make love?'),'observed story setup choice blocks automatic probes');
 assert(decoder.decode('The Tumble, Night  -  Chapter one').metrics.some(x=>x.key==='time'&&x.value==='Night'),'authored chapter header phase remains text time');
 const scrollGrid=decoder.decode('Entrance to the Library     0/100 points\nAct 1     11:15 pm\n1 problem     Turn 1');assert(scrollGrid.metrics.some(x=>x.key==='score'&&x.value===0&&x.max===100)&&scrollGrid.metrics.some(x=>x.key==='act'&&x.value===1)&&scrollGrid.metrics.some(x=>x.key==='problems'&&x.value===1),'three-row authored score act and problems');
 S._probeActive={measuredFact:{replyFamily:'inform-score',ownedReplyLines:['[To see what you are carrying, type INVENTORY.]']}};let hint=line('[To see what you are carrying, type INVENTORY.]');S.claimProbeNode(hint);assert(hint.classes.has('pl-stat-probe'),'authenticated exact score hint owned');let mixedHint=line('[To see what you are carrying, type INVENTORY.] A dragon attacks.');S.claimProbeNode(mixedHint);assert(mixedHint.classes.has('pl-stat-probe'),'score hint and its probe turn event are hidden');
 console.log('138 focused relationship/ownership contract checks passed');process.exit(0);
}
(async () => {
 const browser = await chromium.launch({headless:true});
 let checks=0;const evidence=[];
 function check(ok,label){assert(ok,label);checks++;}
 try {
 for(const width of quick ? [1280] : verify || verifyV3 || verifyGuss || verifyProwess || verifyNoScore ? [1280,360] : [Number(process.env.STATUS_WIDTH || 1280)]){
  const page = await browser.newPage({viewport:{width,height:850},isMobile:width<600,hasTouch:width<600});
  let stallTimer=null;
  if(process.argv.includes('--trace-stall')){
   const cdp=await page.context().newCDPSession(page);await cdp.send('Debugger.enable');
   cdp.on('Debugger.paused',async e=>{console.error('STALL STACK',JSON.stringify(e.callFrames.slice(0,10).map(f=>({fn:f.functionName,url:f.url,location:f.location}))));await cdp.send('Debugger.resume').catch(()=>{});});
   stallTimer=setInterval(()=>cdp.send('Debugger.pause').catch(()=>{}),10000);stallTimer.unref();page.on('close',()=>clearInterval(stallTimer));
  }
  const errors=[]; page.on('pageerror', e=>errors.push(e.message));
  await page.addInitScript(()=>{sessionStorage.setItem('PL_ParchLockSplashSeen','1');localStorage.setItem('PL_TutorialSeen','1');localStorage.setItem('PL_MobileTutorialSeen','1');localStorage.setItem('PL_LearnedWordsTutorialSeen','1');});
  await page.goto(pathToFileURL(path.resolve('play.html')).href+'?story=games/'+file);
  await page.waitForTimeout(6000);
  await page.evaluate(()=>{if(Message.IsOpen)Message.Hide();});
  await page.evaluate(()=>{window.__statusSubmissions=[];const original=Actionable.Submit;Actionable.Submit=function(command,source){window.__statusSubmissions.push({command,source});return original.apply(this,arguments);};const split=StatTracker.splitColumns;StatTracker.splitColumns=function(raw){if(/Score:\s*-?\d+\s+Moves:\s*\d+|(?:^| {3,})-?\d+\/\d+\s*$/i.test(raw))window.__observedMetricGrid=raw;return split.apply(this,arguments);};});
  async function state() { return page.evaluate(()=>({grid:StatTracker.statusText(),observedGrid:window.__observedMetricGrid,stats:StatTracker.visibleStats(),rank:StatTracker.model().rank,text:document.querySelector('#windowport')?.innerText.slice(-1800),input:document.querySelector('.Input.LineInput')?.value,char:!!document.querySelector('.Input.CharInput'),fulfillment:StatTracker.model().fulfillment,submissions:window.__statusSubmissions,rows:document.querySelector('#pl-stats-rows')?.innerText})); }
  async function checkpoint(label,expected){
   const s=await state();evidence.push({width,label,...s});
   if(!quick&&!verify&&!verifyV3&&!verifyGuss&&!verifyProwess&&!verifyNoScore&&!verifyGrid&&!verifyMetrics) console.log(label,JSON.stringify(s));
   if(verifyGrid){
    const raw=s.grid+'\n'+(s.observedGrid||''),named=/Score:\s*(-?\d+)\s+Moves:\s*(\d+)/i.exec(raw),pair=/(?:^| {3,})(-?\d+)\/(\d+)\s*$/.exec(raw),m=named||pair;
    check(m&&s.stats.some(x=>x.key==='score'&&x.confirmed&&x.value===+m[1])&&s.stats.some(x=>x.key==='turns'&&x.confirmed&&x.value===+m[2]),'current labelled/compact Score and Moves '+label+' '+width);
   }
   if(verifyGuss&&file==='Adventureland.z5.js'){
    const pair=/(?:^| {3,})(\d+)\/(\d+)(?:\s*$)/.exec(s.grid);
    if(pair)check(s.stats.some(x=>x.key==='score'&&x.value===+pair[1])&&s.stats.some(x=>x.key==='turns'&&x.value===+pair[2]),'compact grid pair has current Score/Moves '+label+' '+width);
   }
   if(verifyV3){
    const direct=await page.evaluate(()=>{
     const mem=ZRamProvider.getMem(),byte=a=>mem.getUint8(a),read=a=>(byte(a)<<8)|byte(a+1);
     if(!mem||byte(0)!==3||(byte(1)&2))return null;
     const globals=read(12),score=read(globals+2),turns=read(globals+4);
     return {score:score>32767?score-65536:score,turns};
    });
    check(direct&&Object.entries(direct).every(([key,value])=>s.stats.some(x=>x.key===key&&x.confirmed&&x.value===value))&&s.submissions.length===0,label+' current v3 ABI readings without commands '+width);
   }
   if(verify){
    for(const [key,value] of Object.entries(expected || {})){
     const metric=s.stats.find(x=>x.key===key);
     check(metric && metric.confirmed && metric.source==='status' && metric.value===value,label+' deterministic '+key+' '+width);
     const chip=page.locator('#pl-stats-rows .pl-stat-'+key+' .pl-stat-value');
     check(await chip.textContent()===String(value),label+' rendered '+key+' '+width);
    }
    check(s.stats.every(x=>['score','goals'].includes(x.key)),label+' no invented statistics '+width);
    check(s.submissions.length===0,label+' passive stats require no automatic command '+width);
   }
   return s;
  }
  await checkpoint('BOOT',verify?{score:0,goals:1}:null);
  let expected={score:0,goals:1},northCount=0,sawGussOpen=false;
  for(const command of commands){
   if(command==='@raminfo'){console.log('RAMINFO',JSON.stringify(await page.evaluate(()=>({keys:Object.keys(Quixe.get_vm_internals?.()||{}),debug:Quixe.get_debuginfo?.(),loaderDebug:GiLoad.get_debug_info?.()}))));continue;}
   if(command==='@probeinfo'){console.log('PROBEINFO',JSON.stringify(await page.evaluate(()=>({identity:ModuleLibrary.currentExecutableIdentity()?.digest,fact:StatTracker.measuredScoreProbe(),needScore:StatTracker.needsScoreProbe(),scoreLexical:Actionable.isGameWord('score'),stats:StatTracker.model().stats,active:StatTracker._probeActive,queue:StatTracker._probeQueue}))));continue;}
   if(command==='@advance-space'){
    await page.locator('.Input.CharInput').focus();
    let presses=0;
    while(await page.locator('.Input.CharInput').count()===1&&presses<40){await page.keyboard.press('Space');presses++;await page.waitForTimeout(500);}
    check(await page.locator('.Input.LineInput').count()===1,'explicit SPACE introduction returns a line prompt');
    if(!quick)console.log('INTRO SPACE PRESSES',presses);await checkpoint(command);continue;
   }
   if(command==='@space'){check(await page.locator('.Input.CharInput').count()===1,'explicit startup char prompt');await page.keyboard.press('Space');await page.waitForTimeout(1300);await checkpoint('AFTER SPACE',verify?expected:null);continue;}
   if(command==='@enter'){check(await page.locator('.Input.LineInput').count()===1,'explicit line continuation prompt');await page.locator('.Input.LineInput').press('Enter');await page.waitForTimeout(1300);await checkpoint(command);continue;}
   if(command.startsWith('@key:')){check(await page.locator('.Input.CharInput').count()===1,'explicit char prompt before '+command);await page.keyboard.press(command.slice(5));await page.waitForTimeout(1300);await checkpoint(command);continue;}
   if(command==='@close-notice'){if(await page.evaluate(()=>Message.IsOpen))await page.locator('#message #close').click();await page.waitForTimeout(6000);await checkpoint(command);continue;}
   if(command==='@question-equipment'){
    await page.evaluate(()=>EquipmentUI.Show());await page.waitForTimeout(500);
    check(await page.evaluate(()=>StatTracker.hasQuestionPrompt()&&window.__statusSubmissions.every(s=>s.source!=='stat-probe')&&StatTracker.model().fulfillment==='unavailable'),'actual question remains unanswered with zero automatic submissions');
    await page.evaluate(()=>EquipmentUI.Hide());await checkpoint(command);continue;
   }
   if(command==='@normal-command-guard'){
    check(await page.evaluate(()=>!StatTracker.hasQuestionPrompt()&&StatTracker.probeSafeNow()),'normal command prompt remains available after answering startup');await checkpoint(command);continue;
   }
   if(command==='@equipment'||command==='@reopen'){
    await page.evaluate(reopen=>{if(reopen)EquipmentUI.Hide();EquipmentUI.Show();},command==='@reopen');await page.waitForTimeout(1800);
    if(verifyMetrics){
     assert(metricDetails,'validated special-field fixture exists');
     if(await page.evaluate(()=>Message.IsOpen))await page.locator('#message #close').click();
     await page.waitForFunction(()=>!StatTracker._probeActive&&!StatTracker._probeQueue.length&&!StatTracker._hideCarryProbe&&!StatTracker._carryProbeTimer,null,{timeout:file==='TheLurkingHorror.z3.js'?120000:10000});
     const s=await state();
     const ok=Object.entries(metricDetails).every(([key,want])=>{const reading=s.stats.find(x=>x.key===key);return reading?.confirmed&&(want.value===undefined||reading.value===want.value)&&(want.max===undefined||reading.max===want.max)&&(want.band===undefined||reading.band===want.band)&&(!want.rank||s.rank===want.rank&&s.rows.includes(want.rank))&&(!want.pattern||new RegExp('^'+want.pattern+'$').test(reading.value))&&s.rows.includes(String(reading.value??reading.band));})&&(file!=='forms.z5.js'||await page.evaluate(()=>StatTracker.model().scoreUnavailable))&&s.fulfillment==='complete'&&await page.locator('.Input.LineInput').isVisible();
     if(!ok)console.error('METRIC STATE',JSON.stringify(s));check(ok,'special fields confirmed/rendered on '+command+' '+width);
     if(['BlueLacuna.gblorb.js','AndromedaApocalypse.gblorb.js'].includes(file)){const quiet=await page.evaluate(()=>{const family=StatTracker.measuredScoreProbe().replyFamily;const replies=Array.from(document.querySelectorAll('.BufferLine')).filter(x=>family==='chapter-regions'?/^You've made it to chapter/.test(x.textContent.trim()):/^(?:Achievements for|[A-Za-z].*\( -[?]{3}- \)$)/.test(x.textContent.trim()));return replies.length>0&&replies.every(x=>x.closest('.pl-stat-probe')?.getAttribute('aria-hidden')==='true');});check(quiet,'actual custom reply lines owned quietly '+command);}
    }
    if(verifyGuss){
     if(await page.evaluate(()=>Message.IsOpen))await page.locator('#message #close').click();
     try {await page.waitForFunction(max=>StatTracker.model().stats.score?.max===max && !StatTracker._probeActive && !StatTracker._probeQueue.length,details.max,{timeout:7000});}
     catch(e){console.error(JSON.stringify(await state()));console.error('PROBE DEBUG',JSON.stringify(await page.evaluate(()=>({identity:ModuleLibrary.currentExecutableIdentity()?.digest,fact:StatTracker.measuredScoreProbe(),verbs:GrammarProvider.readVerbWords(ZRamProvider.getMem()),active:StatTracker._probeActive,queue:StatTracker._probeQueue}))));throw e;}
     const s=await state(),score=s.stats.find(x=>x.key==='score');
     const probes=s.submissions.filter(x=>x.command==='score');
     const headless=await page.evaluate(()=>{
      const replies=Array.from(document.querySelectorAll('.BufferLine')).filter(x=>x.textContent.includes('You have so far scored'));
      return replies.length>0&&replies.every(x=>{const owner=x.closest('.pl-stat-probe');if(!owner)return false;const style=getComputedStyle(owner);return owner.getAttribute('aria-hidden')==='true'&&style.clip!=='auto'&&parseFloat(style.width)<=1;});
     });
     const rank=await page.evaluate(()=>StatTracker.model().rank);
     const ok=score?.confirmed&&score.value===details.score&&score.max===details.max&&await page.locator('.pl-stat-score .pl-stat-value').textContent()===details.score+' / '+details.max&&(!details.rank||rank===details.rank&&s.rows.includes(details.rank))&&probes.length===(sawGussOpen?2:1)&&headless&&await page.locator('.Input.LineInput').isVisible();
     if(!ok){console.error('CHECK STATE',JSON.stringify(s));console.error('CHECK DOM',JSON.stringify(await page.evaluate(()=>Array.from(document.querySelectorAll('.BufferLine')).slice(-6).map(x=>x.outerHTML))));}
     check(ok,'current headless maximum and deterministic numerator '+width);
     sawGussOpen=true;
    }
    if(verifyProwess){
     if(await page.evaluate(()=>Message.IsOpen))await page.locator('#message #close').click();
     await page.waitForFunction(()=>StatTracker.model().stats.damage?.confirmed && !StatTracker._probeActive && !StatTracker._probeQueue.length,null,{timeout:10000});
     const s=await state(),damage=s.stats.find(x=>x.key==='damage'),odds=s.stats.find(x=>x.key==='hit odds');
     const hidden=await page.evaluate(()=>Array.from(document.querySelectorAll('.BufferLine')).filter(x=>/Adjusting for your abilities|You have so far scored/.test(x.textContent)).every(x=>{const p=x.closest('.pl-stat-probe');return p&&p.getAttribute('aria-hidden')==='true'&&getComputedStyle(p).clip!=='auto';}));
     check(damage?.value===2&&damage.upper===7&&damage.max==null&&odds?.value===80&&s.stats.some(x=>x.key==='health'&&x.value===15&&x.max===15&&x.source==='status')&&s.stats.some(x=>x.key==='quest rate'&&x.max===500)&&s.rows.includes('2 to 7')&&s.rows.includes('80%')&&hidden&&await page.locator('.Input.LineInput').isVisible(),'grid health plus current headless damage interval and odds '+width);
    }
    if(verifyNoScore){
     if(await page.evaluate(()=>Message.IsOpen))await page.locator('#message #close').click();
     await page.waitForTimeout(5500);
     const s=await state();const ok=await page.evaluate(()=>StatTracker.model().scoreUnavailable)&&!s.stats.some(x=>x.key==='score')&&s.submissions.filter(x=>x.command==='score').length===1&&s.fulfillment==='complete'&&await page.locator('.Input.LineInput').isVisible();if(!ok)console.error('NO SCORE STATE',JSON.stringify(s));check(ok,'explicit no-score remains fulfilled on Equipment '+width);
     if(file==='PataNoir.gblorb.js'){const moves=s.stats.find(x=>x.key==='turns');check(moves?.confirmed&&moves.source==='status'&&s.rows.includes(String(moves.value)),'authored bare moves remain shown');}
     if(file.endsWith('.gblorb.js')){const guard=await page.evaluate(()=>!window.__statusSubmissions.some(x=>x.command==='diagnose')&&Array.from(document.querySelectorAll('.BufferLine')).filter(x=>x.textContent.trim()==='There is no score in this story.').every(x=>x.closest('.pl-stat-probe')?.getAttribute('aria-hidden')==='true'));check(guard,'Glulx SCORE quiet and unsupported DIAGNOSE not sent');}
    }
    if(verifyProgress){
     if(await page.evaluate(()=>Message.IsOpen))await page.locator('#message #close').click();
     await page.waitForFunction(()=>StatTracker.model().stats.progress?.confirmed&&!StatTracker._probeActive&&!StatTracker._probeQueue.length,null,{timeout:10000});
     const s=await state();const headless=await page.evaluate(()=>Array.from(document.querySelectorAll('.BufferLine')).filter(x=>x.textContent.trim()==='You have barely gotten started.').every(x=>x.closest('.pl-stat-probe')?.getAttribute('aria-hidden')==='true'));
     check(s.stats.some(x=>x.key==='progress'&&x.value==='You have barely gotten started.'&&x.unit==='text'&&x.max==null)&&s.rows.includes('You have barely gotten started.')&&!s.submissions.some(x=>x.command==='score')&&headless&&await page.locator('.Input.LineInput').isVisible(),'current qualitative progress via owned STATUS '+width);
    }
    await checkpoint(command,verify?expected:null);
    if(verify){check(await page.locator('#pl-stats-rows .pl-stat-score').isVisible(),'Equipment score visible '+width);check(await page.locator('#pl-stats-rows .pl-stat-goals').isVisible(),'Equipment goals visible '+width);}
    continue;
   }
   await page.evaluate(()=>EquipmentUI.Hide());
   const input=page.locator('.Input.LineInput');
   if(!await input.count()) throw Error('No line prompt before '+command);
   await input.fill(command); await input.press('Enter'); await page.waitForTimeout(1300);
   if(command==='wave x-remover at codex')expected={score:1,goals:1};
   if(command==='north'&&++northCount===2)expected={score:4,goals:3};
   // Undo follows three meta commands. Assert against live grid below rather
   // than assume whether this story undoes a meta command or the last move.
   const s=await checkpoint('AFTER '+command,verify&&command!=='undo'?expected:null);
   if(verify&&command==='undo'){
    check(/previous turn|undone|undo/i.test(s.text),'story accepted undo '+width);
    const sm=/Score:\s*(\d+)/.exec(s.grid),gm=/Goals:\s*(\d+)/.exec(s.grid);
    check(!!sm&&!!gm,'post-undo authored values available '+width);
    expected={score:Number(sm[1]),goals:Number(gm[1])};await checkpoint('UNDO GRID PARITY',expected);
   }
  }
  check(errors.length===0,'no browser errors '+width);
  await page.close();
 }
  const summary=evidence.map(({width,label,grid,stats,fulfillment,submissions})=>({width,label,grid,stats:stats.map(({key,value,max,source})=>({key,value,max,source})),fulfillment,submissions}));
  console.log(JSON.stringify({file,executableSha256:executableIdentity(file),checks,evidence:process.env.STATUS_EVIDENCE?evidence:summary}));
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
