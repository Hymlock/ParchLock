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
const inj=async c=>{await page.evaluate(c=>{Input.Clear();Input.Inject(c,true);},c);await page.waitForTimeout(1500);};
await inj('take pellets');await inj('take pellets');
const route=await page.evaluate(()=>{const mem=ZRamProvider.getMem(),rooms=ZRamReader.compiledRoomIndex(mem).table;const n=ZRamReader.objectCount(mem,ZRamReader.header(mem));let target,sid;
 for(let id=1;id<=n;id++){if(/spear/i.test(ZRamReader.shortName(mem,id)||'')){const parent=ZRamReader.objectLinks(mem,id).parent;if(Object.values(rooms).includes(parent)){target=parent;sid=id;break;}}}
 const q=[{id:WorldModel.lastPayload.roomId,path:[]}],seen=new Set();while(q.length){const a=q.shift();if(a.id===target)return {sid,path:a.path};if(seen.has(a.id))continue;seen.add(a.id);
 ZRamReader.lookAheadExits(mem,a.id).forEach(e=>{if(e.targetRoomId&&!seen.has(e.targetRoomId))q.push({id:e.targetRoomId,path:a.path.concat({label:e.label})});});}return {sid,path:null};});
if(!route.path)throw Error('no spear route '+JSON.stringify(route));
for(const st of route.path){const c=await page.evaluate(s=>Actionable.resolveExitCommand(s.label),st);await page.locator('.Input.LineInput').fill(c);await page.keyboard.press('Enter');await page.waitForTimeout(1000);}
console.log('route',JSON.stringify(route),'room',await page.evaluate(()=>WorldModel.lastPayload.roomId));await inj('take spear');console.log('take',await page.evaluate(()=>[...document.querySelectorAll('.BufferLine')].slice(-8).map(l=>l.textContent).join(' | ')));await inj('i');
const r=await page.evaluate(()=>{const ls=[...document.querySelectorAll('.BufferLine')];let k=ls.length-1;while(k>0&&!/You are carrying:/.test(ls[k].textContent))k--;const sp=ls.slice(k).find(l=>/spear/.test(l.textContent));
 return {inv:(WorldModel.lastPayload.inventory||[]).map(o=>o.id+':'+o.name),line:sp&&sp.innerHTML.slice(0,240),marked:!!(sp&&sp.querySelector('.pl-act'))};});
console.log('RESULT',JSON.stringify(r));process.exitCode=r.marked?0:1;
}finally{await browser.close()}})().catch(e=>{console.error('ERR',e.message);process.exit(2)});

