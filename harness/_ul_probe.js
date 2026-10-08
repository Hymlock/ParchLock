// Scratch (claude, sealed investigation): what is underlined in Treasures' cockpit, cache on vs off.
const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
(async () => { const b = await chromium.launch();
  for (const bypass of [false, true]) {
    const p = await (await b.newContext({ viewport: { width: 412, height: 900 } })).newPage();
    await p.addInitScript((bp) => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen', 'PL_TutorialLibrarySeen']) localStorage.setItem(k, '1'); window.__bypass = bp; }, bypass);
    await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/TreasuresofaSlaversKingdom.z8.js'); await p.waitForTimeout(4500);
    await p.evaluate(() => { if (Message.IsOpen) Message.Hide(); if (window.__bypass) BufferRevision.bypass = true; });
    for (let i = 0; i < 20 && !(await p.locator('.Input.LineInput').count()); i++) { await p.keyboard.press('Space'); await p.waitForTimeout(300); }
    await p.waitForTimeout(2500);
    const r = await p.evaluate(() => ({ room: WorldModel.lastPayload && WorldModel.lastPayload.roomName,
      marks: Array.from(document.querySelectorAll('.pl-act:not(.is-stale)')).map(m => m.textContent),
      discovered: ((WorldModel.lastPayload || {}).discoveredObjects || []).map(o => o.id + ':' + o.name),
      tail: Array.from(document.querySelectorAll('.BufferWindow .BufferLine')).slice(-6).map(l => l.textContent.trim()).filter(Boolean).join(' | ').slice(0, 300) }));
    console.log('bypass=' + bypass, JSON.stringify(r));
    await p.close();
  }
  await b.close(); })();
