// Read-only stats sweep over every catalog module (operator 2026-10-08:
// "Stats must work in all games"). Reaches a line prompt by the generic route,
// opens Equipment, waits for fulfillment to settle, and records what shows.
//   node harness/stats-sweep.js [--only=FILE.js] [--concurrency=4]
// Output: work/status-audit/z/claude-stats-sweep-2026-10-08.json
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs'); const { pathToFileURL } = require('url');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve('work/status-audit/z/claude-stats-sweep-2026-10-08.json');
const manifest = require(path.resolve('work/status-audit/z/headless-command-manifest.json'));
let files = (manifest.rows || []).map(r => r.file).filter(Boolean);
if (arg('only')) files = files.filter(f => arg('only').split(',').includes(f));
const CONC = Number(arg('concurrency', '4'));

async function one(browser, file) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 900 } }); const p = await ctx.newPage();
  const errors = []; p.on('pageerror', e => errors.push(String(e.message || e).slice(0, 160)));
  const r = { file };
  try {
    await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen', 'PL_TutorialLibrarySeen']) localStorage.setItem(k, '1'); });
    await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + file); await p.waitForTimeout(4500);
    await p.evaluate(() => { try { if (Message.IsOpen) Message.Hide(); localStorage.setItem(ModuleLibrary.inventoryWarningKey(ParchLock.StoryPath || ParchLock.GameFilename), '1'); } catch (e) {} });
    for (let i = 0; i < 20; i++) {
      if (await p.locator('.Input.LineInput').count()) break;
      if (await p.locator('.Input.CharInput').count()) { await p.locator('.Input.CharInput').focus().catch(() => {}); await p.keyboard.press('Space'); }
      await p.waitForTimeout(300);
    }
    await p.waitForTimeout(1500);
    if (!(await p.locator('.Input.LineInput').count())) { r.cls = 'NOPROMPT'; return r; }
    r.question = await p.evaluate(() => { try { return !!StatTracker.hasQuestionPrompt(); } catch (e) { return null; } });
    await p.evaluate(() => { if (Message.IsOpen) Message.Hide(); EquipmentUI.Show(); });
    const t0 = Date.now(); let st;
    do { await p.waitForTimeout(1000);
      st = await p.evaluate(() => { const m = StatTracker.model(); return { f: m.fulfillment, reason: m.unavailableReason || null }; });
    } while ((st.f === 'checking' || st.f == null) && Date.now() - t0 < 30000);
    await p.waitForTimeout(500);
    Object.assign(r, await p.evaluate(() => { const m = StatTracker.model();
      return { fulfillment: m.fulfillment, reason: m.unavailableReason || null, probed: !!m.probed,
        stats: StatTracker.visibleStats().map(s => s.label + '=' + (s.upper != null ? s.value + '-' + s.upper : s.value) + (s.max != null ? '/' + s.max : '')),
        strip: (document.getElementById('pl-stats-rows') || {}).textContent || '' }; }));
    r.settleMs = Date.now() - t0;
    r.cls = r.fulfillment === 'unavailable' ? 'UNAVAIL' : r.fulfillment === 'checking' ? 'STUCK' : r.question ? 'QUESTION' : r.stats.length ? 'OK' : 'NOSTATS';
  } catch (e) { r.cls = 'ERROR'; r.err = String(e.message || e).slice(0, 160); }
  finally { if (errors.length) { r.pageErrors = errors.length; r.firstError = errors[0]; if (r.cls === 'OK' || r.cls === 'NOSTATS') r.cls += '+PAGEERR'; } await ctx.close(); }
  return r;
}

(async () => {
  const browser = await chromium.launch(); const results = []; let next = 0;
  await Promise.all(Array.from({ length: CONC }, async () => {
    while (next < files.length) { const f = files[next++]; const r = await one(browser, f); results.push(r);
      console.log(String(results.length).padStart(3) + '/' + files.length, r.cls.padEnd(14), f, r.stats ? JSON.stringify(r.stats).slice(0, 110) : (r.err || ''));
      fs.writeFileSync(OUT, JSON.stringify(results, null, 1)); }
  }));
  await browser.close();
  const tally = {}; results.forEach(r => { tally[r.cls] = (tally[r.cls] || 0) + 1; });
  console.log('TALLY', JSON.stringify(tally));
})();
