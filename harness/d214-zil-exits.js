const { chromium } = require('playwright'), { pathToFileURL } = require('url'), path = require('path');
let pass = 0;
function check(ok, label) { if (!ok) throw Error(label); pass++; console.log('PASS:', label); }
(async () => {
 const browser = await chromium.launch();
 try {
  for (const game of ['Zork1-TheGreatUndergroundEmpire.z3.js', 'Planetfall.z3.js', 'Hitchhik.z5.js']) {
   const page = await browser.newPage();
   await page.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen','PL_MobileTutorialSeen','PL_LearnedWordsTutorialSeen']) localStorage.setItem(k,'1'); });
   await page.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + game);
   await page.evaluate(() => { const start=document.querySelector('.parchlock-splash__start'); if(start)start.click(); });
   await page.waitForTimeout(2400);
   await page.evaluate(() => { if(Message.IsOpen)Message.Hide(); });
   for(let i=0;i<12&&!await page.locator('.Input.LineInput').count();i++){await page.keyboard.press('Space');await page.waitForTimeout(200);}
   const facts = await page.evaluate(() => {
    const p=WorldModel.lastPayload,mem=ZRamProvider.getMem();
    const mapping=GrammarProvider.d214DirectionProperties(mem),exits=ExitCalibrator._d214ZilExitsFor(mem,p.roomId);
    MapTopology.applyPayloadExits(Object.assign({},p,{exits}));
    const room=ParchLockMap.Rooms.find(r=>String(r.ObjectId)===String(p.roomId));
    return {mapping,exits,graph:room&&room.Exits, roomId:p.roomId, roomName:p.roomName};
   });
   console.log(game,JSON.stringify(facts));
   check(facts.mapping.length>=10,game+' obtains parser-linked directions');
   check(facts.exits.length>0&&facts.exits.every(e=>e.hintOnly),game+' emits visible hint authority');
   check(!facts.graph||Object.keys(facts.graph).length===0,game+' fresh decoded hints cannot route');
   if(game.startsWith('Zork1')) {
    const negative=await page.evaluate(()=>{
      const mem=ZRamProvider.getMem(),roomId=WorldModel.lastPayload.roomId,table=ExitCalibrator.hydrate(mem),old=table.dirs;
      try {table.dirs={north:{confirmed:true,prop:30,mode:'b0'}};const conflict=ExitCalibrator._d214ZilExitsFor(mem,roomId).length===0;
        table.dirs=old;const list=ZRamReader.listProps;try {ZRamReader.listProps=(m,id)=>list(m,id).map(p=>p.num===31?Object.assign({},p,{sz:7}):p);
          return {conflict,unknown:!ExitCalibrator._d214ZilExitsFor(mem,roomId).some(e=>e.label==='north')};
        } finally {ZRamReader.listProps=list;}
      } finally {table.dirs=old;}
    });
    check(negative.conflict,'proven direction-property contradiction rejects decoder');
    check(negative.unknown,'unknown exit size produces no guessed destination');
   }
   if(game.startsWith('Zork1')) {
    check(facts.exits.some(e=>e.label==='north'&&e.targetRoomName==='North of House'), 'Zork north target decoded before any walk');
    const guard = await page.evaluate(() => {
     const p=WorldModel.lastPayload,ex=ExitCalibrator._d214ZilExitsFor(ZRamProvider.getMem(),p.roomId).find(e=>e.label==='north');
     const room=ParchLockMap.Rooms.find(r=>String(r.ObjectId)===String(p.roomId));
     const dest=MapTopology.ensureRoom(ex.targetRoomName,ex.targetRoomId); dest.Visited=true;
     MapTopology.applyPayloadExits(Object.assign({},p,{exits:[ex]}));
     const visitedNotProof=room.Exits.north==null;
     MapTopology.link(p.roomName,'north',ex.targetRoomName,{fromId:p.roomId,toId:ex.targetRoomId,source:'state-delta'});
     MapTopology.applyPayloadExits(Object.assign({},p,{exits:[ex]}));
     const travelRetained=room.Exits.north===dest.Id;
     return {visitedNotProof,travelRetained};
    });
    check(guard.visitedNotProof,'already visited destination does not prove unwalked edge');
    check(guard.travelRetained,'compatible hint preserves exact state-delta edge');
    // Fresh page starts: the isolated graph guard above is not a native walk.
    await page.locator('.Input.LineInput').fill('north');await page.locator('.Input.LineInput').press('Enter');await page.waitForTimeout(900);
    check(await page.evaluate(()=>WorldModel.lastPayload.roomName==='North of House'),'native north reaches predicted Zork destination');
   }
   if(game.startsWith('Planetfall')) check(facts.exits.some(e=>e.exitForm==='D'&&e.doorObjectId&&e.targetRoomId!==e.doorObjectId),'Planetfall door object stays separate from destination');
   if(game.startsWith('Hitchhik')) check(facts.exits.every(e=>e.exitForm==='F'&&e.targetRoomId==null),'HHG scripted bedroom exits invent no destinations');
   await page.close();
  }
 } finally { await browser.close(); }
 console.log(pass+' PASS / 0 FAIL');
})().catch(e=>{console.error(e);process.exitCode=1;});
