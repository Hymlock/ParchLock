// Coverage and full-name-span fixtures (grok #3788 T3, #3799 A2-A4, #3804 R1 pin; claude 2026-10-17).
// Isolated DOM over the real Actionable code with a fixed vocabulary.
//   node harness/coverage-fixtures.js [page.html]
const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
const page = process.argv[2] || 'play.html';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); });
  await p.goto(pathToFileURL(path.resolve(page)).href + '?story=games/wump2ka.z5.js'); await p.waitForFunction(() => typeof Actionable !== 'undefined', null, { timeout: 30000 }); await p.waitForTimeout(1500);
  const res = await p.evaluate(() => {
    const out = [], add = (ok, name, info) => out.push({ ok, name, info });
    const host = document.createElement('section'); document.body.appendChild(host);
    const saved = { pool: Actionable.payloadPool, marks: Actionable.LiveMarks };
    const setup = html => { host.innerHTML = html; Actionable.LiveMarks = [...host.querySelectorAll('.pl-act')]; return [...host.querySelectorAll('.BufferLine')]; };
    const usePool = pool => { Actionable.payloadPool = () => pool; };
    try {
      const brass = { id: 55, name: 'brass cage', aliases: ['brass', 'cage'] }, iron = { id: 56, name: 'iron cage', aliases: ['iron', 'cage'] }, door = { id: 57, name: 'cage door', aliases: ['cage', 'door'] };
      // T3: heads 55/56 represented elsewhere -> group covers the remaining candidate 57.
      const pool3 = [brass, iron, door]; usePool(pool3);
      setup('<div class="BufferLine"><span class="pl-act" data-object-id="55" data-candidate-ids="[55]">brass cage</span> <span class="pl-act" data-object-id="56" data-candidate-ids="[56]">iron cage</span> <span class="pl-act" data-candidate-ids="[55,56,57]">cage</span></div>');
      Actionable.reconcileMarkCoverage(pool3);
      const g = Actionable.LiveMarks[2];
      add(g.dataset.coverIds === '["57"]' && g.dataset.candidateIds === '[55,56,57]', 'T3 group with reserved heads covers its remaining candidate', g.dataset.coverIds);
      // T1 unchanged: every candidate reserved -> explicit [].
      setup('<div class="BufferLine"><span class="pl-act" data-object-id="55" data-candidate-ids="[55]">brass cage</span> <span class="pl-act" data-object-id="56" data-candidate-ids="[56]">iron cage</span> <span class="pl-act" data-candidate-ids="[55,56]">cage</span></div>');
      Actionable.reconcileMarkCoverage([brass, iron]);
      add(Actionable.LiveMarks[2].dataset.coverIds === '[]', 'T1 fully reserved group keeps explicit empty coverage', Actionable.LiveMarks[2].dataset.coverIds);
      // A4: "cage" inside another object's printed full name ("cage door") is skipped; the free-standing one wraps.
      usePool([brass, door]);
      let lines = setup('<div class="BufferLine">The cage door creaks beside the cage.</div>');
      Actionable.wrapFirstExact(lines, 'cage', { phrase: 'cage', objectId: 55, kind: 'object' });
      let m = host.querySelector('.pl-act'), pre = m && m.previousSibling ? m.previousSibling.nodeValue : '';
      add(!!m && /beside the $/.test(pre), 'A4 bare cage skips "cage door" and wraps the free-standing cage', pre);
      // A3: an object's OWN full name never blocks it (self = 55, only owner in scope).
      usePool([brass]);
      lines = setup('<div class="BufferLine">A brass cage sits here.</div>');
      add(Actionable.wrapFirstExact(lines, 'cage', { phrase: 'cage', objectId: 55, kind: 'object' }), 'A3 own full name does not block its own bare noun');
      // Suvehnux: "cage" for 56 is skipped inside "brass cage".
      usePool([brass, { id: 56, name: 'bars of the cage', aliases: ['bars', 'cage'] }]);
      lines = setup('<div class="BufferLine">The scroll and the brass cage fly out.</div>');
      add(!Actionable.wrapFirstExact(lines, 'cage', { phrase: 'cage', objectId: 56, kind: 'object' }), 'suvehnux bare cage for 56 never wraps inside "brass cage"');
      // Rebuilt marks (grok #3788 (i)/(ii)): retainMarks then reconcile, the order every markup pass uses.
      const covered = pool => { const ids = Actionable.LiveMarks.flatMap(Actionable.markCoverIds); return { ids, exclusive: new Set(ids).size === ids.length, missing: pool.map(o => String(o.id)).filter(id => !ids.includes(id)) }; };
      // (i) A retained group whose owners shrink to one becomes unique; a fresh unique mark of the same object in a newer
      // line must stay clickable, and ownership stays exclusive.
      setup('<div class="BufferLine">An old <span class="pl-act" data-candidate-ids="[55,56]" data-cover-ids="[55,56]">cage</span>.</div><div class="BufferLine">A <span class="pl-act" data-object-id="55" data-candidate-ids="[55]" data-cover-ids="[55]">brass cage</span>.</div>');
      usePool([brass]); Actionable.retainMarks([brass]); Actionable.reconcileMarkCoverage([brass]);
      let c = covered([brass]), fresh = host.querySelectorAll('.pl-act')[1];
      const old = host.querySelectorAll('.pl-act')[0];
      add(!old.classList.contains('is-stale') && old.dataset.objectId === '55', '(i) precondition: retained group rebuilt as unique 55 (not stale)', { stale: old.className, obj: old.dataset.objectId });
      add(c.exclusive && !c.missing.length && fresh.isConnected && fresh.dataset.candidateIds === '[55]', '(i) group shrunk to one owner: exclusive, nothing uncovered, fresh mark clickable', { c, fresh: fresh.dataset.coverIds, old: host.querySelectorAll('.pl-act')[0].dataset.coverIds });
      // (ii) A retained unique that gains a second owner turns into a group; no scoped id may end up uncovered.
      const twin = { id: 58, name: 'brass cage', aliases: ['brass', 'cage'] };
      setup('<div class="BufferLine">A <span class="pl-act" data-object-id="55" data-candidate-ids="[55]" data-cover-ids="[55]">brass cage</span> and a <span class="pl-act" data-candidate-ids="[55,56]" data-cover-ids="[55,56]">cage</span>.</div>');
      usePool([brass, iron, twin]); Actionable.retainMarks([brass, iron, twin]); Actionable.reconcileMarkCoverage([brass, iron, twin]);
      c = covered([brass, iron]);
      add(c.exclusive && !c.missing.length, '(ii) unique turned group: exclusive and every retained-candidate object still covered', c);
      // A2: per-pass cache gives identical answers to the uncached path.
      usePool([brass, iron, door]);
      const text = 'the brass cage, the cage door and an iron cage near a cage', probes = [];
      for (let i = text.indexOf('cage'); i >= 0; i = text.indexOf('cage', i + 1)) for (const id of [55, 56, 57, null]) probes.push([i, id]);
      const run = () => probes.map(([i, id]) => Actionable.insideOtherFullName(text, i, i + 4, { objectId: id }));
      const plain = run(); Actionable._fullNameSpans = { names: Actionable.multiWordNames(), bySource: new Map() };
      const cached = run(), again = run(); Actionable._fullNameSpans = null;
      add(JSON.stringify(plain) === JSON.stringify(cached) && JSON.stringify(cached) === JSON.stringify(again), 'A2 cached spans equal uncached for every occurrence and owner', { plain, cached });
    } finally { Actionable.payloadPool = saved.pool; Actionable.LiveMarks = saved.marks; Actionable._fullNameSpans = null; host.remove(); }
    return out;
  });
  // R1 pin (grok #3804), native: "examine cage" marks "the brass cage" [55]; the next reply "examine bars" prints
  // "The bars of the cage" (contains "cage"). The retained 55 and the fresh 56 must each own one exclusive mark.
  const q = await b.newPage();
  await q.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
  await q.goto(pathToFileURL(path.resolve(page)).href + '?story=games/suvehnux.z5.js'); await q.waitForTimeout(2000);
  for (let i = 0; i < 35; i++) { await q.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { Message.Hide(); } catch (e) {} }); if (await q.locator('.Input.LineInput').count()) break; await q.keyboard.press('Space'); await q.waitForTimeout(150); }
  for (const c of ['examine cage', 'examine bars']) { await q.locator('.Input.LineInput').fill(c); await q.keyboard.press('Enter'); await q.waitForTimeout(1500); }
  const r1 = await q.evaluate(() => {
    const lines = [...document.querySelectorAll('#windowport .BufferWindow .BufferLine')], last = -1;
    const ms = [...document.querySelectorAll('.pl-act:not(.is-stale)')].filter(m => lines.indexOf(m.closest('.BufferLine')) > last && m.dataset.kind !== 'direction');
    const all = [...document.querySelectorAll('.pl-act:not(.is-stale)')].filter(m => m.dataset.kind !== 'direction').flatMap(Actionable.markCoverIds);
    return { marks: ms.map(m => [m.textContent, Actionable.markCoverIds(m)]), exclusive: new Set(all).size === all.length };
  });
  const own = (re, id) => r1.marks.filter(([t, c]) => re.test(t) && c.join() === id).length === 1;
  res.push({ ok: r1.exclusive && own(/^brass cage$/i, '55') && own(/^bars of the cage$/i, '56') && !r1.marks.some(([t, c]) => /^cage$/i.test(t)), name: 'R1 pin: retained brass cage [55] + fresh "bars of the cage" [56], exclusive, no bare cage', info: r1 });
  let f = 0; res.forEach(r => { if (!r.ok) f++; console.log((r.ok ? 'PASS ' : 'FAIL ') + r.name + (r.ok ? '' : ' :: ' + JSON.stringify(r.info))); });
  console.log((res.length - f) + ' PASS / ' + f + ' FAIL'); await b.close(); process.exit(f ? 1 : 0);
})();
