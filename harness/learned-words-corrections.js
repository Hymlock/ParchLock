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
  // WorkspaceUI.ShowOptions: 6 fixed groups (help/mic/scroll/speech/interface/learned);
  // optional 7th from IconRotation.addOptions on Android. Stale harness expected 7 always.
  const disclosureCount=await page.locator('#game-options > details').count();
  check(disclosureCount===6||disclosureCount===7,'options disclosures 6 or 7 (got '+disclosureCount+') '+width);
  const learnedIdx=await page.evaluate(()=>{
    const all=[...document.querySelectorAll('#game-options > details')];
    const i=all.findIndex(d=>(d.querySelector('.pl-options-heading')||{}).textContent==='Learned words');
    return i;
  });
  check(learnedIdx>=0,'learned words disclosure present '+width);
  check(await page.locator('#game-options > details[open]').count()===0,'collapsed initially '+width);
  await page.locator('#game-options > details > summary').nth(0).click();await page.locator('#game-options > details > summary').nth(1).click();
  check(await page.locator('#game-options > details[open]').count()===2,'independent disclosures '+width);
  const summary=page.locator('#game-options > details > summary').nth(2);await summary.focus();await page.keyboard.press('Enter');await page.waitForTimeout(100);
  check(await page.locator('#game-options > details').nth(2).getAttribute('open')!==null,'keyboard opens native disclosure '+width);
  const persisted=await page.evaluate((learnedIdx)=>{
  const details=document.querySelectorAll('#game-options > details')[learnedIdx];
  const checkbox=details.querySelectorAll('input[type=checkbox]')[1];checkbox.checked=true;checkbox.dispatchEvent(new Event('change',{bubbles:true}));
  return JSON.parse(localStorage.getItem('PL_Prefs')).LearnedWordsShow_actions===true;
  },learnedIdx);check(persisted,'visibility handler persists app-wide preference '+width);

  // Checkbox count tracks current Options UI (not a frozen 16/17); require baseline + learned toggles.
  const boxCount=await page.locator('#game-options input[type=checkbox]').count();
  check(boxCount>=14&&boxCount<=20,'options checkbox band 14-20 (got '+boxCount+') '+width);
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
 const visible=Array.from(document.querySelectorAll('.lw-section-header')).filter(b=>getComputedStyle(b).display!=='none').map(b=>b.dataset.section);
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
  // Ambiguous Take: sharedObjectCommands -> resolveObjectCommands -> commandsForPayloadObjectId
  // (not bare commandsForObject). Mock the live path.
  const originals={pool:Actionable.payloadPool,reference:Actionable.referenceFor,commands:ActionSynth.commandsForObject,payloadCmds:ActionSynth.commandsForPayloadObjectId,more:Actionable.addMoreActions,radial:ParchLockQol.OpenRadial,submit:Actionable.Submit,payload:WorldModel.lastPayload};
  const results=[];
  try{
  for(const held of [[],[1],[1,2]]){
  const objects=[{id:1,name:'pellets',aliases:['pellets']},{id:2,name:'pellets',aliases:['pellets']}];
  Actionable.payloadPool=()=>[...objects,objects[0]];Actionable.referenceFor=()=>({unique:false,verified:true,noun:'pellets'});
  WorldModel.lastPayload={inventory:held.map(id=>objects[id-1])};
  const takeFor=(o,kind)=>kind==='room'&&!held.includes(o.id)?[{verb:'take',command:'take '+(o.id===1?'food':'pellets')}]:[];
  ActionSynth.commandsForObject=(o,kind)=>takeFor(o,kind);
  ActionSynth.commandsForPayloadObjectId=(id,kind)=>takeFor(objects.find(o=>String(o.id)===String(id))||{id},kind);
  Actionable.addMoreActions=()=>{};let slices=[],ctx=null,submitted=[];
  ParchLockQol.OpenRadial=(x,y,s,c)=>{slices=s||[];ctx=c};Actionable.Submit=(cmd,source)=>submitted.push({cmd,source});
  Actionable.Open('pellets',held.length===2?'inventory':'object',0,0);
  const ts=(slices||[]).filter(s=>s.Label==='Take');ts.forEach(s=>s.Action&&s.Action());results.push({count:ts.length,submitted,ctx});
  }
  }finally{Actionable.payloadPool=originals.pool;Actionable.referenceFor=originals.reference;ActionSynth.commandsForObject=originals.commands;ActionSynth.commandsForPayloadObjectId=originals.payloadCmds;Actionable.addMoreActions=originals.more;ParchLockQol.OpenRadial=originals.radial;Actionable.Submit=originals.submit;WorldModel.lastPayload=originals.payload;}
  return results;
  });
  // sharedObjectCommands keeps the intersection of complete commands only
  // (Actionable.js). Different ground forms (take food vs take pellets) yield
  // no shared Take when nothing is held; one held leaves one eligible Take;
  // all held yields none. Stale harness expected two Takes for differing forms.
  check(takes[0].count===0&&takes[1].count===1&&takes[2].count===0,'ambiguous Take intersection: none/one/none '+width);
  check(takes[1].ctx&&takes[1].ctx.objectId===null&&takes[1].submitted.length===1&&takes[1].submitted[0].source==='ambiguous-reference','mixed-held Take submits ambiguous-reference '+width);
 check(page.errors.length===0,'no browser script errors '+width+': '+page.errors.join(';'));
 await context.close();
 }
}finally{await browser.close()}console.log(checks+' correction browser checks passed')})().catch(e=>{console.error(e);process.exit(1)});
