const { chromium } = require('playwright'), assert = require('assert'), path = require('path'), {pathToFileURL} = require('url');
let checks=0;
function check(value,text){assert(value,text);checks++;console.log('PASS:',text.split(' {')[0]);}
async function boot(browser,width,height){
 const context=await browser.newContext({viewport:{width,height},isMobile:width<600,hasTouch:width<600}),page=await context.newPage();page.errors=[];page.on('pageerror',e=>page.errors.push(e.message));
 // Deterministic labyrinth (2026-10-11): wump2ka randomizes its map from Math.random; unseeded runs sometimes routed through a swim-only exit and never reached the barrel (flaked on HEAD and pre-0ed5cdb alike).
 await page.addInitScript(()=>{let s=12345;Math.random=()=>{s=(s*1103515245+12345)&0x7fffffff;return s/0x80000000;};});
 await page.addInitScript(()=>{sessionStorage.setItem('PL_ParchLockSplashSeen','1');localStorage.setItem('PL_TutorialSeen','1');localStorage.setItem('PL_LearnedWordsTutorialSeen','1');});
 await page.goto(pathToFileURL(path.resolve('play.html')).href+'?story=games/wump2ka.z5.js');await page.waitForTimeout(3500);
 await page.evaluate(()=>{if(Message.IsOpen)Message.Hide();});
 for(let i=0;i<8&&!await page.locator('.Input.LineInput').count();i++){await page.keyboard.press('Space');await page.waitForTimeout(300);}
 if(await page.locator('.Input.LineInput').count()) {await page.locator('.Input.LineInput').fill('no');await page.keyboard.press('Enter');await page.waitForTimeout(1000);}
 for(let i=0;i<15&&!await page.locator('.Input.LineInput').count();i++){await page.keyboard.press('Space');await page.waitForTimeout(200);}
 await page.waitForTimeout(1500);
 return {context,page};
}



(async()=>{const browser=await chromium.launch({headless:true});try{const {page}=await boot(browser,360,850);
for(const cmd of ['take pellets','take pellets']){await page.evaluate(cmd=>{Input.Clear();Input.Inject(cmd,true);},cmd);await page.waitForTimeout(1400);}
await page.evaluate(()=>Actionable.Open('pellets','inventory',100,100,null));
await page.locator('#radial-menu button').filter({hasText:/^Eat$/}).click();await page.waitForTimeout(1500);
check(await page.locator('#windowport').innerText().then(t=>/aren't hungry enough/.test(t)),'actual inventory Eat refuses without consuming a pellet');
const route=await page.evaluate(()=>{
 const mem=ZRamProvider.getMem(),rooms=ZRamReader.compiledRoomIndex(mem).table;
 const n=ZRamReader.objectCount(mem,ZRamReader.header(mem));let target;
 for(let id=1;id<=n;id++){if(/barrel/i.test(ZRamReader.shortName(mem,id)||'')){const parent=ZRamReader.objectLinks(mem,id).parent;if(Object.values(rooms).includes(parent)){target=parent;break;}}}
 const q=[{id:WorldModel.lastPayload.roomId,path:[]}],seen=new Set();
 while(q.length){const a=q.shift();if(a.id===target)return a.path;if(seen.has(a.id))continue;seen.add(a.id);
 ZRamReader.lookAheadExits(mem,a.id).forEach(e=>{if(e.targetRoomId&&!seen.has(e.targetRoomId))q.push({id:e.targetRoomId,path:a.path.concat({label:e.label,target:e.targetRoomId})});});}
 return null;
});console.log('route',route);if(!route)throw Error('No barrel route');
for(const step of route){const cmd=await page.evaluate(step=>Actionable.resolveExitCommand(step.label),step);console.log('move',cmd);await page.locator('.Input.LineInput').fill(cmd);await page.keyboard.press('Enter');await page.waitForTimeout(1000);}
async function snapshot(cmd){
 const state=await page.evaluate(()=>({root:AttrCalibrator.confirmedInventoryRootId(AttributeSchema._getMem()),player:WorldModel.lastPayload.playerId,room:WorldModel.lastPayload.roomId,inventory:WorldModel.lastPayload.inventory.map(o=>o.id),equipment:EquipmentUI.model().items.map(o=>o.id)}));
 check(state.inventory.length===3&&state.inventory.includes(198)&&state.inventory.includes(199)&&state.inventory.includes(284),'only two pellets and Glow Bar held after '+cmd);
 check(state.equipment.length===3&&state.equipment.every(id=>state.inventory.includes(id)),'equipment matches held identities after '+cmd);
 check(state.root==null||state.root!==state.room,'room is not calibrated as inventory after '+cmd);
}
await snapshot('initial');
for(const cmd of ['examine barrel','examine hole','take barrel','take hole','wait','wait','inventory','wait','wait','examine ooze','take ooze','eat ooze','inventory']){
await page.evaluate(cmd=>{Input.Clear();Input.Inject(cmd,true);},cmd);await page.waitForTimeout(1600);await snapshot(cmd);if(cmd==='examine barrel')check(await page.locator('.pl-act').filter({hasText:/hole/}).count()>0,'newly exposed room hole is underlined without becoming inventory');}
await page.evaluate(()=>{AttrCalibrator.table.inventoryRootId=WorldModel.lastPayload.roomId;AttrCalibrator.persist(AttributeSchema._getMem());});
await page.waitForTimeout(900);await snapshot('recovery from stored room-root contamination');
check(await page.evaluate(()=>AttrCalibrator.confirmedInventoryRootId(AttributeSchema._getMem())===null),'persisted invalid room root is ignored without deleting other learning');
console.log(checks+' inventory containment checks passed');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
