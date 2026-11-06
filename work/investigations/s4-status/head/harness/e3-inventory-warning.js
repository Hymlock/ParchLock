// E3: the inventory WARNING shows once per installed module, on the first
// Equipment open, and again only after the module is uninstalled.
//   node harness/e3-inventory-warning.js
const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? 'PASS: ' : 'FAIL: ') + m); };
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 412, height: 900 } });
  const p = await ctx.newPage();
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen', 'PL_TutorialLibrarySeen']) localStorage.setItem(k, '1'); });
  const url = pathToFileURL(path.resolve('play.html')).href + '?story=games/anchor.z8.js';
  const boot = async () => {
    await p.goto(url); await p.waitForTimeout(4500);
    await p.evaluate(() => { if (window.Message && Message.IsOpen) Message.Hide(); });
    for (let i = 0; i < 14 && !(await p.locator('.Input.LineInput').count()); i++) { await p.keyboard.press('Space'); await p.waitForTimeout(250); }
  };
  const openEquip = async () => { await p.evaluate(() => EquipmentUI.Show()); await p.waitForTimeout(1500); return p.evaluate(() => ({ open: Message.IsOpen, title: document.querySelector('#message h2') && document.querySelector('#message h2').textContent, big: !!document.querySelector('#message h2 .pl-warning-title') })); };
  await boot();
  // #1702: the warning comes before the probe guards (a typed draft blocks probes, not the warning).
  await p.evaluate(() => { localStorage.removeItem(ModuleLibrary.inventoryWarningKey(ParchLock.StoryPath || ParchLock.GameFilename)); document.querySelector('.Input.LineInput').value = 'half typed'; });
  let d = await openEquip();
  ok(d.open && /WARNING/.test(d.title), 'with a draft in the input line the first-open WARNING still shows');
  let s = d;
  ok(s.open && /WARNING/.test(s.title) && s.big, 'first Equipment open after install shows the large WARNING heading');
  const body = await p.evaluate(() => document.querySelector('#message > div').textContent);
  ok(/rummaging/i.test(body) && /turn/i.test(body) && /attack while you're not looking/i.test(body), 'humorous explanation: rummaging, turns, irate enemies attack');
  ok(await p.evaluate(() => { const f = document.querySelector('#message footer'); return !f || getComputedStyle(f).display === 'none'; }), 'no "Type any letter to close" footer on the WARNING');
  await p.evaluate(() => { document.querySelector('.Input.LineInput').value = ''; document.querySelector('#message #close').click(); }); await p.waitForTimeout(600);
  ok(await p.evaluate(() => !Message.IsOpen && localStorage.getItem(ModuleLibrary.inventoryWarningKey(ParchLock.StoryPath || ParchLock.GameFilename)) === '1'),
    'the ✕ closes the WARNING and records it as seen');
  await p.evaluate(() => { Message.Hide(); document.querySelector('.Input.LineInput').value = ''; }); await p.waitForTimeout(400);
  await p.evaluate(() => EquipmentUI.Hide && EquipmentUI.Hide()); await p.waitForTimeout(300);
  s = await openEquip();
  ok(!(s.open && /WARNING/.test(s.title)), 'second Equipment open in the same session: no warning');
  await boot();
  s = await openEquip();
  ok(!(s.open && /WARNING|Status check|Inventory check/.test(s.title || '')), 'after reloading the module: no warning (was shown every load before)');
  await p.evaluate(() => { const k = ModuleLibrary.inventoryWarningKey(ParchLock.StoryPath || ParchLock.GameFilename); ModuleLibrary.hideBuiltIn(ParchLock.StoryPath || ParchLock.GameFilename); window.__k = localStorage.getItem(k); });
  ok(await p.evaluate(() => window.__k === null), 'uninstalling (hide) clears the module flag so a reinstall shows it again');
  await p.evaluate(() => ModuleLibrary.restoreBuiltIns());
  await b.close();
  console.log(pass + ' PASS / ' + fail + ' FAIL'); process.exit(fail ? 1 : 0);
})();
