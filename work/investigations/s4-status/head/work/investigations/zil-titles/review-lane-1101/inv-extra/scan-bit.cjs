// grok-review adversarial scan (VERDICT-004): every object carrying the hidden bit, with parent and takeable/worn.
const { chromium } = require(process.cwd() + '/node_modules/playwright'); const path = require('path'); const { pathToFileURL } = require('url');
(async () => { const [story, bit, keys] = [process.argv[2], Number(process.argv[3]), Number(process.argv[4] || 0)];
  const b = await chromium.launch(); const p = await b.newPage();
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const x of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(x, '1'); });
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + story); await p.waitForTimeout(3500);
  for (let i = 0; i < keys; i++) { const c = p.locator('.Input.CharInput'); if (await c.count()) { await c.first().focus(); await p.keyboard.press('Space'); } await p.waitForTimeout(600); }
  if (process.argv[5]) { await p.locator('.Input.LineInput').fill(process.argv[5]); await p.keyboard.press('Enter'); await p.waitForTimeout(900); }
  const r = await p.evaluate((bit) => { const mem = ZRamProvider.getMem(); const out = [];
    for (let id = 1; id < 1200; id++) { let l; try { l = ZRamReader.objectLinks(mem, id); } catch (e) { break; } if (!l) break;
      if (l.attrBytes[bit >> 3] & (128 >> (bit & 7))) { const a = ZRamReader.attrsFromObject(mem, id); out.push(id + ':' + ZRamReader.shortName(mem, id) + ' p=' + l.parent + (a.takeable ? ' T' : '') + (a.worn ? ' W' : '') + (a.scenery ? ' S' : '') + (a.concealed ? ' C' : '')); } }
    return out; }, bit);
  console.log(story + ' bit ' + bit + ' (' + r.length + '): ' + r.join(' | ')); await b.close(); })();

