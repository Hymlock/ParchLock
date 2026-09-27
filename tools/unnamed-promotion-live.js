// D184 verification, to grok's spec: assert the promoted set is EMPTY on every
// other story in every room visited -- not merely that mark counts are
// unchanged, which is the check that would have passed the reverted v1.
const { chromium } = require('playwright');
const path = require('node:path'); const { pathToFileURL } = require('node:url');
const GAMES = [
  ['games/wump2ka.z5.js', ['no','look','look','look'], true],
  ['games/anchor.z8.js', ['look','se','look','nw','look'], false],
  ['games/Zork1-TheGreatUndergroundEmpire.z3.js', ['look','n','look','e','look'], false],
  ['games/LostPig.z8.js', ['look','n','look','look'], false],
  ['games/905.z5.js', ['look','stand','look','look'], false],
  ['games/Enchanter.z3.js', ['look','n','look'], false]
];
(async () => {
  const browser = await chromium.launch();
  let bad = 0;
  for (const [story, seq, expect] of GAMES) {
    const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => { try {
      sessionStorage.setItem('PL_ParchLockSplashSeen','1');
      localStorage.setItem('PL_TutorialSeen','1');
      localStorage.setItem('PL_TutorialLibrarySeen','1'); } catch(e){} });
    try {
      await page.goto(pathToFileURL(path.resolve('play.html')).href + '?story=' + story);
      await page.waitForFunction(()=>!!document.querySelector('#windowport .BufferWindow'),{timeout:45000});
      await page.waitForTimeout(2600);
      try { await page.click('#message #close', { timeout: 600 }); } catch (e) {}
      const promoted = new Set();
      for (const cmd of seq) {
        for (let k=0;k<6;k++){ if (await page.$('.Input.LineInput')) break;
          await page.keyboard.press('Space'); await page.waitForTimeout(320);} 
        const i = await page.$('.Input.LineInput'); if (!i) break;
        await i.fill(cmd); await page.keyboard.press('Enter'); await page.waitForTimeout(850);
        const r = await page.evaluate(() => {
          const p = WorldModel.lastPayload||{};
          const text = (Actionable.RoomLines||[]).filter(l=>l&&l.isConnected).map(l=>l.textContent||'').join(' ');
          const pr = Actionable.promoteUnnamed(p, text);
          return { promoted: pr.map(o=>o.name+'#'+o.id),
                   playerId: p.playerId, roomId: p.roomId,
                   cands: (p.unnamedCandidates||[]).length,
                   marks: document.querySelectorAll('.pl-act:not(.is-stale)').length };
        });
        r.promoted.forEach(x=>promoted.add(x));
        // the two exclusions that must NEVER fail
        if (r.promoted.some(x=>x.endsWith('#'+r.playerId))) { console.log('  !! PLAYER PROMOTED', story); bad++; }
        if (r.promoted.some(x=>x.endsWith('#'+r.roomId)))   { console.log('  !! ROOM PROMOTED', story); bad++; }
      }
      const list = [...promoted];
      const ok = expect ? list.length > 0 : list.length === 0;
      if (!ok) bad++;
      console.log((ok?'PASS ':'FAIL ') + story.split('/')[1].padEnd(38) +
        'promoted=' + JSON.stringify(list));
    } catch(e) { console.log('ERR ', story, String(e).slice(0,60)); bad++; }
    await ctx.close();
  }
  await browser.close();
  console.log(bad ? `\n${bad} PROBLEM(S)` : '\nall stories behaved');
})();
