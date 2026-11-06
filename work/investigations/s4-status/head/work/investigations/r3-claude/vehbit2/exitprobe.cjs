const path=require('path'),{pathToFileURL}=require('url');
const { chromium } = require(process.cwd() + '/node_modules/playwright');
(async()=>{const story=process.argv[2];const b=await chromium.launch({headless:true});const p=await b.newPage();
await p.addInitScript(()=>{try{sessionStorage.setItem('PL_ParchLockSplashSeen','1')}catch(e){}});
await p.goto(pathToFileURL(path.resolve('play.html')).href+'?story=games/'+story);await p.waitForTimeout(3000);
try{await p.click('.parchlock-splash__start',{timeout:1500})}catch(e){}
await p.evaluate(()=>{try{Message.Hide()}catch(e){}});await p.waitForTimeout(800);
console.log(JSON.stringify(await p.evaluate(()=>{const m=ZRamProvider.getMem();const r=WorldModel.lastPayload.roomId;
 let a,b2;try{a=ExitCalibrator.exitsFor(m,r).map(e=>e.label+'>'+e.targetRoomName)}catch(e){a=String(e)}
 try{b2=ExitCalibrator._d214ZilExitsFor(m,r)}catch(e){b2=String(e)}return {r,a,b2:JSON.stringify(b2).slice(0,600)}})));await b.close();})();
