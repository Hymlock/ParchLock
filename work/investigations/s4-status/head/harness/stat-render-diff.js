// P3 (consensus #1843): StatTracker.Render touches the live stat strip only
// when its markup changed, while badges, values and hints still update.
//   node harness/stat-render-diff.js
const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? 'PASS: ' : 'FAIL: ') + m); };
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 412, height: 900 } })).newPage();
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen', 'PL_TutorialLibrarySeen']) localStorage.setItem(k, '1'); });
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/TreasuresofaSlaversKingdom.z8.js'); await p.waitForTimeout(5000);
  await p.evaluate(() => { if (Message.IsOpen) Message.Hide(); localStorage.setItem(ModuleLibrary.inventoryWarningKey(ParchLock.StoryPath || ParchLock.GameFilename), '1'); });
  for (let i = 0; i < 14 && !(await p.locator('.Input.LineInput').count()); i++) { await p.keyboard.press('Space'); await p.waitForTimeout(250); }
  for (const c of ['look', 'score']) { const li = p.locator('.Input.LineInput'); await li.fill(c); await li.press('Enter'); await p.waitForTimeout(2000); }

  // Count mutations of the live strip across N renders.
  const mutationsDuring = (fn) => p.evaluate((fn) => new Promise(res => {
    let n = 0;
    const o = new MutationObserver(r => { n += r.length; });
    // #1859/#1860: watch the whole stat host and the Identify button, not only the rows.
    [document.getElementById('pl-stats'), document.getElementById('pl-stats-identify')].filter(Boolean).forEach(el => o.observe(el, { childList: true, subtree: true, characterData: true, attributes: true }));
    (new Function(fn))(); setTimeout(() => { n += o.takeRecords().length; o.disconnect(); res(n); }, 0);
  }), fn);

  const stats = await p.evaluate(() => StatTracker.visibleStats().map(s => s.key));
  ok(stats.length > 0, 'Treasures shows confirmed stats to render: ' + JSON.stringify(stats));
  await p.evaluate(() => StatTracker.Render());
  const idle = await mutationsDuring(`for (let i = 0; i < 20; i++) StatTracker.Render();`);
  ok(idle === 0, 'idle: 20 renders with nothing changed leave the whole stat host and Identify button untouched (mutations: ' + idle + ')');

  // A value change is drawn.
  const changed = await p.evaluate(() => { const s = StatTracker.model().stats[StatTracker.visibleStats()[0].key]; const old = s.value; s.value = (Number(old) || 0) + 7; StatTracker.Render();
    const text = document.getElementById('pl-stats-rows').textContent; s.value = old; StatTracker.Render(); return { shown: text.indexOf(String((Number(old) || 0) + 7)) >= 0, restored: document.getElementById('pl-stats-rows').textContent.indexOf(String((Number(old) || 0) + 7)) < 0 }; });
  ok(changed.shown && changed.restored, 'a changed value is drawn, and drawn back: ' + JSON.stringify(changed));

  // A badge appears on a change and is gone after its 1.5 s window; its element
  // survives the renders in between (the rise animation plays once).
  const badge1 = await p.evaluate(() => { /* health: not aliased (D209 copies the score row) */ const s = StatTracker.model().stats.health; s.lastChange = 2; StatTracker.Render();
    const el = document.querySelector('#pl-stats-rows .pl-stat-badge'); for (let i = 0; i < 10; i++) StatTracker.Render(); window.__badge = el; const hs = StatTracker.model().stats.health; window.__dbg = { lc: hs.lastChange, bu: hs.badgeUntil && hs.badgeUntil - Date.now(), bd: hs.badgeDelta, same_obj: StatTracker.visibleStats().indexOf(hs), keys: Object.keys(StatTracker.model().stats) }; return { dbg: window.__dbg, present: !!el, same: document.querySelector('#pl-stats-rows .pl-stat-badge') === el }; });
  ok(badge1.present && badge1.same, 'a change shows a badge, and the same badge element survives later renders: ' + JSON.stringify(badge1));
  await p.waitForTimeout(1700);
  const after = await p.evaluate(() => { let err = null; const calls = []; const orig = StatTracker.applyRows; StatTracker.applyRows = function (l, bb) { calls.push({ liveId: l.id, same: l.innerHTML === bb.innerHTML, live: l.innerHTML.slice(0, 160), built: bb.innerHTML.slice(0, 160) }); return orig.apply(this, arguments); }; window.__calls = calls; try { StatTracker.Render(); } catch (e) { err = String(e.stack || e).slice(0, 300); } const vis = StatTracker.visibleStats().map(s => s.key + '=' + s.value + ':' + s.badgeUntil); const b = document.querySelector('#pl-stats-rows .pl-stat-badge'); const st = Object.values(StatTracker.model().stats).filter(s => s.badgeUntil).map(s => ({ key: s.key, delta: s.badgeDelta, leftMs: s.badgeUntil - Date.now() })); StatTracker.applyRows = orig; return { gone: !b, err, calls, vis, badge: b && b.parentElement.className + ' ' + b.textContent, st }; });
  ok(after.gone, 'after its 1.5 s window the badge is removed: ' + JSON.stringify(after));

  // P4: the D209-aliased score row (QUEST RATE) is a presentation copy; its badge
  // must expire too, because the lifecycle is kept on the model record.
  const alias = await p.evaluate(() => { const vis = StatTracker.visibleStats().find(s => s.key === 'score');
    const rec = StatTracker.model().stats.score; rec.lastChange = 3; StatTracker.Render();
    return { aliased: !!(vis && vis.aliasOf), shown: !!document.querySelector('#pl-stats-rows .pl-stat-score .pl-stat-badge'), cleared: rec.lastChange === null, until: rec.badgeUntil > Date.now() }; });
  ok(alias.aliased && alias.shown && alias.cleared && alias.until, 'aliased score: badge shown, and its lastChange consumed on the MODEL record: ' + JSON.stringify(alias));
  await p.waitForTimeout(1700);
  ok(await p.evaluate(() => { StatTracker.Render(); return !document.querySelector('#pl-stats-rows .pl-stat-score .pl-stat-badge'); }), 'aliased score: the badge expires after 1.5 s instead of restarting every render');

  // P3: an identical Conditions section is kept, a change replaces it, none removes it.
  const cond = await p.evaluate(() => new Promise(res => {
    const m = StatTracker.model(); m.conditions = m.conditions || {};
    m.conditions.__t = { key: '__t', label: 'Poisoned', state: 'confirmed', storyEpoch: StatTracker._storyEpoch, generation: StatTracker.conditionGeneration() };
    StatTracker.Render(); const host = document.getElementById('pl-stats'); const first = host.querySelector('.pl-conditions');
    let n = 0; const o = new MutationObserver(r => { n += r.length; }); o.observe(host, { childList: true, subtree: true });
    for (let i = 0; i < 20; i++) StatTracker.Render();
    setTimeout(() => { n += o.takeRecords().length; o.disconnect();
      const same = host.querySelector('.pl-conditions') === first;
      m.conditions.__t.label = 'Weakened'; StatTracker.Render(); const relabelled = /Weakened/.test((host.querySelector('.pl-conditions') || {}).textContent || '');
      delete m.conditions.__t; StatTracker.Render(); const removed = !host.querySelector('.pl-conditions');
      res({ present: !!first, idleMutations: n, same, relabelled, removed }); }, 0); }));
  ok(cond.present && cond.idleMutations === 0 && cond.same && cond.relabelled && cond.removed, 'conditions: kept while identical, replaced on change, removed when none: ' + JSON.stringify(cond));

  // Fulfillment hint transitions are drawn and cleared.
  const hint = await p.evaluate(() => { const m = StatTracker.model(); const prev = m.fulfillment; m.fulfillment = 'checking'; StatTracker.Render();
    const on = !!document.querySelector('#pl-stats-rows .pl-stat-fulfillment'); m.fulfillment = prev; StatTracker.Render(); return { on, off: !document.querySelector('#pl-stats-rows .pl-stat-fulfillment') }; });
  ok(hint.on && hint.off, 'the "checking" hint appears and clears: ' + JSON.stringify(hint));

  // The point of P3: a tick no longer leaves layout dirty for the next status read.
  const layout = await p.evaluate(() => { WorldModel.tick(); const s = performance.now(); void document.body.offsetHeight; return +(performance.now() - s).toFixed(2); });
  ok(layout < 2, 'after a tick, layout is already clean (forced layout ' + layout + ' ms)');
  await b.close();
  console.log(pass + ' PASS / ' + fail + ' FAIL'); process.exit(fail ? 1 : 0);
})();
