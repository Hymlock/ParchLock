'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert'),{chromium}=require(process.cwd()+'/node_modules/playwright'),{pathToFileURL}=require('url');
const output=path.join(__dirname,'delayed-marks-diagnostic.json');assert(!fs.existsSync(output));
const roots={base:'C:/Users/hymlo/Downloads/Projects/Parchmap-learning-base-20261102',r3:'C:/Users/hymlo/Downloads/Projects/Parchmap-learning-final-r3-20261102'};
const rows=[];
(async()=>{for(const [label,root] of Object.entries(roots)){
 const b=await chromium.launch();try{for(const game of ['cabal.z5.js','heist.z8.js']){
  const p=await b.newPage({viewport:{width:1280,height:900}});
  await p.addInitScript(()=>{let s=12345;Math.random=()=>{s=(s*1103515245+12345)&0x7fffffff;return s/0x80000000;};sessionStorage.setItem('PL_ParchLockSplashSeen','1');for(const k of ['PL_TutorialSeen','PL_MobileTutorialSeen','PL_LearnedWordsTutorialSeen'])localStorage.setItem(k,'1');});
  await p.goto(pathToFileURL(path.join(root,'play.html')).href+'?story=games/'+game);await p.waitForTimeout(4000);
  const settle=async()=>{for(let i=0;i<25;i++){await p.evaluate(()=>{document.querySelector('.parchlock-splash__start')?.click();try{Message.Hide();}catch(e){}});if(await p.locator('.Input.LineInput').count())return;const c=p.locator('.Input.CharInput');if(await c.count())await c.first().focus();await p.keyboard.press('Space');await p.waitForTimeout(120);}throw Error('No input');};
  await settle();await p.evaluate(()=>{Input.Clear();Input.Inject('look',true);});await p.waitForTimeout(1300);await settle();
  async function snap(stage){const state=await p.evaluate(()=>{
   // Passive reads only: never payloadPool/referenceFor/provider/Refresh/tick.
   const mem=ZRamProvider.getMem(),body=[...document.querySelectorAll('.BufferLine')].map(e=>e.textContent),payload=WorldModel.lastPayload||{};
   const plain=v=>{try{return JSON.parse(JSON.stringify(v));}catch(e){return String(v);}};
   return {ram:mem?Array.from(new Uint8Array(mem.buffer,mem.byteOffset||0,mem.byteLength)):[],text:body,room:payload.roomId,
    marks:[...document.querySelectorAll('.pl-act')].slice(-25).map(e=>({text:e.textContent.trim(),data:{...e.dataset},visible:!!e.getClientRects().length,line:e.closest('.BufferLine')?.textContent,parent:e.parentElement?.id||e.parentElement?.className})),
    targetObjects:(payload.discoveredObjects||[]).concat(payload.inventory||[]).filter(o=>/table|frame/i.test(o.name||'')).map(plain),
    restoredLabels:plain(Actionable._restoredLabels),verifiedNouns:plain(Actionable.VerifiedNouns),commandNouns:plain(Actionable.CommandNouns),scope:plain(Actionable.Scope),
    liveMarks:(Actionable.LiveMarks||[]).map(e=>({text:e.textContent,data:{...e.dataset}})),table:plain(AttrCalibrator.table),wordRows:plain(LearnedWords._data),generation:UndoRestoreSync.generation,digest:ModuleLibrary.currentExecutableDigest()};
  });const ram=Buffer.from(state.ram);delete state.ram;state.ramSha256=crypto.createHash('sha256').update(ram).digest('hex');state.textSha256=crypto.createHash('sha256').update(state.text.join('\n')).digest('hex');rows.push({label,root,game,stage,state});}
  await snap('driver-sample');await p.waitForTimeout(1500);await snap('passive-delay-same-page');await p.close();
 }}finally{await b.close();}}
 fs.writeFileSync(output,JSON.stringify({tier:'Same driver seed/LOOK, natural startup wait4000ms instead of2000ms; passive snapshots only; no scope/provider/refresh observation calls, VM writes, extra gameplay or teaching',rows},null,2));
 console.log(JSON.stringify(rows.map(r=>({label:r.label,game:r.game,stage:r.stage,ram:r.state.ramSha256,text:r.state.textSha256,marks:r.state.marks.map(m=>({text:m.text,id:m.data.objectId,visible:m.visible,parent:m.parent}))}))));
})().catch(e=>{fs.writeFileSync(output,JSON.stringify({error:e.stack,rows},null,2));console.error(e.stack);process.exitCode=1;});
