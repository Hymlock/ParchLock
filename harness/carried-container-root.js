// A take into a container the player already carries must not become the inventory root.
// Advent (Colossal Cave): TAKE BIRD inserts the bird into the carried wicker cage; the D75
// learner used to record the cage as the inventory root, so the payload player became the
// cage and Equipment showed only the bird. Live browser, real game route.
//   node harness/carried-container-root.js
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require(process.cwd() + '/node_modules/playwright');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
const ROUTE = ['east', 'take all', 'west', 'south', 'south', 'south', 'unlock grate with keys', 'open grate',
  'turn on lamp', 'down', 'west', 'take cage', 'west', 'take rod', 'west', 'west', 'drop rod', 'take bird', 'inventory'];

(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/Advent.z5.js'); await p.waitForTimeout(3500);
  for (let i = 0; i < 25; i++) { await p.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { Message.Hide(); } catch (e) {} }); if (await p.locator('.Input.LineInput').count()) break; await p.keyboard.press('Space'); await p.waitForTimeout(150); }
  for (const c of ROUTE) { await p.evaluate(c => { Input.Clear(); Input.Inject(c, true); }, c); await p.waitForTimeout(1200); }
  const r = await p.evaluate(() => {
    WorldModel.tick(); const P = WorldModel.lastPayload || {};
    let rows = []; try { EquipmentUI.Show(); rows = [...document.querySelectorAll('#equipment .equip-name')].map(e => e.textContent.trim()); } catch (e) {}
    const mem = ZRamProvider.getMem();
    return { player: P.playerId, inv: (P.inventory || []).map(o => o.name), rows,
      learnedRoot: AttrCalibrator.table && AttrCalibrator.table.inventoryRootId,
      confirmed: AttrCalibrator.confirmedInventoryRootId(mem),
      cageCarried: AttrCalibrator.inventoryHolderIsCarried(mem, 58),
      text: document.querySelector('#windowport .BufferWindow').innerText.slice(-400) };
  });
  ok(/a wicker cage/.test(r.text) && /a little bird/.test(r.text), 'native inventory lists the cage holding the bird');
  ok(String(r.player) === '20', 'payload player stays the real player (20), not the cage: ' + r.player);
  ok(r.cageCarried === true, 'the cage (58) is recognised as a carried container');
  ok(String(r.learnedRoot) !== '58' && String(r.confirmed) !== '58', 'the cage is never the learned or confirmed inventory root');
  for (const item of ['wicker cage', 'little bird', 'brass lantern', 'set of keys', 'small bottle'])
    ok(r.inv.indexOf(item) >= 0, 'payload inventory keeps ' + item);
  ok(r.rows.length >= 6, 'Equipment shows the full inventory (' + r.rows.length + ' rows): ' + JSON.stringify(r.rows));
  await b.close();
  console.log(pass + ' PASS / ' + fail + ' FAIL (carried container root)');
  process.exit(fail ? 1 : 0);
})();
