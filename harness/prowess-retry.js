// A status check dropped as "unavailable" records WHY, and the player's own
// Equipment request is retried once when the prompt is safe again
// (Treasures Damage/Hit odds report, 2026-10-08). No stale readings.
//   node harness/prowess-retry.js
const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? 'PASS: ' : 'FAIL: ') + m); };
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 412, height: 900 } })).newPage();
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen', 'PL_TutorialLibrarySeen']) localStorage.setItem(k, '1'); });
  const boot = async () => {
    await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/TreasuresofaSlaversKingdom.z8.js'); await p.waitForTimeout(5000);
    await p.evaluate(() => { if (Message.IsOpen) Message.Hide(); localStorage.setItem(ModuleLibrary.inventoryWarningKey(ParchLock.StoryPath || ParchLock.GameFilename), '1'); });
    await p.keyboard.press('Space'); await p.waitForTimeout(1500);
  };
  // A fake "press a key" prompt blocks every quiet probe (probeSafeNow -> charInput).
  const block = () => p.evaluate(() => { const d = document.createElement('div'); d.className = 'Input CharInput'; d.id = '__fakeChar'; document.body.appendChild(d); });
  const unblock = () => p.evaluate(() => { const d = document.getElementById('__fakeChar'); if (d) d.remove(); });
  const state = () => p.evaluate(() => { const m = StatTracker.model(); return { f: m.fulfillment, reason: m.unavailableReason, damage: !!(m.stats.damage && m.stats.damage.confirmed), retry: !!StatTracker._fulfillRetry,
    title: (document.querySelector('.pl-stat-fulfillment') || {}).title || '' }; });

  await boot();
  await block(); await p.evaluate(() => EquipmentUI.Show()); await p.waitForTimeout(9000);
  let s = await state();
  ok(s.f === 'unavailable' && s.reason === 'charInput', 'a dropped check records why it was blocked: ' + JSON.stringify(s));
  ok(!s.damage, 'no stale Damage is shown while unavailable');
  ok(s.retry, 'one retry is armed for the player\'s own Equipment request');
  ok(s.title === 'Waiting for a keypress', 'the "unavailable" hint explains the blocking guard in plain words: ' + s.title);
  await unblock(); await p.waitForTimeout(9000);
  s = await state();
  ok(s.damage && !s.reason && !s.retry, 'once the prompt is safe, the retry confirms Damage and clears the reason: ' + JSON.stringify(s));

  // #1794: the retry is once per request even when its own probes fail later (asynchronously).
  await boot();
  await block(); await p.evaluate(() => EquipmentUI.Show()); await p.waitForTimeout(9000);
  // The retry fires, and the prompt blocks again in the same tick, so its queued probes are dropped.
  await p.evaluate(() => { const orig = StatTracker.requestStatusFulfillment;
    StatTracker.requestStatusFulfillment = function () { StatTracker.requestStatusFulfillment = orig; const r = orig.apply(this, arguments);
      const d = document.createElement('div'); d.className = 'Input CharInput'; d.id = '__fakeChar'; document.body.appendChild(d); return r; }; });
  await unblock(); await p.waitForTimeout(12000);
  s = await state();
  ok(s.f === 'unavailable' && !s.retry, 'a second (asynchronous) failure of the retry never re-arms another retry: ' + JSON.stringify(s));
  await unblock();

  // A newer Equipment request supersedes a pending retry.
  await boot();
  await block(); await p.evaluate(() => EquipmentUI.Show()); await p.waitForTimeout(9000);
  const txnBefore = await p.evaluate(() => StatTracker._fulfillRetry && StatTracker._fulfillRetry.txn);
  await p.evaluate(() => StatTracker.requestStatusFulfillment(false)); await p.waitForTimeout(300);  // sheet stays open
  const after = await p.evaluate(() => ({ txn: StatTracker._fulfillTxn, pendingTxn: StatTracker._fulfillRetry && StatTracker._fulfillRetry.txn }));
  ok(txnBefore != null && after.pendingTxn !== txnBefore, 'a newer status request (sheet still open) supersedes the old pending retry: ' + JSON.stringify({ txnBefore, after }));
  await unblock();

  // Cancellation: closing Equipment drops the retry.
  await boot();
  await block(); await p.evaluate(() => EquipmentUI.Show()); await p.waitForTimeout(9000);
  ok(await p.evaluate(() => { EquipmentUI.Hide(); return !StatTracker._fulfillRetry; }), 'closing Equipment cancels the retry synchronously');
  await unblock();

  // Cancellation: a player command in between drops the retry.
  await boot();
  await block(); await p.evaluate(() => EquipmentUI.Show()); await p.waitForTimeout(9000);
  await unblock(); await p.evaluate(() => { Input.Inject('look', true); });
  await p.waitForTimeout(400);
  ok(!(await state()).retry, 'a player command before the retry cancels it');
  await b.close();
  console.log(pass + ' PASS / ' + fail + ' FAIL'); process.exit(fail ? 1 : 0);
})();
