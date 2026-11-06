// The verification codex did not finish: an ATTRIBUTE-LEVEL A/B across the
// Inform catalog. For every object in scope, compare attributes read through
// the module's DECLARED table against the STANDARD profile. Mark counts are not
// evidence; these are.
const { chromium } = require('playwright');
const path = require('node:path'); const { pathToFileURL } = require('node:url');
const GAMES = [
  ['games/wump2ka.z5.js', ['no','look','x1','look']],
  ['games/anchor.z8.js', ['look','se','look','nw','look']],
  ['games/LostPig.z8.js', ['look','n','look']],
  ['games/905.z5.js', ['look','stand','look']]
];
(async () => {
  const browser = await chromium.launch();
  for (const [story, seq] of GAMES) {
    const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => { try {
      sessionStorage.setItem('PL_ParchLockSplashSeen','1');
      localStorage.setItem('PL_TutorialSeen','1');
      localStorage.setItem('PL_TutorialLibrarySeen','1'); } catch(e){} });
    try {
      await page.goto(pathToFileURL(path.resolve('play.html')).href + '?story=' + story);
      await page.waitForFunction(()=>!!document.querySelector('#windowport .BufferWindow'),{timeout:50000});
      await page.waitForTimeout(3000);
      try { await page.click('#message #close', { timeout: 600 }); } catch (e) {}
      const diffs = [];
      let declaredPresent = null, playerOK = null, invOK = null;
      for (const cmd of seq) {
        for (let k=0;k<6;k++){ if (await page.$('.Input.LineInput')) break;
          await page.keyboard.press('Space'); await page.waitForTimeout(320);} 
        const i = await page.$('.Input.LineInput'); if (!i) break;
        await i.fill(cmd); await page.keyboard.press('Enter'); await page.waitForTimeout(900);
        const r = await page.evaluate(() => {
          const mem = ZRamProvider.getMem(); if (!mem) return null;
          const p = WorldModel.lastPayload||{};
          const ids = (p.discoveredObjects||[]).concat(p.inventory||[])
                        .map(o=>({id:o.id,name:o.name})).filter(o=>o.id!=null);
          const read = () => { const m={}; ids.forEach(o=>{
              const a = ZRamReader.attrsFromObject(mem, o.id) || {};
              m[o.id] = { name:o.name, on:Object.keys(a).filter(k=>a[k]).sort().join(',') }; }); return m; };
          const declared = !!(ZRamReader.informAttributeNames && ZRamReader.informAttributeNames(mem));
          const withTable = read();
          // force the standard profile
          const orig = ZRamReader.informAttributeNames;
          ZRamReader.informAttributeNames = function(){ return null; };
          const withStd = read();
          ZRamReader.informAttributeNames = orig;
          const d = [];
          Object.keys(withTable).forEach(id=>{
            if (withTable[id].on !== withStd[id].on)
              d.push(withTable[id].name+'#'+id+': std['+withStd[id].on+'] -> decl['+withTable[id].on+']');
          });
          return { declared, diffs: d,
                   playerId: p.playerId, invCount: (p.inventory||[]).length };
        });
        if (!r) continue;
        declaredPresent = r.declared;
        playerOK = r.playerId; invOK = r.invCount;
        r.diffs.forEach(x=>{ if (!diffs.includes(x)) diffs.push(x); });
      }
      console.log('\n' + story.split('/')[1] + '  declaredTable=' + declaredPresent +
                  '  playerId=' + playerOK + '  inventory=' + invOK +
                  '  objectsDiffering=' + diffs.length);
      diffs.slice(0,10).forEach(x=>console.log('   ', x));
    } catch(e){ console.log(story,'ERR',String(e).slice(0,60)); }
    await ctx.close();
  }
  await browser.close();
})();
