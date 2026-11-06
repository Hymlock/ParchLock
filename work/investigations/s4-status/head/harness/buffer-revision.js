// BufferRevision cache equivalence (consensus #1830): every cached transcript
// string and per-line fact must equal a fresh computation after each kind of
// DOM change, and Actionable must reach the same result with the cache off.
//   node harness/buffer-revision.js
const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? 'PASS: ' : 'FAIL: ') + m); };
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 412, height: 900 } })).newPage();
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen', 'PL_TutorialLibrarySeen']) localStorage.setItem(k, '1'); });
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/anchor.z8.js'); await p.waitForTimeout(5000);
  await p.evaluate(() => { if (window.Message && Message.IsOpen) Message.Hide(); });
  for (let i = 0; i < 14 && !(await p.locator('.Input.LineInput').count()); i++) { await p.keyboard.press('Space'); await p.waitForTimeout(250); }
  for (const c of ['look', 'southeast', 'look']) { const li = p.locator('.Input.LineInput'); await li.fill(c); await li.press('Enter'); await p.waitForTimeout(1500); }

  // Cached results (read in the SAME task as the mutation) vs fresh ones.
  const check = (label, mutate) => p.evaluate(([label, mutate]) => {
    // Warm the cache first, so a stale entry would be served if invalidation failed.
    const lines = () => Array.from(document.querySelectorAll('#windowport .BufferWindow .BufferLine'));
    lines().forEach(l => BufferRevision.lineFacts(l)); BufferRevision.TEXT_KEYS.forEach(k => BufferRevision.text(k));
    (new Function(mutate))();
    const cached = { facts: lines().map(l => JSON.stringify(BufferRevision.lineFacts(l))), texts: BufferRevision.TEXT_KEYS.map(k => BufferRevision.text(k)) };
    BufferRevision.bypass = true;
    const fresh = { facts: lines().map(l => JSON.stringify(BufferRevision.lineFacts(l))), texts: BufferRevision.TEXT_KEYS.map(k => BufferRevision.text(k)) };
    BufferRevision.bypass = false;
    const bad = cached.facts.findIndex((f, i) => f !== fresh.facts[i]);
    return { same: bad < 0 && cached.facts.length === fresh.facts.length && cached.texts.every((t, i) => t === fresh.texts[i]), bad, n: cached.facts.length };
  }, [label, mutate]);

  const target = `const ls = Array.from(document.querySelectorAll('#windowport .BufferWindow .BufferLine')).filter(l => l.textContent.trim().length > 6 && !l.querySelector('.Input'));`;
  let r;
  r = await check('same-length', target + `const l = ls[ls.length - 2]; const tn = document.createTreeWalker(l, NodeFilter.SHOW_TEXT).nextNode(); tn.nodeValue = tn.nodeValue.split('').reverse().join('');`);
  ok(r.same, 'a line rewritten to different text of the SAME length is re-read: ' + JSON.stringify(r));
  r = await check('class-sub', target + `const l = ls[1]; const s = document.createElement('span'); l.appendChild(s); BufferRevision.sync(); s.className = 'Style_subheader';`);
  ok(r.same, 'a class-only change that makes a span a room banner is seen: ' + JSON.stringify(r));
  r = await check('class-input', target + `const s = ls[2].querySelector('span') || ls[2]; s.classList.add('Style_input');`);
  ok(r.same, 'a class-only change that marks a command echo is seen: ' + JSON.stringify(r));
  r = await check('subtree', target + `const l = ls[ls.length - 1]; const span = document.createElement('span'); span.className = 'pl-act'; span.textContent = l.textContent; l.textContent = ''; l.appendChild(span);`);
  ok(r.same, 'an underline-style subtree replacement inside a line is seen: ' + JSON.stringify(r));
  r = await check('hidden', target + `ls[0].classList.add('pl-stat-probe'); ls[0].setAttribute('aria-hidden', 'true'); ls[0].classList.remove('pl-stat-probe'); ls[0].removeAttribute('aria-hidden');`);
  ok(r.same, 'a hidden probe line being released is seen: ' + JSON.stringify(r));
  r = await check('nested', target + `const inner = document.createElement('div'); inner.className = 'BufferLine'; inner.textContent = 'nested'; ls[3].appendChild(inner); BufferRevision.lineFacts(ls[3]); inner.className = 'BufferLine Style_subheader';`);
  ok(r.same, 'a change inside a nested line invalidates the enclosing line too: ' + JSON.stringify(r));
  r = await check('window', `const wp = document.getElementById('windowport'); const c = wp.cloneNode(true); wp.parentNode.replaceChild(c, wp);`);
  ok(r.same, 'replacing #windowport (restore/window recreation) re-observes and serves fresh text: ' + JSON.stringify(r));

  // The check above can fail: with line invalidation switched off, the same
  // same-length rewrite must be caught as a stale cached fact.
  await p.evaluate(() => { window.__inv = BufferRevision._invalidateLines; BufferRevision._invalidateLines = function () {}; });
  r = await check('broken', target + `const l = ls[ls.length - 3]; const s = document.createElement('span'); s.className = 'Style_subheader'; s.textContent = 'x'; l.appendChild(s);`);
  await p.evaluate(() => { BufferRevision._invalidateLines = window.__inv; });
  ok(!r.same, 'control: the harness detects a cache that stops invalidating lines: ' + JSON.stringify(r));

  // StatTracker skips re-reading untouched lines: after every kind of change,
  // its recorded text for EVERY line must still equal the line's current text.
  const cursorCheck = (mutate) => p.evaluate((mutate) => {
    StatTracker.freshOutputSpans();
    (new Function(mutate))();
    const spans = StatTracker.freshOutputSpans();
    const ls = Array.from(document.querySelectorAll('.BufferWindow .BufferLine'));
    const stale = ls.filter(l => { const s = StatTracker._lineCursor.get(l); return !s || s.text !== StatTracker.lineText(l); }).length;
    return { stale, spans: spans.map(s => s.text) };
  }, mutate);
  let c = await cursorCheck(target + `const tn = document.createTreeWalker(ls[ls.length - 2], NodeFilter.SHOW_TEXT).nextNode(); tn.nodeValue = tn.nodeValue.split('').reverse().join('');`);
  ok(c.stale === 0 && c.spans.length === 1, 'StatTracker: a same-length rewrite is re-read and reported once: ' + JSON.stringify(c).slice(0, 160));
  c = await cursorCheck(target + `ls[1].appendChild(document.createTextNode(' Your score has gone up by five points.'));`);
  ok(c.stale === 0 && c.spans.some(s => /score has gone up/.test(s)), 'StatTracker: appended output still yields its fresh span: ' + JSON.stringify(c).slice(0, 160));
  c = await cursorCheck(`const wp = document.getElementById('windowport'); const n = wp.cloneNode(true); wp.parentNode.replaceChild(n, wp);`);
  ok(c.stale === 0, 'StatTracker: after #windowport is replaced every line is re-read: ' + JSON.stringify(c).slice(0, 160));
  // #1839: innerText follows inline style and the hidden attribute, which the
  // product does write (style.display), so those releases must be re-read.
  await p.evaluate(() => { const l = Array.from(document.querySelectorAll('#windowport .BufferLine')).filter(x => x.textContent.trim().length > 6 && !x.querySelector('.Input')).pop();
    const s = document.createElement('span'); s.id = '__styled'; s.textContent = ' HIDDENTXT'; s.style.display = 'none'; l.appendChild(s);
    const h = document.createElement('span'); h.id = '__hiddenattr'; h.textContent = ' HIDDENATTR'; h.hidden = true; l.appendChild(h); });
  c = await cursorCheck(`document.getElementById('__styled').style.display = '';`);
  ok(c.stale === 0 && c.spans.some(s => /HIDDENTXT/.test(s)), 'StatTracker: an inline-style release (style.display) is re-read: ' + JSON.stringify(c).slice(0, 160));
  c = await cursorCheck(`document.getElementById('__hiddenattr').hidden = false;`);
  ok(c.stale === 0 && c.spans.some(s => /HIDDENATTR/.test(s)), 'StatTracker: a hidden-attribute release is re-read: ' + JSON.stringify(c).slice(0, 160));
  // A story line OUTSIDE #windowport has no trustworthy version and is always re-read.
  await p.evaluate(() => { const w = document.createElement('div'); w.className = 'BufferWindow'; w.id = '__outside';
    const l = document.createElement('div'); l.className = 'BufferLine'; l.textContent = 'outside line abc'; w.appendChild(l); document.body.appendChild(w); });
  c = await cursorCheck(`const l = document.querySelector('#__outside .BufferLine'); l.firstChild.nodeValue = 'outside line cba';`);
  ok(c.stale === 0 && c.spans.some(s => /cba/.test(s)), 'StatTracker: a change to a line outside #windowport is still read: ' + JSON.stringify(c).slice(0, 160));
  await p.evaluate(() => document.getElementById('__outside').remove());
  c = await cursorCheck(``);
  ok(c.stale === 0 && c.spans.length === 0, 'StatTracker: an idle tick reports nothing and leaves no stale line');

  // Idle: repeated reads with no mutation never rebuild.
  const idle = await p.evaluate(() => { BufferRevision.TEXT_KEYS.forEach(k => BufferRevision.text(k)); const before = BufferRevision.stats.textRebuilds;
    for (let i = 0; i < 50; i++) BufferRevision.TEXT_KEYS.forEach(k => BufferRevision.text(k)); return BufferRevision.stats.textRebuilds - before; });
  ok(idle === 0, 'idle reads are served from the cache (rebuilds: ' + idle + ')');
  ok(await p.evaluate(() => { const b = BufferRevision.stats.textRebuilds; BufferRevision.text('.BufferWindow, .GridWindow, #windowport'); BufferRevision.text('.BufferWindow, .GridWindow, #windowport'); return BufferRevision.stats.textRebuilds - b === 2; }),
    'a selector outside the whitelist is never cached');

  // Actionable reaches the same Signature/RoomLines/marks with the cache on and off.
  await b.close();
  const b2 = await chromium.launch(); const p2 = await (await b2.newContext({ viewport: { width: 412, height: 900 } })).newPage();
  await p2.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen', 'PL_TutorialLibrarySeen']) localStorage.setItem(k, '1'); });
  await p2.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/anchor.z8.js'); await p2.waitForTimeout(5000);
  await p2.evaluate(() => { if (window.Message && Message.IsOpen) Message.Hide(); });
  for (let i = 0; i < 14 && !(await p2.locator('.Input.LineInput').count()); i++) { await p2.keyboard.press('Space'); await p2.waitForTimeout(250); }
  for (const c of ['look', 'southeast', 'i']) { const li = p2.locator('.Input.LineInput'); await li.fill(c); await li.press('Enter'); await p2.waitForTimeout(1500); }
  const same = await p2.evaluate(() => {
    const snap = () => { Actionable.Signature = null; Actionable.Refresh();
      return JSON.stringify({ sig: Actionable.Signature, room: (Actionable.RoomLines || []).map(l => l.textContent), marks: Array.from(document.querySelectorAll('.pl-act:not(.is-stale)')).map(m => m.textContent) }); };
    const cached = snap(); BufferRevision.bypass = true; const fresh = snap(); BufferRevision.bypass = false;
    return { equal: cached === fresh, marks: JSON.parse(cached).marks.length };
  });
  ok(same.equal && same.marks > 0, 'Actionable.Refresh: identical Signature, RoomLines and underline marks with the cache on and off: ' + JSON.stringify(same));
  await b2.close();
  console.log(pass + ' PASS / ' + fail + ' FAIL'); process.exit(fail ? 1 : 0);
})();
