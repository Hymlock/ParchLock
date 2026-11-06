const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {pathToFileURL}=require('url');
// Output path is optional; default beside the OS temp dir so a bare run never crashes (claude audit E9).
const dest=process.argv[2]||path.join(require('os').tmpdir(),'death-persistence-native.json'); const rows=[];
(async()=>{const browser=await chromium.launch();try{
const ctx=await browser.newContext({viewport:{width:420,height:900}});
await ctx.addInitScript(()=>{sessionStorage.setItem('PL_ParchLockSplashSeen','1'); for(const k of ['PL_TutorialSeen','PL_MobileTutorialSeen','PL_LearnedWordsTutorialSeen','PL_TutorialLibrarySeen'])localStorage.setItem(k,'1');});
const p=await ctx.newPage();p.setDefaultTimeout(12000);
const url=pathToFileURL(path.resolve(process.env.PLAY_ROOT || '.', 'play.html')).href+'?story=games/Zork1-TheGreatUndergroundEmpire.z3.js';
async function ready(){await p.waitForFunction(()=>typeof SaveState!=='undefined'&&SaveState.outcomes());await p.evaluate(()=>{try{Message.Hide();}catch(e){}});await p.locator('.Input.LineInput').waitFor();}
async function cmd(c){await ready();const l=p.locator('.Input.LineInput');await l.fill(c);await l.press('Enter');await p.waitForTimeout(650);}
async function row(label,n){const r=await p.evaluate(()=>({totals:SaveState.outcomes(),model:{deaths:StatTracker.model().deaths,wins:StatTracker.model().wins},text:document.body.innerText.slice(-4500)}));rows.push({label,...r});assert.equal(r.totals.deaths,n,label);assert.equal(r.model.deaths,n,label+' visible model');}
async function save(name){await cmd('save');await p.locator('#dialog_infield').fill(name);await p.locator('#dialog_accept').click();await p.waitForTimeout(750);await ready();}
async function restore(name){await cmd('restore');const options=await p.locator('#dialog_select option').evaluateAll(els=>els.map(e=>({value:e.value,label:e.textContent}))); rows.push({label:'restore dialog',options});const option=options.find(o=>o.label.includes(name));assert.ok(option,'exact named native save is listed');await p.locator('#dialog_select').selectOption(option.value);await p.locator('#dialog_accept').click();await p.waitForTimeout(850);await ready();}
async function die(){for(const c of ['north','east','open window','west','west','move rug','open trap door','down','north','north','north','north','north']){await cmd(c);if((await p.evaluate(()=>SaveState.outcomes().deaths))>rows[rows.length-1].totals.deaths) return;}throw Error('Ordinary grue route did not produce death');}
await p.goto(url);await ready();await row('fresh run',0);await save('death-persistence-A');await die();await row('first native death',1);await restore('death-persistence-A');await row('older save keeps first death',1);await die();await row('second native death',2);await p.reload();await ready();
// Startup may ask whether to restore the autosave; YES resumes this run.
const startup=await p.evaluate(()=>document.body.innerText.slice(-2000));if(/restore.*(saved|previous)|continue.*(saved|previous)/i.test(startup))await cmd('yes');
await row('page reopen keeps two deaths',2);await restore('death-persistence-A');await row('old native save after reopen',2);
if(process.env.PACKAGED_UI){await p.evaluate(()=>EquipmentUI.Show());await p.waitForTimeout(500);if(await p.locator('#message #close').isVisible())await p.locator('#message #close').click();await p.waitForTimeout(250);const card=await p.evaluate(()=>document.querySelector('#pl-stats .pl-stat-deaths')?.innerText || '');rows.push({label:'rendered persisted equipment',text:card});assert.match(card,/Deaths this playthrough[\s\S]*2/i);await p.screenshot({path:dest.replace(/\.json$/,'.equipment.png'),fullPage:true});await p.evaluate(()=>EquipmentUI.Hide());}
await ready();const restartInput=p.locator('.Input.LineInput');await restartInput.fill('restart');await restartInput.press('Enter');await p.waitForFunction(()=>/Do you wish to restart/.test(document.body.innerText));await p.locator('.Input.LineInput').fill('y');await p.locator('.Input.LineInput').press('Enter');await p.waitForTimeout(800);await row('accepted native restart new run',0);await save('death-persistence-B');await restore('death-persistence-A');await row('switch back to earlier playthrough',2);await restore('death-persistence-B');await row('switch to new playthrough',0);await p.reload();await ready();await row('reopen selected new playthrough',0);
await p.screenshot({path:dest.replace(/\.json$/,'.png'),fullPage:true});
fs.writeFileSync(dest,JSON.stringify({status:'PASS',rows},null,2));console.log('PASS native save/death/restore/reload',rows.length);
}finally{await browser.close();}})().catch(e=>{fs.writeFileSync(dest,JSON.stringify({status:'FAIL',error:e.stack,rows},null,2));console.error(e);process.exitCode=1;});
