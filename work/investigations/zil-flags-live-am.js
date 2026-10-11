// grok2 A-M copy of Codex's codex-zil-flags-live.js (2026-10-11), separate output. Read-only A-M research: native commands plus passive VM method observation.
// Does not apply facts. ONLY=comma-separated filenames narrows one run.
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const { pathToFileURL } = require('url');
const { analyze } = require('./zil-attr-analyzer.js');
const root = path.resolve(__dirname, '../..');
const matrix = JSON.parse(fs.readFileSync(path.join(__dirname, '2026-10-11-zil-matrix.json')));
const roles = JSON.parse(fs.readFileSync(path.join(__dirname, '2026-10-11-zil-dispatch-proof.json')));
const assigned = new Set(['Ballyhoo.z3.js','Borderzo.z5.js','Cutthroats.z3.js','Deadline.z3.js','Enchanter.z3.js','HollywoodHijinx.z3.js','Infidel.z3.js','LeatherGoddessesofPhobos.z3.js','Moonmist.z3.js','PlunderedHearts.z3.js','Hitchhik.z5.js','TheLurkingHorror.z3.js']);
const only = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null;
const keys = ['open','container','supporter','openable','locked','light','on','switchable','worn','takeable','transparent'];
const outputPath = path.join(__dirname, '2026-10-11-zil-flags-proof-am.json');
let output = {}; try { output = JSON.parse(fs.readFileSync(outputPath)); } catch (_) {}
const save = () => fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + '\n');
(async () => {
 const browser = await chromium.launch({headless:true});
 try {
  for (const game of matrix.order.filter(g => assigned.has(g) && (!only || only.has(g)))) {
   const row = matrix.rows[game];
   const previous=output[game];
   const priorRuns=previous ? [...(previous.priorRuns||[]),{...previous,priorRuns:undefined}] : [];
   const record = output[game] = { stage:'research only; no runtime facts', route:process.env.ROUTE||null, priorRuns, keys:{}, commands:[] };
   for (const key of keys) record.keys[key] = { candidate:row.keys[key]?.value ?? null, status:'unknown', reason:'native semantic positive/negative proof pending' };
   const match = /^var(\d+)$/.exec(row.prso || '');
   const role = match && +match[1];
   if (!/confirmed-zil-family\/validated/.test(row.classification) || !role || role < 16 || role > 255) {
    record.blocked = 'classification or global PRSO hypothesis unqualified'; save(); console.log(game + ': ' + record.blocked); continue;
   }
   record.roleEvidence = roles[game]?.prso?.status || 'unproven';
   const a = analyze(game), routines = {};
   const verbs = ['examine','read','open','close','turn on','turn off','wear','take off'];
   for (const verb of verbs) {
    const alternatives=verb==='examine'?['examine/1','examin/1','look at/1']:verb==='turn on'?['turn on/1','light/1']:verb==='turn off'?['turn off/1','extinguish/1']:[verb+'/1'];
    const key=alternatives.find(k=>a.byVerb[k]!=null);
    if(key)routines[a.routineAddr(a.byVerb[key])]=verb;
   }
   const page = await browser.newPage({viewport:{width:1000,height:900}});
   try {
    await page.addInitScript(() => { let seed=12345; Math.random=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x80000000;};sessionStorage.setItem('PL_ParchLockSplashSeen','1');for(const k of ['PL_TutorialSeen','PL_MobileTutorialSeen','PL_LearnedWordsTutorialSeen'])localStorage.setItem(k,'1'); });
    await page.goto(pathToFileURL(path.join(root,'play.html')).href + '?story=games/' + game);
    await page.waitForTimeout(3500);
    for(let i=0;i<12 && !await page.locator('.Input.LineInput').count();i++){const c=page.locator('.Input.CharInput');if(await c.count()){await c.first().focus();await page.keyboard.press('Space');}await page.waitForTimeout(300);}
    if(!await page.locator('.Input.LineInput').count()) throw Error('boot has not reached a line prompt');
    await page.evaluate(({routines,role}) => {
     const machine=window.__PARCHLOCK_ZVM__, original=machine.call, originalRet=machine.ret, originalRun=machine.run;
     const watchedFrames=[];let nativeRunDepth=0;
     window.__codexFlagOps=[];
     const prso=()=>{const m=ZRamProvider.getMem();return m.getUint16(m.getUint16(12)+2*(role-16));};
     machine.run=function(){nativeRunDepth++;try{return originalRun.apply(this,arguments);}finally{nativeRunDepth--;}};
     machine.call=function(t){const addr=t*this.addr_multipler,tag=routines[addr],before=prso();const result=original.apply(this,arguments);if(tag){watchedFrames.push({tag,depth:this.frames.length});window.__codexFlagOps.push({dispatch:tag,prso:before});}return result;};
     machine.ret=function(){const result=originalRet.apply(this,arguments);while(watchedFrames.length&&watchedFrames[watchedFrames.length-1].depth>this.frames.length)watchedFrames.pop();return result;};
     for(const op of ['test_attr','set_attr','clear_attr']){const native=machine[op];if(typeof native!=='function')throw Error('missing native '+op);machine[op]=function(){const args=Array.from(arguments), result=native.apply(this,args),frame=watchedFrames[watchedFrames.length-1];if(nativeRunDepth&&frame)window.__codexFlagOps.push({op,args,result,prso:prso(),verbContext:frame.tag});return result;};}
    },{routines,role});
    if(process.env.ROUTE)for(const command of process.env.ROUTE.split('|')){
     await page.evaluate(()=>{window.__codexFlagOps=[];});
     await page.locator('.Input.LineInput').fill(command);await page.keyboard.press('Enter');await page.waitForTimeout(700);
     const routeSample=await page.evaluate(()=>({ops:window.__codexFlagOps.slice(),reply:Array.from(document.querySelectorAll('.BufferLine')).slice(-8).map(l=>l.textContent).join(' | ')}));
     (record.routeSamples||(record.routeSamples=[])).push({command,...routeSample});
     if(!await page.locator('.Input.LineInput').count())throw Error('route left line prompt: '+command);
    }
    const targets=await page.evaluate(candidateKeys => {
     WorldModel.tick();const p=WorldModel.lastPayload||{},m=ZRamProvider.getMem();
     const pool=[...(p.inventory||[]),...(p.discoveredObjects||[])];
     for(const holder of [p.roomId,p.playerId])if(holder)for(const id of ZRamReader.children(m,holder)||[])if(!pool.some(o=>o.id===id))pool.push({id,name:ZRamReader.shortName(m,id)});
     return pool.filter(o=>o.id && o.id!==p.playerId).map(o=>({id:o.id,name:o.name,attrBytes:ZRamReader.objectLinks(m,o.id)?.attrBytes,words:(ZRamReader.parserWordsAny(m,o.id)||[]).map(String).filter(w=>/^[a-z-]{3,}$/i.test(w))})).map((o,_,all)=>({...o,word:o.words.find(w=>!all.some(x=>x.id!==o.id&&x.words.includes(w))),candidateKinds:['light','wearable'].filter(key=>{const bit=candidateKeys[key]?.value;return Number.isInteger(bit)&&o.attrBytes&&(o.attrBytes[bit>>3]&(128>>(bit&7)));})})).filter(o=>o.word).sort((a,b)=>b.candidateKinds.length-a.candidateKinds.length).slice(0,4);
    },row.keys);
    record.targets=targets;
    for(const target of targets){
     const commands=['examine','open','close'];
     if(target.candidateKinds.includes('light'))commands.push('turn on','turn off');
     else if(targets.some(t=>t.candidateKinds.includes('light')))commands.push('turn on');
     if(target.candidateKinds.includes('wearable'))commands.push('take off','wear');
     else if(targets.some(t=>t.candidateKinds.includes('wearable')))commands.push('wear');
     for(const verb of commands) {
      if(!Object.values(routines).includes(verb))continue;
      await page.evaluate(()=>{window.__codexFlagOps=[];});
      const command=verb+' '+target.word;
      await page.locator('.Input.LineInput').fill(command);await page.keyboard.press('Enter');await page.waitForTimeout(900);
      const evidence=await page.evaluate(()=>({ops:window.__codexFlagOps.slice(),reply:Array.from(document.querySelectorAll('.BufferLine')).slice(-5).map(l=>l.textContent).join(' | ')}));
      record.commands.push({command,target,...evidence});
      if(!await page.locator('.Input.LineInput').count()){record.stopped='native parser left line prompt';break;}
     }
     if(record.stopped)break;
    }
    // Observe all candidate bits without assigning guessed semantics.
    for(const key of keys){const entry=record.keys[key];if(!Number.isInteger(entry.candidate))continue;
     entry.samples=record.commands.flatMap(c=>c.ops.filter(op=>op.args?.[1]===entry.candidate&&op.args[0]===c.target.id).map(op=>({command:c.command,target:c.target.id,op:op.op,result:op.result,dispatchMatch:c.ops.some(x=>x.dispatch&&x.prso===c.target.id)})));
     if(entry.samples.length)entry.reason='native samples collected; semantic/branch and positive-negative review still required';
    }
   } catch(e){record.error=e.message;} finally {await page.close();save();}
   console.log(game+': '+record.commands.length+' native command samples; no facts promoted');
  }
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

