const { chromium } = require('playwright'), assert = require('assert'), path = require('path'), {pathToFileURL} = require('url');
let checks=0;
function check(value,text){assert(value,text);checks++;console.log('PASS:',text.split(' {')[0]);}
async function boot(browser,width,height){
 const context=await browser.newContext({viewport:{width,height},isMobile:width<600,hasTouch:width<600}),page=await context.newPage();page.errors=[];page.on('pageerror',e=>page.errors.push(e.message));
 await page.addInitScript(()=>{sessionStorage.setItem('PL_ParchLockSplashSeen','1');localStorage.setItem('PL_TutorialSeen','1');localStorage.setItem('PL_LearnedWordsTutorialSeen','1');});
 await page.goto(pathToFileURL(path.resolve('play.html')).href+'?story=games/anchor.z8.js');await page.waitForTimeout(3500);
 await page.evaluate(()=>{if(Message.IsOpen)Message.Hide();});
 for(let i=0;i<8&&!await page.locator('.Input.LineInput').count();i++){await page.keyboard.press('Space');await page.waitForTimeout(300);}
 await page.waitForFunction(()=>LearnedWords.objects().length);
 return {context,page};
}

(async()=>{const browser=await chromium.launch({headless:true});try{
 for(const width of [1280,360]){
 const {page,context}=await boot(browser,width,850);
 await page.evaluate(()=>WorkspaceUI.ShowOptions());
 check(await page.locator('#game-options > details').count()===7,'seven disclosures '+width);
 check(await page.locator('#game-options > details[open]').count()===0,'collapsed initially '+width);
 await page.locator('#game-options > details > summary').nth(0).click();await page.locator('#game-options > details > summary').nth(1).click();
 check(await page.locator('#game-options > details[open]').count()===2,'independent disclosures '+width);
 const summary=page.locator('#game-options > details > summary').nth(2);await summary.focus();await page.keyboard.press('Enter');await page.waitForTimeout(100);
 check(await page.locator('#game-options > details').nth(2).getAttribute('open')!==null,'keyboard opens native disclosure '+width);
 const persisted=await page.evaluate(()=>{
 const checkbox=document.querySelectorAll('#game-options > details')[6].querySelectorAll('input')[1];checkbox.checked=true;checkbox.dispatchEvent(new Event('change',{bubbles:true}));
 return JSON.parse(localStorage.getItem('PL_Prefs')).LearnedWordsShow_actions===true;
 });check(persisted,'visibility handler persists app-wide preference '+width);

 check(await page.locator('#game-options input[type=checkbox]').count()===(width===1280?17:16),'all original and four banner controls '+width);
 const rate=await page.evaluate(()=>{
 const buttons=Array.from(document.querySelectorAll('#game-options button')),minus=buttons.find(b=>b.textContent==='-'),plus=buttons.find(b=>b.textContent==='+');
 Global.Prefs.ReadAloudRate=1;minus.click();const step=Global.Prefs.ReadAloudRate;
 for(let i=0;i<20;i++)minus.click();const floor=Global.Prefs.ReadAloudRate;for(let i=0;i<20;i++)plus.click();
 return {step,floor,ceiling:Global.Prefs.ReadAloudRate};
 });
 check(rate.step===.9&&rate.floor===.7&&rate.ceiling===1.4,'rate minus step and bounds '+width);
 await page.evaluate(()=>{Message.Hide();LearnedWords.open();});
 for(let mask=0;mask<16;mask++){
 const result=await page.evaluate(mask=>{
 const keys=['learned','actions','names','status'];
 keys.forEach((k,i)=>Global.Prefs['LearnedWordsShow_'+k]=!!(mask&(1<<i)));LearnedWords.applyVisibility();
 const visible=Array.from(document.querySelectorAll('.lw-section-header')).filter(b=>!b.hidden).map(b=>b.dataset.section);
 return {visible,active:LearnedWords._section,center:document.querySelector('.lw-center').hidden,add:document.querySelector('[data-action=add]').disabled};
 },mask);
 const expected=['learned','actions','names','status'].filter((k,i)=>mask&(1<<i));
 check(JSON.stringify(result.visible.sort())===JSON.stringify(expected.sort())&&result.center===(mask===0)&&result.add===!(mask&1)&&(mask===0?result.active===null:expected.includes(result.active)),'visibility combination '+mask+' '+width);
 }
 await page.evaluate(()=>{['learned','actions','names','status'].forEach(k=>Global.Prefs['LearnedWordsShow_'+k]=false);LearnedWords.applyVisibility();window.beforePrefs=JSON.stringify(Global.Prefs);LearnedWords.startTour();});
 for(let i=0;i<7;i++)await page.locator('.lw-tour button').filter({hasText:/^Next$/}).click();
 await page.locator('.lw-tour button').filter({hasText:/^Finish$/}).click();
 check(await page.evaluate(()=>JSON.stringify(Global.Prefs)===window.beforePrefs&&LearnedWords._section===null&&document.querySelector('.lw-center').hidden&&Array.from(document.querySelectorAll('.lw-section-header')).every(b=>b.hidden)),'all-off tour restores preferences and visibility '+width);
 await page.evaluate(()=>{Message.Hide();});
 const takes=await page.evaluate(()=>{
 const originals={pool:Actionable.payloadPool,reference:Actionable.referenceFor,commands:ActionSynth.commandsForObject,more:Actionable.addMoreActions,radial:ParchLockQol.OpenRadial,submit:Actionable.Submit,payload:WorldModel.lastPayload};
 const results=[];
 try{
 for(const held of [[],[1],[1,2]]){
 const objects=[{id:1,name:'pellets',aliases:['pellets']},{id:2,name:'pellets',aliases:['pellets']}];
 Actionable.payloadPool=()=>[...objects,objects[0]];Actionable.referenceFor=()=>({unique:false});
 WorldModel.lastPayload={inventory:held.map(id=>objects[id-1])};
 ActionSynth.commandsForObject=(o,kind)=>kind==='room'&&!held.includes(o.id)?[{verb:'take',command:'take '+(o.id===1?'food':'pellets')}]:[];
 Actionable.addMoreActions=()=>{};let slices,ctx,submitted=[];
 ParchLockQol.OpenRadial=(x,y,s,c)=>{slices=s;ctx=c};Actionable.Submit=(cmd,source)=>submitted.push({cmd,source});
 Actionable.Open('pellets',held.length===2?'inventory':'object',0,0);
 const ts=slices.filter(s=>s.Label==='Take');ts.forEach(s=>s.Action());results.push({count:ts.length,submitted,ctx});
 }
 }finally{Actionable.payloadPool=originals.pool;Actionable.referenceFor=originals.reference;ActionSynth.commandsForObject=originals.commands;Actionable.addMoreActions=originals.more;ParchLockQol.OpenRadial=originals.radial;Actionable.Submit=originals.submit;WorldModel.lastPayload=originals.payload;}
 return results;
 });
 check(takes[0].count===2&&takes[1].count===1&&takes[2].count===0&&takes.every(r=>r.ctx.objectId===null&&r.submitted.every(s=>s.source==='ambiguous-reference')),'different ground commands/mixed/all-held submit without physical ownership '+width);
 check(page.errors.length===0,'no browser script errors '+width+': '+page.errors.join(';'));
 await context.close();
 }
}finally{await browser.close()}console.log(checks+' correction browser checks passed')})().catch(e=>{console.error(e);process.exit(1)});
