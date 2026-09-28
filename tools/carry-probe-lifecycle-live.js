// Asserted lifecycle coverage for the carry probe (D194/D195). Every existing
// stat suite was GREEN while both defects below were live, because none of them
// drove the sequence a player actually performs: opening the sheet twice, and
// cancelling a queued probe.
//
//   F1 (codex, CRITICAL): two immediate EquipmentUI.Show() calls must submit
//      the inventory command exactly ONCE. Show() zeroes _carryBootstrapAt, so
//      the 800ms throttle cannot carry this; without an in-flight guard both
//      timers fired and the story took two turns in a game where inventory
//      costs one.
//   F2 (codex, HIGH): requestCarryBootstrap followed by Resync/restore/restart
//      must leave preferInventoryText false and no ramStale marks -- the probe
//      was cancelled, so its mutations must be undone.
//
// Verified to FAIL against 93f1799 (5 of 6 checks) before the fix, which is the
// only reason to trust them passing now. Run against real wump2ka, not a stub.
const path = require('node:path'); const { pathToFileURL } = require('node:url');
const root = 'C:/Users/hymlo/Downloads/Projects/Parchmap-main/Parchmap-main';
const { chromium } = require(path.join(root, 'node_modules', 'playwright'));

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0,140)));
  await page.addInitScript(() => { try {
    sessionStorage.setItem('PL_ParchLockSplashSeen','1');
    localStorage.setItem('PL_TutorialSeen','1');
    localStorage.setItem('PL_TutorialLibrarySeen','1'); } catch(e){} });
  await page.goto(pathToFileURL(path.resolve(root,'play.html')).href + '?story=games/wump2ka.z5.js');
  await page.waitForFunction(()=>!!document.querySelector('#windowport .BufferWindow'),{timeout:60000});
  await page.waitForTimeout(3500);
  try { await page.click('#message #close', { timeout: 800 }); } catch(e){}
  await page.evaluate(() => {
    window.__sent = [];
    const real = Actionable.Submit;
    Actionable.Submit = function (v) { const r = real.apply(this, arguments); window.__sent.push(v + '=>' + r); return r; };
  });
  const type = async (cmd) => {
    for (let k=0;k<10;k++){ if (await page.$('.Input.LineInput')) break;
      await page.keyboard.press('Space'); await page.waitForTimeout(300); }
    const i = await page.$('.Input.LineInput'); if (!i) return;
    await i.fill(cmd); await page.keyboard.press('Enter'); await page.waitForTimeout(1200);
  };
  await type('no'); await type('look');

  let fails = 0;
  const check = (ok, what, got) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + what + (ok ? '' : '   got: ' + got)); if (!ok) fails++; };

  // ---- F1: two immediate Shows
  await page.evaluate(() => { window.__sent = []; EquipmentUI.Show(); EquipmentUI.Show(); });
  await page.waitForTimeout(2600);
  let sent = await page.evaluate(()=>window.__sent);
  check(sent.length === 1, 'F1 two immediate Show() calls submit inventory exactly once', JSON.stringify(sent));

  // ---- F1b: three, one of them after the reply settled
  await page.evaluate(() => { try{EquipmentUI.Hide();}catch(e){} });
  try { await page.click('#message #close', { timeout: 700 }); } catch(e){}
  await page.waitForTimeout(1200);
  await page.evaluate(() => { window.__sent = []; EquipmentUI.Show(); EquipmentUI.Show(); EquipmentUI.Show(); });
  await page.waitForTimeout(2600);
  sent = await page.evaluate(()=>window.__sent);
  check(sent.length === 1, 'F1 three immediate Show() calls submit inventory exactly once', JSON.stringify(sent));

  // ---- F2: bootstrap then synchronous Resync
  await page.evaluate(() => { try{EquipmentUI.Hide();}catch(e){} });
  try { await page.click('#message #close', { timeout: 700 }); } catch(e){}
  await page.waitForTimeout(1200);
  const after = await page.evaluate(() => {
    StatTracker.clearCarryProbe();
    StatTracker._carryProbeSentAt = 0;
    StatTracker._hideCarryProbe = false;
    StatTracker._carryBootstrapAt = 0;
    StatTracker.requestCarryBootstrap();
    StatTracker.Resync();                       // synchronously, as codex described
    const m = StatTracker.model();
    return { prefer: !!m.preferInventoryText,
             stale: ['value','weight','capacity'].map(k => m.stats[k] ? !!m.stats[k].ramStale : null),
             rollback: StatTracker._carryProbeRollback !== null,
             timer: StatTracker._carryProbeTimer !== null };
  });
  check(after.prefer === false, 'F2 Resync after bootstrap clears preferInventoryText', JSON.stringify(after));
  check(after.stale.every(s => s !== true), 'F2 Resync after bootstrap leaves no ramStale marks', JSON.stringify(after));
  check(after.rollback === false, 'F2 rollback snapshot consumed', JSON.stringify(after));
  check(after.timer === false, 'F2 timer cancelled', JSON.stringify(after));

  console.log('\nerrors=' + errs.length + (errs.length ? ' ' + errs[0] : ''));
  console.log(fails ? (fails + ' FAIL') : 'all checks pass');
  await browser.close();
  process.exitCode = fails ? 1 : 0;
})();
