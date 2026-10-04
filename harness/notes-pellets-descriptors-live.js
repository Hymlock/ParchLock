const { chromium } = require('playwright'), assert = require('assert'), path = require('path'), {pathToFileURL} = require('url');
let checks=0;
function check(value,text){assert(value,text);checks++;console.log('PASS:',text.split(' {')[0]);}
async function boot(browser,width,height){
 const context=await browser.newContext({viewport:{width,height},isMobile:width<600,hasTouch:width<600}),page=await context.newPage();page.errors=[];page.on('pageerror',e=>page.errors.push(e.message));
 await page.addInitScript(()=>{let seed=1;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};sessionStorage.setItem('PL_ParchLockSplashSeen','1');localStorage.setItem('PL_TutorialSeen','1');localStorage.setItem('PL_LearnedWordsTutorialSeen','1');});
 await page.goto(pathToFileURL(path.resolve('play.html')).href+'?story=games/wump2ka.z5.js');await page.waitForTimeout(3500);
 await page.evaluate(()=>{if(Message.IsOpen)Message.Hide();});
 for(let i=0;i<8&&!await page.locator('.Input.LineInput').count();i++){await page.keyboard.press('Space');await page.waitForTimeout(300);}
 if(await page.locator('.Input.LineInput').count()) {await page.locator('.Input.LineInput').fill('no');await page.keyboard.press('Enter');await page.waitForTimeout(1000);}
 for(let i=0;i<15&&!await page.locator('.Input.LineInput').count();i++){await page.keyboard.press('Space');await page.waitForTimeout(200);}
 await page.waitForTimeout(1500);
 return {context,page};
}


(async()=>{const browser=await chromium.launch({headless:true});try{const {page,context}=await boot(browser,1280,850);const width=1280;
async function submit(cmd){await page.evaluate(cmd=>{Input.Clear();Input.Inject(cmd,true)},cmd);await page.waitForTimeout(1400);}
for(const cmd of ['take note','take canteen','take pellets','take pellets'])await submit(cmd);
const target=await page.evaluate(()=>{const mem=ZRamProvider.getMem();for(let id=1;id<=ZRamReader.objectCount(mem,ZRamReader.header(mem));id++){if(ZRamReader.shortName(mem,id)==='scrawled note')return {id,parent:ZRamReader.objectLinks(mem,id).parent}}});
const blocked=[];let moves=0;
while(await page.evaluate(()=>WorldModel.lastPayload.roomId)!==target.parent&&moves++<30){
 const step=await page.evaluate(({target,blocked})=>{const mem=ZRamProvider.getMem(),q=[{id:WorldModel.lastPayload.roomId,path:[]}],seen=new Set();while(q.length){const a=q.shift();if(a.id===target.parent)return a.path[0];if(seen.has(a.id))continue;seen.add(a.id);ZRamReader.lookAheadExits(mem,a.id).forEach(e=>{if(e.targetRoomId&&!seen.has(e.targetRoomId)&&!blocked.includes(a.id+':'+e.targetRoomId))q.push({id:e.targetRoomId,path:a.path.concat({from:a.id,label:e.label,to:e.targetRoomId})})});}return null},{target,blocked});
 if(!step)console.log((await page.locator('#windowport').innerText()).slice(-3500));
 check(step!==null,'actual note route has a traversable candidate '+width);
 const cmd=await page.evaluate(label=>Actionable.resolveExitCommand(label),step.label);await submit(cmd);
 let room=await page.evaluate(()=>WorldModel.lastPayload.roomId);
 if(room===step.from)blocked.push(step.from+':'+step.to);
}
check(await page.evaluate(()=>WorldModel.lastPayload.roomId)===target.parent,'real travel reaches the scrawled note room '+width);
await submit('take scrawled note');await submit('inventory');
for(const width of [1280,360]){await page.setViewportSize({width,height:850});
const state=await page.evaluate(()=>{const p=WorldModel.lastPayload,pool=Actionable.payloadPool(),mem=ZRamProvider.getMem();return {notes:p.inventory.filter(o=>(o.aliases||[]).includes('note')).map(o=>({id:o.id,structural:ZRamReader.shortName(mem,o.id),display:Actionable.displayNameFor(o,p.inventory,Actionable.Scope.lastLookText+'\n'+Actionable.Scope.lastInventoryText),ref:Actionable.referenceFor(pool.find(r=>r.id===o.id))})),pellets:p.inventory.filter(o=>(o.aliases||[]).includes('pellet')).map(o=>Actionable.displayNameFor(o,p.inventory,Actionable.Scope.lastLookText+'\n'+Actionable.Scope.lastInventoryText))}});
if(state.notes.length!==2)console.log(JSON.stringify({width,target,moves,state,transcript:await page.locator('#windowport').innerText()}));
check(state.notes.length===2,'actual inventory contains both differently described notes '+width);
check(state.notes.every(o=>o.display===o.structural)&&state.notes.some(o=>o.display==='scribbled note')&&state.notes.some(o=>o.display==='scrawled note'),'actual note descriptors survive shared generic aliases '+width);
check(state.notes.find(o=>o.display==='scrawled note').ref.unique&&/scrawled/.test(state.notes.find(o=>o.display==='scrawled note').ref.noun),'existing unique scrawled parser reference remains intact '+width);
check(!state.notes.find(o=>o.display==='scribbled note').ref.unique,'shared scribbled parser alias does not invent unique ownership '+width);
check(state.pellets.length===2&&state.pellets.every(n=>n==='food pellets'),'identical pellet display recovery remains intact alongside notes '+width);
await page.evaluate(()=>EquipmentUI.Render());const labels=await page.locator('.equip-name').allTextContents();
check(labels.includes('scribbled note')&&labels.includes('scrawled note')&&!labels.includes('scrap of paper'),'actual Equipment DOM preserves both note descriptors '+width);
check(labels.filter(n=>n==='food pellets').length===2,'actual Equipment DOM retains both full pellet labels '+width);
await page.evaluate(id=>Actionable.Open('scrawled note','inventory',100,100,id),target.id);await page.locator('#radial-menu button').filter({hasText:/^Examine$/}).click();await page.waitForTimeout(1500);
check(await page.locator('#windowport').innerText().then(t=>/examine scrawled note/.test(t)),'real note Examine echo preserves full descriptor spelling '+width);
const submenu=await page.evaluate(()=>{const old=ParchLockQol.OpenRadial;let commands=[];try{ParchLockQol.OpenRadial=function(x,y,s,c){commands=s.map(e=>e.Command).filter(Boolean);return old(x,y,s,c)};Actionable.Open('pellets','inventory',100,100,null);document.querySelectorAll('#radial-menu button').forEach(b=>{if(b.textContent.trim()==='Put in...')b.click()});return commands}finally{ParchLockQol.OpenRadial=old}});
check(submenu.includes('put pellets in canteen')&&submenu.every(cmd=>!(/nutritio/.test(cmd))),'real pellet target submenu retains readable source and target nouns '+width);
check(page.errors.length===0,'combined real-game descriptor flow has no browser errors '+width);}
await context.close();
}finally{await browser.close()}console.log(checks+' real notes/pellets descriptor checks passed')})().catch(e=>{console.error(e);process.exit(1)});
