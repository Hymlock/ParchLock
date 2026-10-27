const fs=require('fs'),path=require('path');const {pathToFileURL}=require('url');const {chromium}=require(path.join(process.cwd(),'node_modules/playwright'));
const out=path.join(__dirname,'glulx-startup-current.json');let browser;
(async()=>{
 browser=await chromium.launch();const rows=[];
 for(const game of ['AndromedaApocalypse.gblorb.js','CounterfeitMonkey.gblorb.js']){
 const p=await browser.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{sessionStorage.setItem('PL_ParchLockSplashSeen','1');for(const k of ['PL_TutorialSeen','PL_MobileTutorialSeen','PL_LearnedWordsTutorialSeen'])localStorage.setItem(k,'1');});
 await p.goto(pathToFileURL(path.join(process.cwd(),'play.html')).href+'?story=games/'+game,{timeout:10000,waitUntil:'domcontentloaded'});
 const start=Date.now();let prompt=false;
 while(Date.now()-start<10000){await p.evaluate(()=>{document.querySelector('.parchlock-splash__start')?.click();try{Message.Hide();}catch(e){}});if(await p.locator('.Input.LineInput').count()){prompt=true;break;}if(await p.locator('.Input.CharInput').count())await p.keyboard.press('Space');await p.waitForTimeout(150);}
 const row={game,prompt,elapsedMs:Date.now()-start,errors,body:(await p.locator('body').innerText()).slice(-700)};rows.push(row);await p.close();if(!prompt)throw new Error('No prompt '+game);
 }
 fs.writeFileSync(out,JSON.stringify({status:'PASS',rows},null,2));console.log(JSON.stringify(rows));
})().catch(e=>{fs.writeFileSync(out,JSON.stringify({status:'FAIL',error:e.message},null,2));console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();});
setTimeout(()=>{console.error('Independent 30s watchdog');process.exit(2);},30000).unref();
