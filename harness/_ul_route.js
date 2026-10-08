// Scratch (claude, sealed investigation): play a route, print marks vs in-scope objects.
//   node harness/_ul_route.js GAME.js "cmd1,cmd2" [--bypass]
const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 412, height: 900 } })).newPage();
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen', 'PL_TutorialLibrarySeen']) localStorage.setItem(k, '1'); });
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + process.argv[2]); await p.waitForTimeout(4500);
  await p.evaluate((bp) => { if (Message.IsOpen) Message.Hide(); if (bp) BufferRevision.bypass = true; }, process.argv.includes('--bypass'));
  for (let i = 0; i < 20 && !(await p.locator('.Input.LineInput').count()); i++) { await p.keyboard.press('Space'); await p.waitForTimeout(300); }
  const dump = async (c) => { const r = await p.evaluate(() => { const pl = WorldModel.lastPayload || {};
      const lines = Array.from(document.querySelectorAll('#windowport .BufferWindow .BufferLine')); const lastInput = lines.map(l => !!l.querySelector('.Style_input')).lastIndexOf(true);
      return { room: pl.roomName, marks: Array.from(document.querySelectorAll('.pl-act:not(.is-stale)')).map(m => m.textContent + '@' + (lines.indexOf(m.closest('.BufferLine')) - lastInput)),
        disc: (pl.discoveredObjects || []).map(o => o.id + ':' + o.name), cands: (pl.unnamedCandidates || []).map(c => c.id + ':' + (c.aliases || []).join('/')), dark: !!(typeof DarkScope !== 'undefined' && DarkScope.dark), targets: ((Actionable.Scope || {}).roomNouns || []).slice(0, 20), inv: (pl.inventory || []).map(o => o.name),
        tail: Array.from(document.querySelectorAll('.BufferWindow .BufferLine')).slice(-6).map(l => l.textContent.trim()).filter(Boolean).join(' | ').slice(0, 300) }; });
    console.log(c.padEnd(12), JSON.stringify(r)); };
  await dump('(start)');
  for (const c of (process.argv[3] || '').split(',').filter(Boolean)) { const li = p.locator('.Input.LineInput'); await li.fill(c); await li.press('Enter'); await p.waitForTimeout(1800); await dump(c); }
  await b.close(); })();
