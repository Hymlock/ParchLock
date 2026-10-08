// Scratch (claude): where do the Gravel Pit banners and the challenge post live in RAM?
const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
(async () => { const b = await chromium.launch(); const p = await (await b.newContext()).newPage();
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen', 'PL_TutorialLibrarySeen']) localStorage.setItem(k, '1'); });
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/TreasuresofaSlaversKingdom.z8.js'); await p.waitForTimeout(4500);
  for (let i = 0; i < 20 && !(await p.locator('.Input.LineInput').count()); i++) { await p.keyboard.press('Space'); await p.waitForTimeout(300); }
  console.log(JSON.stringify(await p.evaluate(() => { const mem = ZRamProvider.getMem(), n = ZRamReader.objectCount(mem, ZRamReader.header(mem)), out = [];
    for (let id = 1; id <= n; id++) { let w = []; try { w = ZRamReader.parserWordsAny(mem, id) || []; } catch (e) {}
      if (w.some(x => /^(banner|banners|post|blue|green|gold|red|gladiato|rogues|ring)$/.test(x))) { const l = ZRamReader.objectLinks(mem, id);
        out.push({ id, words: w.join('/'), parent: l.parent, parentWords: (ZRamReader.parserWordsAny(mem, l.parent) || []).slice(0, 4).join('/'), attrs: Object.keys(ZRamReader.attrsFromObject(mem, id) || {}).filter(k => ZRamReader.attrsFromObject(mem, id)[k] === true).join(',') }); } }
    return out; }), null, 0));
  await b.close(); })();
