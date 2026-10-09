// Scratch (claude): story-window bottom vs direction handle on phones.
const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
(async () => { const b = await chromium.launch();
 for (const [w,h] of [[390,844],[320,640],[412,915]]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen','PL_MobileTutorialSeen','PL_LearnedWordsTutorialSeen','PL_TutorialLibrarySeen']) localStorage.setItem(k,'1'); });
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/anchor.z8.js'); await p.waitForTimeout(4500);
  await p.evaluate(() => { if (Message.IsOpen) Message.Hide(); });
  for (let i = 0; i < 20 && !(await p.locator('.Input.LineInput').count()); i++) { await p.keyboard.press('Space'); await p.waitForTimeout(250); }
  const li = p.locator('.Input.LineInput'); for (const c of ['look','look','inventory']) { await li.fill(c); await li.press('Enter'); await p.waitForTimeout(1200); }
  await p.screenshot({ path: 'work/investigations/beautify-shots/textwin-' + w + '.png' });
  console.log(w, JSON.stringify(await p.evaluate(() => { const rr = e => { const b = e.getBoundingClientRect(); return [Math.round(b.top), Math.round(b.bottom)]; };
    const bw = document.querySelector('#windowport .BufferWindow'); const cs = getComputedStyle(bw);
    const lines = Array.from(bw.querySelectorAll('.BufferLine')).filter(l => l.textContent.trim()); const last = lines[lines.length - 1];
    const hd = document.getElementById('pl-dirpad-handle'); const hb = hd.getBoundingClientRect(); const bs = getComputedStyle(hd, '::before');
    return { win: rr(bw), padBottom: cs.paddingBottom, contentBottom: Math.round(bw.getBoundingClientRect().bottom - parseFloat(cs.paddingBottom)), lastLine: last ? rr(last) : null, handleBox: rr(hd), dotH: bs.height, dotTop: bs.top, protectorTop: innerHeight - parseFloat(getComputedStyle(document.getElementById('windowport'), '::after').height), input: rr(document.querySelector('.Input.LineInput')) }; })));
  await p.close(); }
 await b.close(); })();
