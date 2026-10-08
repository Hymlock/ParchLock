// Scratch: CPU profile of WorldModel.tick at 5000 lines (self time by function).
const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 412, height: 900 } }); const p = await ctx.newPage();
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen', 'PL_TutorialLibrarySeen']) localStorage.setItem(k, '1'); });
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/anchor.z8.js'); await p.waitForTimeout(5000);
  await p.evaluate(() => { if (window.Message && Message.IsOpen) Message.Hide(); });
  for (let i = 0; i < 14 && !(await p.locator('.Input.LineInput').count()); i++) { await p.keyboard.press('Space'); await p.waitForTimeout(250); }
  for (const c of ['look', 'southeast', 'look']) { const li = p.locator('.Input.LineInput'); await li.fill(c); await li.press('Enter'); await p.waitForTimeout(1500); }
  await p.evaluate(() => { const buf = document.querySelector('.BufferWindow .BufferWindowInner') || document.querySelector('.BufferWindow');
    const lines = Array.from(document.querySelectorAll('.BufferWindow .BufferLine')).filter(l => !l.querySelector('.Input'));
    let n = document.querySelectorAll('.BufferWindow .BufferLine').length, i = 0;
    while (n < 5000) { const c = lines[i++ % lines.length].cloneNode(true); c.querySelectorAll('.pl-act').forEach(a => a.replaceWith(document.createTextNode(a.textContent))); buf.insertBefore(c, buf.firstChild); n++; } });
  await p.waitForTimeout(1500);
  console.log(JSON.stringify(await p.evaluate(() => { const T=f=>{const s=performance.now();f();return +(performance.now()-s).toFixed(2);};
  WorldModel.tick(); return { first: T(()=>StatTracker.statusText()), second: T(()=>StatTracker.statusText()), afterTick: (WorldModel.tick(), T(()=>StatTracker.statusText())) }; })));
  console.log(JSON.stringify(await p.evaluate(() => { const L=()=>{const s=performance.now();void document.body.offsetHeight;return +(performance.now()-s).toFixed(1);};
  L(); const out={}; WorldModel.providers.forEach(pr=>{ try{pr.collect();}catch(e){} out[pr.name]=L(); });
  // whole tick minus providers: patch providers to no-ops temporarily
  const saved=WorldModel.providers.map(pr=>pr.collect); L(); WorldModel.tick(); out.wholeTick=L();
  return out; })));
  const cdp = await ctx.newCDPSession(p); await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 100 }); await cdp.send('Profiler.start');
  await p.evaluate(() => { for (let k = 0; k < 20; k++) WorldModel.tick(); });
  const { profile } = await cdp.send('Profiler.stop');
  const self = {}; const dt = {}; const ids = profile.samples; const deltas = profile.timeDeltas;
  ids.forEach((id, i) => { dt[id] = (dt[id] || 0) + (deltas[i] || 0); });
  profile.nodes.forEach(n => { const f = n.callFrame; const k = (f.functionName || '(anon)') + ' ' + (f.url.split('/').pop() || '') + ':' + (f.lineNumber + 1); self[k] = (self[k] || 0) + (dt[n.id] || 0); });
  Object.entries(self).sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([k, v]) => console.log((v / 1000 / 20).toFixed(2) + ' ms/tick  ' + k));
  await b.close();
})();
