// E4: running transcript per module, attached to saves.
//   node harness/e4-transcript.js
const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? 'PASS: ' : 'FAIL: ') + m); };
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen', 'PL_TutorialLibrarySeen']) localStorage.setItem(k, '1'); });
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/Zork1-TheGreatUndergroundEmpire.z3.js'); await p.waitForTimeout(5000);
  await p.evaluate(() => { if (window.Message && Message.IsOpen) Message.Hide(); });
  const ready = async () => { for (let i = 0; i < 12 && !(await p.locator('.Input.LineInput').count()); i++) { await p.keyboard.press('Space'); await p.waitForTimeout(250); } };
  const send = async (c) => { await ready(); const li = p.locator('.Input.LineInput'); await li.fill(c); await li.press('Enter'); await p.waitForTimeout(1300); };
  const text = () => p.evaluate(() => Transcript.getText());
  await ready();
  await send('open mailbox'); await send('read leaflet');
  const storedBefore = await p.evaluate(() => new Promise(r => { const q = indexedDB.open('ParchLockTranscripts', 1); q.onupgradeneeded = () => { const s = q.result.createObjectStore('lines', { keyPath: ['digest', 'seq'] }); s.createIndex('digest', 'digest'); }; q.onsuccess = () => { const c = q.result.transaction('lines').objectStore('lines').index('digest').count(IDBKeyRange.only(Transcript.digest)); c.onsuccess = () => r(c.result); }; }));
  ok(storedBefore === 0, 'nothing is stored before a save (lines are concrete only when saved): stored=' + storedBefore);
  ok(/leaflet/i.test(await text()), 'the unsaved current play is still viewable');
  // Save through the native dialog.
  await send('save');
  await p.waitForSelector('#dialog_infield', { timeout: 5000 }); await p.fill('#dialog_infield', 'e4test'); await p.click('#dialog_accept'); await p.waitForTimeout(2500);
  const tokens = await p.evaluate(() => Transcript.meta.saves);
  ok(tokens && tokens.e4test && tokens.e4test.length >= 1, 'a successful save stores an invisible transcript token: ' + JSON.stringify(tokens && tokens.e4test));
  await send('north'); await send('east'); await send('xyzzy');
  let t = await text();
  ok(/leaflet/i.test(t) && /xyzzy/i.test(t), 'the running transcript keeps the whole session, not one screen');
  // Restore the save through the native dialog.
  await send('restore');
  await p.waitForSelector('#dialog_select', { timeout: 5000 }); await p.selectOption('#dialog_select', { label: 'e4test' }).catch(async () => p.selectOption('#dialog_select', { index: 0 }));
  await p.click('#dialog_accept'); await p.waitForTimeout(3500);
  t = await text();
  ok(/leaflet/i.test(t), 'after restoring the save, its transcript still has everything up to the save point');
  ok(!/xyzzy/i.test(t), 'after restoring, lines played AFTER that save (on the abandoned line) are not in its history');
  ok(/\[Restored/.test(t), 'the restore is marked in the transcript');
  await p.waitForTimeout(800);
  const orphans = await p.evaluate(() => new Promise(r => {
    const keep = Transcript.closeView(); Object.keys(Transcript.meta.saves).forEach(n => keep.push(...Transcript.meta.saves[n]));
    const q = indexedDB.open('ParchLockTranscripts', 1);
    q.onsuccess = () => { const out = []; const c = q.result.transaction('lines').objectStore('lines').index('digest').openCursor(IDBKeyRange.only(Transcript.digest));
      c.onsuccess = () => { const cur = c.result; if (!cur) return r(out.length); if (!keep.some(k => cur.value.seq >= k[0] && cur.value.seq < k[1])) out.push(cur.value.seq); cur.continue(); }; };
  }));
  ok(orphans === 0, 'loading a save leaves no unsaved scraps behind (only saves make lines permanent): orphans=' + orphans);
  await send('south');
  t = await text();
  ok(/leaflet/i.test(t) && /south/i.test(t), 'play after the restore continues the same transcript');
  // Reload the app: the autosave resume keeps the same line of play.
  await p.reload(); await p.waitForTimeout(5000); await p.evaluate(() => { if (window.Message && Message.IsOpen) Message.Hide(); }); await ready(); await p.waitForTimeout(1500);
  t = await text();
  const auto = await p.evaluate(() => Transcript._autorestored);
  if (auto) ok(t && /leaflet/i.test(t), 'reopening with an observed engine autorestore resumes the same transcript');
  else ok(!t || !/leaflet/i.test(t), 'reopening without an observed autorestore is a new game: fresh transcript (the save still holds the old history)');
  // Simulated autosave resume: the same view continues when the VM restores its autosave.
  const resumed = await p.evaluate(() => { const v = JSON.stringify(Transcript.meta.view); Transcript._booting = true; Transcript._autorestored = true; Transcript.collect(); return v === JSON.stringify(Transcript.meta.view); });
  ok(resumed, 'an observed autosave restore keeps the current line of play (no new range)');
  // Probe output never enters the transcript.
  await p.evaluate(() => EquipmentUI.Show()); await p.waitForTimeout(3000); await p.evaluate(() => { if (Message.IsOpen) Message.Hide(); }); await p.waitForTimeout(2500);
  t = await text();
  ok(!/>\s*(score|diagnose)\s*$/im.test(t), 'hidden status probes never enter the transcript');
  // Self-cleaning: deleting the save removes its token and unused lines.
  const before = await p.evaluate(() => new Promise(r => { const q = indexedDB.open('ParchLockTranscripts', 1); q.onsuccess = () => { const c = q.result.transaction('lines').objectStore('lines').index('digest').count(IDBKeyRange.only(Transcript.digest)); c.onsuccess = () => r(c.result); }; }));
  await p.evaluate(() => { const sig = Transcript.signature(); localStorage.removeItem('dirent:save:' + sig + ':e4test'); localStorage.removeItem('content:save:' + sig + ':e4test'); Transcript.reconcileSaves(); });
  await p.waitForTimeout(800);
  const after = await p.evaluate(() => new Promise(r => { const q = indexedDB.open('ParchLockTranscripts', 1); q.onsuccess = () => { const c = q.result.transaction('lines').objectStore('lines').index('digest').count(IDBKeyRange.only(Transcript.digest)); c.onsuccess = () => r(c.result); }; }));
  ok(await p.evaluate(() => !Transcript.meta.saves.e4test), 'deleting the save removes its transcript token');
  ok(after < before, 'lines only that save used are deleted (' + before + ' -> ' + after + ')');
  // Uninstalling the module removes its whole transcript.
  await p.evaluate(() => ModuleLibrary.hideBuiltIn(ParchLock.StoryPath || ParchLock.GameFilename)); await p.waitForTimeout(800);
  const gone = await p.evaluate(() => new Promise(r => { const q = indexedDB.open('ParchLockTranscripts', 1); q.onsuccess = () => { const c = q.result.transaction('lines').objectStore('lines').index('digest').count(IDBKeyRange.only(Transcript.digest)); c.onsuccess = () => r({ n: c.result, meta: localStorage.getItem('PL_Transcript_' + Transcript.digest) }); }; }));
  ok(gone.n === 0 && gone.meta === null, 'uninstalling the module removes its transcript entirely: ' + JSON.stringify(gone));
  await p.evaluate(() => ModuleLibrary.restoreBuiltIns());
  await b.close();
  console.log(pass + ' PASS / ' + fail + ' FAIL'); process.exit(fail ? 1 : 0);
})();
