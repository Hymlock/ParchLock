const { chromium } = require(process.cwd() + '/node_modules/playwright'); const { pathToFileURL } = require('url'); const path=require('path'),fs=require('fs');
const ROOT='work/investigations/s4-status/head', OUT='work/investigations/s4-status';
(async()=>{const b=await chromium.launch(); const res={};
for (const [g,cmds] of [['Sherlock.z5.js',['look','wait','i']],['curses.z5.js',['look','wait','i']]]) for (const vw of [[1280,900],[396,850]]) {
 const p=await b.newPage({viewport:{width:vw[0],height:vw[1]}});
 await p.addInitScript(()=>{let s=12345;Math.random=()=>{s=(s*1103515245+12345)&0x7fffffff;return s/0x80000000;};});
 await p.addInitScript(()=>{sessionStorage.setItem('PL_ParchLockSplashSeen','1');for(const k of ['PL_TutorialSeen','PL_MobileTutorialSeen','PL_LearnedWordsTutorialSeen'])localStorage.setItem(k,'1');});
 await p.goto(pathToFileURL(path.resolve(ROOT,'play.html')).href+'?story=games/'+g); await p.waitForTimeout(2500);
 const settle=async()=>{for(let i=0;i<25;i++){await p.evaluate(()=>{document.querySelector('.parchlock-splash__start')?.click();try{Message.Hide();}catch(e){}});if(await p.locator('.Input.LineInput').count())return true;await p.keyboard.press('Space');await p.waitForTimeout(500);}return false;};
 await settle(); for(const c of cmds){await p.evaluate(c=>{Input.Clear();Input.Inject(c,true);},c);await p.waitForTimeout(1500);await settle();}
 const tag=g.split('.')[0]+'-'+vw[0];
 res[tag]=await p.evaluate(()=>{const raw=StatusGridDecoder.readRaw(document);let tr=null;try{tr=(StatTracker.confirmed?StatTracker.confirmed():StatTracker.stats||null);}catch(e){tr=String(e)}
  return {raw, decoded:StatusGridDecoder.decode(raw), gridText:[...document.querySelectorAll('.GridWindow')].map(e=>e.innerText), strip:[...document.querySelectorAll('#pl-stats, .pl-stats, [class*=metric]')].map(e=>e.className+': '+e.innerText.slice(0,300)), tracker:tr};});
 await p.screenshot({path:OUT+'/'+tag+'.png'}); await p.close();}
fs.writeFileSync(OUT+'/probe.json',JSON.stringify(res,null,1)); await b.close();})();
