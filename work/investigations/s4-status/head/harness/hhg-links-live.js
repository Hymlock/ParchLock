// D214 focused native positives and isolated presentation negatives.
const fs = require('fs');
const { chromium } = require('playwright');
const { pathToFileURL } = require('url');
const path = require('path');
let passed = 0;
function check(value, label) { if (!value) throw new Error(label); passed++; console.log('PASS:', label); }
(async () => {
  const browser = await chromium.launch();
  try {
    async function boot(game) {
      const page = await browser.newPage({ viewport: { width: 390, height: 850 } });
      await page.addInitScript(() => {
        sessionStorage.setItem('PL_ParchLockSplashSeen', '1');
        for (const key of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(key, '1');
      });
      await page.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + game);
      await page.waitForTimeout(2500);
      await page.evaluate(() => { if (Message.IsOpen) Message.Hide(); });
      for (let i = 0; i < 12 && !(await page.locator('.Input.LineInput').count()); i++) { await page.keyboard.press('Space'); await page.waitForTimeout(250); }
      await page.waitForSelector('.Input.LineInput');
      return page;
    }
    async function command(page, text) {
      await page.locator('.Input.LineInput').fill(text);
      await page.locator('.Input.LineInput').press('Enter');
      await page.waitForTimeout(900);
    }
    const hhg = await boot('Hitchhik.z5.js');

    await command(hhg,'turn on light'); await command(hhg,'get up');
    check(await hhg.evaluate(()=>GrammarProvider.d214TakeAttribute(ZRamProvider.getMem())===41),'native HHG grammar proves TAKEBIT41');
    for(const id of [31,105,190]) check(await hhg.evaluate(id=>Actionable.resolveObjectCommands(id,'object').some(c=>c.verb==='take'),id),'Take offered for native takeable '+id);
    for(const id of [193,102,63,114]) check(await hhg.evaluate(id=>!Actionable.resolveObjectCommands(id,'object').some(c=>c.verb==='take'),id),'Take absent for native scenery '+id);
    await command(hhg,'take toothbrush');
    check(await hhg.evaluate(()=>Actionable.resolveObjectCommands(31,'object').some(c=>c.verb==='take')),'temporary hangover refusal does not erase Take capability');
    await command(hhg,'take gown');
    check(await hhg.evaluate(()=>!Actionable.LiveMarks.some(m=>/^(large|which|what|gave|know)$/i.test(m.textContent))),'no adjective or relative-clause false links');
    check(await hhg.evaluate(()=>!Actionable.LiveMarks.some(m=>m.dataset.objectId==='116')),'closed pocket does not gain analgesic prose link from adjective');
    await command(hhg,'wear gown'); await command(hhg,'open pocket');
    for(const [id,label] of [[206,'your gown'],[116,'buffered analgesic'],[75,'pocket fluff'],[216,"thing your aunt gave you which you don't know what it is"]]) {
      check(await hhg.evaluate(({id,label})=>Actionable.LiveMarks.some(m=>String(m.dataset.objectId)===String(id)&&m.textContent.toLowerCase()===label),{id,label}),'native held link '+label);
    }
    await command(hhg,'take analgesic');
    await hhg.waitForTimeout(700);
    check(await hhg.evaluate(()=>WorldModel.lastPayload.probe.inventoryRootId===202 && WorldModel.lastPayload.inventory.every(o=>o.parentId!==37)), 'implicit tablet consumption preserves actual player inventory, not offstage bucket');
    await command(hhg,'take toothbrush');
    await hhg.waitForFunction(()=>WorldModel.lastPayload.inventory.some(o=>o.id===31),{},{timeout:4000});
    check(await hhg.evaluate(()=>WorldModel.lastPayload.inventory.some(o=>o.id===31)),'native Take succeeds after curing hangover');
    const cost=await hhg.evaluate(()=>{
      let builds=0, original=Actionable.payloadPool;
      Actionable.payloadPool=function(){if(!Actionable._resolutionPool)builds++;return original();};
      try {let start=performance.now();Actionable.Open('toothbrush','object',180,280,31);return {builds,ms:performance.now()-start,released:!Actionable._resolutionPool};}
      finally{Actionable.payloadPool=original;}
    });
    check(cost.builds===1&&cost.released,'one ephemeral pool per radial, released on return'); console.log('native radial timing',JSON.stringify(cost));
    await hhg.close();
    const treasure=await boot('TreasuresofaSlaversKingdom.z8.js');
    for(const cmd of ['seize sword','north','south','south','in','seize flashlight','seize space-rag']) await command(treasure,cmd);
    await treasure.evaluate(()=>EquipmentUI.Show()); await treasure.waitForTimeout(1500);
    const labels=await treasure.locator('.equip-name').allTextContents();console.log('native inventory labels',JSON.stringify(labels));
    check(labels.some(s=>/flashlight/i.test(s))&&!labels.includes('flashligh'),'full flashlight in inventory without typed inventory');
    check(labels.some(s=>/space-rag/i.test(s))&&!labels.includes('space-ra'),'full hyphenated space-rag in inventory');
    check(labels.some(s=>/gladius sword/i.test(s)),'observed qualified sword survives changing rooms');
    await treasure.evaluate(()=>{if(Message.IsOpen)Message.Hide();});
    await treasure.setViewportSize({width:320,height:850});
    check(await treasure.locator('.equip-name').evaluateAll(es=>es.every(e=>getComputedStyle(e).whiteSpace!=='nowrap'&&getComputedStyle(e).textOverflow!=='ellipsis')),'inventory names wrap at narrow phone width');
    await treasure.screenshot({path:process.env.TEMP+'/inventory-followup-320.png',fullPage:true});
    console.log(passed+' PASS / 0 FAIL');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
