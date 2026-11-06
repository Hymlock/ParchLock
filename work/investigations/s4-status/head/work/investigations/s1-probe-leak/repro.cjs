// S1 repro: open Equipment on the first turn, dismiss the first-use warning,
// report probe-span lines that are visible in the BufferWindow.
//   GAMES=a,b node work/investigations/s1-probe-leak/repro.cjs
const path = require('path'); const { pathToFileURL } = require('url');
const { chromium } = require(process.cwd() + '/node_modules/playwright');
const games = (process.env.GAMES || 'Advent.z5.js,Zork1-TheGreatUndergroundEmpire.z3.js,anchor.z8.js,MakeItGood.zblorb.js,curses.z5.js,LostPig.z8.js').split(',');
(async () => {
  const b = await chromium.launch();
  for (const g of games) {
    const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
    await p.addInitScript(() => { let s = 12345; Math.random = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x80000000; }; });
    await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
    const row = { game: g };
    try {
      await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + g); await p.waitForTimeout(2000);
      for (let i = 0; i < 25; i++) { await p.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { Message.Hide(); } catch (e) {} }); if (await p.locator('.Input.LineInput').count()) break; const c = p.locator('.Input.CharInput'); if (await c.count()) await c.first().focus(); await p.keyboard.press('Space'); await p.waitForTimeout(150); }
      await p.waitForTimeout(500);
      const before = await p.evaluate(() => document.querySelectorAll('#windowport .BufferLine').length);
      await p.evaluate(() => EquipmentUI.Show());
      await p.waitForTimeout(400);
      row.warning = await p.evaluate(() => !!Message.IsOpen);
      await p.evaluate(() => { const c = document.querySelector('#message #close'); if (c) c.click(); });
      await p.waitForTimeout(4000);
      // a second warning (turn-cost) may appear; record and close it
      row.warning2 = await p.evaluate(() => Message.IsOpen ? document.querySelector('#message').innerText.slice(0, 120) : null);
      await p.evaluate(() => { const c = document.querySelector('#message #close'); if (c) c.click(); });
      await p.waitForTimeout(500);
      Object.assign(row, await p.evaluate((before) => {
        const lines = [...document.querySelectorAll('#windowport .BufferWindow .BufferLine')].slice(before);
        const vis = l => { const cs = getComputedStyle(l); return cs.display !== 'none' && cs.visibility !== 'hidden' && l.offsetHeight > 0; };
        return {
          newLines: lines.map(l => ({ t: l.textContent.replace(/ /g, ' ').trim(), vis: vis(l), cls: [...l.classList].filter(c => c.startsWith('pl-')).join(' '), ev: l.getAttribute('data-pl-probe-event') })).filter(x => x.t),
          submits: (window.__s1 || null)
        };
      }, before));
      row.leaked = row.newLines.filter(x => x.vis).map(x => x.t);
    } catch (e) { row.error = String(e.message).slice(0, 200); }
    console.log(JSON.stringify(row));
    await p.close();
  }
  await b.close();
})();
