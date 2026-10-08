const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
(async () => { const b = await chromium.launch(); const p = await (await b.newContext()).newPage();
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen', 'PL_TutorialLibrarySeen']) localStorage.setItem(k, '1'); });
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + process.argv[2]); await p.waitForTimeout(4500);
  console.log(JSON.stringify(await p.evaluate(() => { const w = ['wield', 'equip', 'wear', 'remove', 'eat', 'drink', 'apply', 'use', 'take', 'drop', 'examine', 'throw', 'wave', 'swing', 'brandish', 'attack', 'light', 'switch', 'turn', 'shine', 'wipe', 'clean', 'rub', 'read', 'open', 'close', 'search', 'look', 'show', 'give', 'put', 'insert', 'polish', 'dry', 'squeeze', 'hold', 'drop', 'unwield', 'sharpen', 'activate', 'push', 'fill', 'empty', 'smell', 'taste', 'touch', 'feel', 'listen', 'break', 'kill', 'fight', 'seize', 'get', 'enter', 'climb', 'tie', 'wrap', 'hit'];
    const out = {}; w.forEach(x => out[x] = Actionable.isGameWord(x)); return { yes: w.filter(x => out[x]), no: w.filter(x => !out[x]) }; })));
  await b.close(); })();
