const { chromium } = require('playwright'), assert = require('assert'), path = require('path'), {pathToFileURL} = require('url');
let checks=0;
function check(value,text){assert(value,text);checks++;console.log('PASS:',text.split(' {')[0]);}
async function boot(browser,width,height){
 const context=await browser.newContext({viewport:{width,height},isMobile:width<600,hasTouch:width<600}),page=await context.newPage();page.errors=[];page.on('pageerror',e=>page.errors.push(e.message));
 await page.addInitScript(()=>{sessionStorage.setItem('PL_ParchLockSplashSeen','1');localStorage.setItem('PL_TutorialSeen','1');localStorage.setItem('PL_LearnedWordsTutorialSeen','1');});
 await page.goto(pathToFileURL(path.resolve('play.html')).href+'?story=games/wump2ka.z5.js');await page.waitForTimeout(3500);
 await page.evaluate(()=>{if(Message.IsOpen)Message.Hide();});
 for(let i=0;i<8&&!await page.locator('.Input.LineInput').count();i++){await page.keyboard.press('Space');await page.waitForTimeout(300);}
 if(await page.locator('.Input.LineInput').count()) {await page.locator('.Input.LineInput').fill('no');await page.keyboard.press('Enter');await page.waitForTimeout(1000);}
 for(let i=0;i<15&&!await page.locator('.Input.LineInput').count();i++){await page.keyboard.press('Space');await page.waitForTimeout(200);}
 await page.waitForTimeout(1500);
 return {context,page};
}


(async()=>{const browser=await chromium.launch({headless:true});try{
for(const width of [1280,360]){
 const {page,context}=await boot(browser,width,850);
 await page.evaluate(()=>LearnedWords.open());
 check(await page.locator('.lw-section-header:visible').count()===2,'fresh launch renders only two default banners '+width);
 check(await page.locator('.lw-section-header[data-section=actions]').isVisible()===false&&await page.locator('.lw-section-header[data-section=names]').isVisible()===false,'actual CSS hides default-off headers '+width);
 await page.evaluate(()=>{localStorage.removeItem(LearnedWords.TUTORIAL_KEY);LearnedWords.startTour();});
 await page.locator('.lw-tour button').filter({hasText:/^Skip$/}).click();
 check(await page.locator('.lw-section-header:visible').count()===2,'first tutorial restores actual banner visibility '+width);
 await page.locator('#message #close').click();
 await page.evaluate(()=>LearnedWords.open());
 check(await page.locator('.lw-section-header:visible').count()===2,'reopen needs no options toggle '+width);
 await page.locator('#message #close').click();
 await page.locator('.Input.LineInput').fill('take pellets');await page.keyboard.press('Enter');await page.waitForTimeout(1800);
 const mixed=await page.evaluate(()=>{
 const pool=Actionable.payloadPool().filter(o=>(o.aliases||[]).includes('pellet'));
 const held=new Set(WorldModel.lastPayload.inventory.map(o=>String(o.id)));
 return {count:pool.length,ground:pool.filter(o=>!held.has(String(o.id))).length,held:pool.filter(o=>held.has(String(o.id))).length};
 });
 check(mixed.count===2&&mixed.ground===1&&mixed.held===1,'real Wumpus retains both physical pellet owners after first Take '+width);
 const mark=page.locator('.pl-act').filter({hasText:/food pellets/}).last();
 await mark.dispatchEvent('contextmenu');
 const take=page.locator('#radial-menu button').filter({hasText:/^Take$/});
 check(await take.count()===1&&await take.isVisible(),'actual first radial offers Take '+width);
 await take.click();await page.waitForTimeout(1800);
 const heldCount=await page.evaluate(()=>WorldModel.lastPayload.inventory.filter(o=>(o.aliases||[]).includes('pellet')).length);
 check(heldCount===2,'selecting radial Take really obtains second pellet '+width);
 check(await page.locator('.Input.LineInput').inputValue()==='','Take submits rather than leaves a pasted command '+width);
 await page.evaluate(()=>Actionable.Open('food pellets','inventory',100,100,null));
 check(await page.locator('#radial-menu button').filter({hasText:/^Take$/}).count()===0,'all-held radial omits Take '+width);
 check(page.errors.length===0,'real-game browser has no errors '+width);
 await page.evaluate(()=>{Message.Hide();Global.Prefs.LearnedWordsShow_actions=false;Global.Prefs.LearnedWordsShow_names=false;Global.SavePrefs();});
 await page.reload();await page.waitForTimeout(3500);await page.evaluate(()=>{if(Message.IsOpen)Message.Hide();});
 if(await page.locator('.Input.LineInput').count()){await page.locator('.Input.LineInput').fill('no');await page.keyboard.press('Enter');await page.waitForTimeout(1000);}
 for(let i=0;i<15&&!await page.locator('.Input.LineInput').count();i++){await page.keyboard.press('Space');await page.waitForTimeout(200);}
 await page.waitForTimeout(1500);await page.evaluate(()=>LearnedWords.open());
 check(await page.locator('.lw-section-header:visible').count()===2,'saved off preferences apply on page reload/new game without toggle '+width);

 await context.close();
}
}finally{await browser.close()}console.log(checks+' fresh-start and real-pellet checks passed')})().catch(e=>{console.error(e);process.exit(1)});
