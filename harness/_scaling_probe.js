// Scaling probe (scratch, read-only): per-call cost of the full-buffer walkers vs buffer size.
const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 412, height: 900 } })).newPage();
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen', 'PL_TutorialLibrarySeen']) localStorage.setItem(k, '1'); });
  const root = process.argv[2] || '.';
  await p.goto(pathToFileURL(path.resolve(root, 'play.html')).href + '?story=games/anchor.z8.js'); await p.waitForTimeout(5000);
  await p.evaluate(() => { if (window.Message && Message.IsOpen) Message.Hide(); });
  for (let i = 0; i < 14 && !(await p.locator('.Input.LineInput').count()); i++) { await p.keyboard.press('Space'); await p.waitForTimeout(250); }
  for (const c of ['look', 'southeast', 'look', 'i']) { const li = p.locator('.Input.LineInput'); await li.fill(c); await li.press('Enter'); await p.waitForTimeout(1500); }
  for (const target of [500, 2000, 5000]) {
    const r = await p.evaluate((target) => {
      const buf = document.querySelector('.BufferWindow .BufferWindowInner') || document.querySelector('.BufferWindow');
      const lines = Array.from(document.querySelectorAll('.BufferWindow .BufferLine')).filter(l => !l.querySelector('.Input'));
      const prompt = buf.querySelector('.BufferLine:last-child');
      let n = document.querySelectorAll('.BufferWindow .BufferLine').length, i = 0;
      while (n < target) { const c = lines[i++ % lines.length].cloneNode(true); c.querySelectorAll('.pl-act').forEach(a => a.replaceWith(document.createTextNode(a.textContent))); buf.insertBefore(c, buf.firstChild); n++; }
      const time = (fn) => { const t = []; for (let k = 0; k < 5; k++) { const s = performance.now(); try { fn(); } catch (e) {} t.push(performance.now() - s); } t.sort((a, b) => a - b); return +t[2].toFixed(2); };
      Actionable.Signature = null;
      return {
        lines: n,
        refresh: time(() => Actionable.Refresh()),
        worldTick: time(() => WorldModel.tick()),
        providers: (WorldModel.ensureProviders && WorldModel.ensureProviders(), WorldModel.providers.map(pr => pr.name + '=' + time(() => pr.collect())).join(' ')),
        lineLoops: time(() => { const ls = $('#windowport .BufferWindow .BufferLine').toArray(); let a=-1,h=-1; ls.forEach((l,i)=>{ if (l.querySelector('.Style_input')) a=i; }); ls.forEach((l,i)=>{ if ($(l).find('.Style_subheader').addBack('.Style_subheader').length) h=i; }); ls.forEach((l,i)=>{ if ($(l).find('.Style_subheader').addBack('.Style_subheader').length) h=i; }); }),
        refreshUnchanged: time(() => Actionable.Refresh()),
        tick: time(() => StatTracker.freshOutputSpans()),
        transcript: time(() => Transcript.collect()),
        readAloud: time(() => ReadAloud.collectNewLines()),
        nodes: document.querySelectorAll('*').length
      };
    }, target);
    console.log(JSON.stringify(r));
  }
  await b.close();
})();
