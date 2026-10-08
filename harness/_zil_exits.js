// Scratch (claude): decode West of House direction properties by ZIL exit form.
const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
(async () => { const b = await chromium.launch(); const p = await (await b.newContext()).newPage();
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen', 'PL_TutorialLibrarySeen']) localStorage.setItem(k, '1'); });
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + process.argv[2]); await p.waitForTimeout(4500);
  for (let i = 0; i < 20 && !(await p.locator('.Input.LineInput').count()); i++) { await p.keyboard.press('Space'); await p.waitForTimeout(300); }
  console.log(JSON.stringify(await p.evaluate(() => { const mem = ZRamProvider.getMem(), room = WorldModel.lastPayload.roomId;
    const pr = ZRamReader.listProps(mem, room); const keys = Object.keys(pr[0] || {});
    const u = a => mem.getUint8(a);
    const dirs = { 31: 'north', 30: 'east', 29: 'west', 28: 'south', 27: 'ne', 26: 'nw', 25: 'se', 24: 'sw', 23: 'up', 22: 'down', 21: 'in', 20: 'out' };
    return { keys, exits: pr.filter(x => dirs[x.num]).map(x => { const len = x.sz; const addr = x.dataAddr; const bytes = Array.from({ length: len || 0 }, (_, k) => u(addr + k));
      const kind = { 1: 'UEXIT', 2: 'NEXIT', 3: 'FEXIT', 4: 'CEXIT', 5: 'DEXIT' }[len] || ('len' + len);
      const dest = (kind === 'UEXIT' || kind === 'CEXIT' || kind === 'DEXIT') ? bytes[0] : null;
      return dirs[x.num] + ':' + kind + (dest != null ? '->' + dest + ' ' + (ZRamReader.shortName(mem, dest) || '') : '') + ' [' + bytes.join(',') + ']'; }) }; })));
  await b.close(); })();
