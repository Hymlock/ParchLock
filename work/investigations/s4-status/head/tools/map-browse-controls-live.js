const {chromium}=require('playwright');
const {pathToFileURL}=require('url');
const path=require('path');
let passed=0;
function check(v,label){if(!v)throw Error(label);passed++;console.log('PASS '+label)}
(async()=>{const browser=await chromium.launch();try{
 const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});
 await page.addInitScript(()=>{sessionStorage.setItem('PL_ParchLockSplashSeen','1');for(const k of ['PL_TutorialSeen','PL_MobileTutorialSeen','PL_LearnedWordsTutorialSeen'])localStorage.setItem(k,'1')});
 await page.goto(pathToFileURL(path.resolve('play.html')).href+'?story=games/anchor.z8.js');
 await page.waitForTimeout(2500);await page.evaluate(()=>{if(Message.IsOpen)Message.Hide()});
 for(let i=0;i<12&&!await page.locator('.Input.LineInput').count();i++){await page.keyboard.press('Space');await page.waitForTimeout(250)}
 await page.waitForSelector('.Input.LineInput');await page.locator('.Input.LineInput').fill('southeast');await page.locator('.Input.LineInput').press('Enter');await page.waitForTimeout(900);
 await page.evaluate(()=>{window._g3Room=ParchLockMap.Rooms.find(r=>r.Name.includes('Real Estate'));window._g3Routes=0;window._g3RoomClicks=0;Navigator.FindRoute=()=>{window._g3Routes++;return null};const old=ParchLockMap.Draw;ParchLockMap.Draw=(...args)=>{window._g3RoomClicks++;return old(...args)};ParchLockMap.Show()});
 async function browse(){await page.evaluate(()=>{if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();ParchLockMap.Draw(window._g3Room);ParchLockMap.Show()});await page.mouse.move(0,0);await page.waitForTimeout(80)}
 const node=page.locator('#map .room.browsed-controls'),go=node.locator('.go-to-room');
 for(const w of [320,390,1280])for(const theme of ['dark','light']){
  await page.setViewportSize({width:w,height:844});await page.evaluate(t=>document.body.classList.toggle('light',t==='light'),theme);await browse();
  check(await go.evaluate(e=>getComputedStyle(e).opacity)==='0.3',w+' '+theme+' faded');
  const box=await go.boundingBox();check(box.width===24&&box.height===24,w+' '+theme+' target unchanged');
  const before=await page.evaluate(()=>window._g3Routes);await go.tap();check(await page.evaluate(()=>window._g3Routes)===before,w+' '+theme+' first icon tap no travel');
  check(await go.evaluate(e=>getComputedStyle(e).opacity)==='1',w+' '+theme+' revealed');await go.tap();check(await page.evaluate(()=>window._g3Routes)===before+1,w+' '+theme+' second tap routes once');
  await page.screenshot({path:path.join(require('os').tmpdir(),'g3-'+w+'-'+theme+'.png')});
 }
 await page.setViewportSize({width:390,height:844});await browse();const clicks=await page.evaluate(()=>window._g3RoomClicks);await node.locator('.name').tap();
 check(await page.evaluate(()=>window._g3RoomClicks)===clicks+1,'name retains immediate room click');check(await node.evaluate(e=>e.classList.contains('controls-revealed')),'name reveals after Draw');
 await browse();await go.focus();check(await go.evaluate(e=>getComputedStyle(e).opacity)==='1','keyboard focus reveals');const n=await page.evaluate(()=>window._g3Routes);await page.keyboard.press('Enter');check(await page.evaluate(()=>window._g3Routes)===n+1,'Enter invokes existing route');
 await browse();const n2=await page.evaluate(()=>window._g3Routes);await go.click();check(await page.evaluate(()=>window._g3Routes)===n2+1,'mouse remains one click');
 await browse();await go.tap();await page.evaluate(()=>ParchLockMap.Hide());check(await node.evaluate(e=>!e.classList.contains('controls-revealed')),'close clears reveal');
 await browse();const n3=await page.evaluate(()=>window._g3Routes);await go.evaluate(e=>{const r=e.getBoundingClientRect(),o={bubbles:true,pointerType:'touch',pointerId:71,clientX:r.x+5,clientY:r.y+5};e.dispatchEvent(new PointerEvent('pointerdown',o));e.dispatchEvent(new PointerEvent('pointermove',{...o,clientX:o.clientX+15}));e.dispatchEvent(new PointerEvent('pointerup',o));e.dispatchEvent(new PointerEvent('click',o))});check(await page.evaluate(()=>window._g3Routes)===n3,'displaced touch cannot travel');
 await browse();const n4=await page.evaluate(()=>window._g3Routes);await go.evaluate(e=>{const r=e.getBoundingClientRect(),o={bubbles:true,pointerType:'touch',pointerId:72,clientX:r.x+5,clientY:r.y+5};e.dispatchEvent(new PointerEvent('pointerdown',o));e.dispatchEvent(new PointerEvent('pointercancel',o));e.dispatchEvent(new PointerEvent('click',o))});check(await page.evaluate(()=>window._g3Routes)===n4,'cancel cannot travel');
 await browse();const n5=await page.evaluate(()=>window._g3Routes);await go.evaluate(e=>{const r=e.getBoundingClientRect(),o={bubbles:true,pointerType:'touch',pointerId:73,clientX:r.x+5,clientY:r.y+5};e.dispatchEvent(new PointerEvent('pointerdown',o));e.dispatchEvent(new PointerEvent('pointerdown',{...o,pointerId:74}));e.dispatchEvent(new PointerEvent('pointerup',{...o,pointerId:74}));e.dispatchEvent(new PointerEvent('pointerup',o));e.dispatchEvent(new PointerEvent('click',o))});check(await page.evaluate(()=>window._g3Routes)===n5,'multi-touch cannot travel');
 await browse();await go.tap();await page.touchscreen.tap(8,8);check(await node.evaluate(e=>!e.classList.contains('controls-revealed')),'outside touch clears reveal');
 await browse();const back=node.locator('.back-to-room');await back.tap();check(await page.evaluate(()=>!ParchLockMap.IsDisplayingCurrentRoom()),'first Back tap only reveals');await back.tap();check(await page.evaluate(()=>ParchLockMap.IsDisplayingCurrentRoom()),'second Back tap centers existing current room');
 const neighbour=page.locator('#map .room.shown').filter({hasText:'Real Estate'}).first();await neighbour.locator('.name').tap();check(await node.evaluate(e=>e.classList.contains('controls-revealed')),'neighbour name reveals resulting displayed node');
 await browse();const beforeRecovery=await page.evaluate(()=>window._g3Routes);await go.evaluate(e=>e.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'touch',pointerId:99,isPrimary:true})));await go.tap();await go.tap();check(await page.evaluate(()=>window._g3Routes)===beforeRecovery+1,'fresh primary touch recovers missing up/cancel');
 await browse();await go.tap();await page.evaluate(()=>window.dispatchEvent(new Event('blur')));check(await node.evaluate(e=>!e.classList.contains('controls-revealed')),'window blur clears reveal and touch state');
 console.log(passed+' checks passed');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
