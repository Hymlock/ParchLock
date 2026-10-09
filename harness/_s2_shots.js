// Scratch (claude, blind surface 2): buffer, input bar, floating controls.
const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
(async () => { const b = await chromium.launch();
 for (const [w,h] of [[1280,800],[390,844],[320,640]]) for (const lt of [false,true]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen','PL_MobileTutorialSeen','PL_LearnedWordsTutorialSeen','PL_TutorialLibrarySeen']) localStorage.setItem(k,'1'); });
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/anchor.z8.js'); await p.waitForTimeout(4500);
  await p.evaluate(lt => { if (Message.IsOpen) Message.Hide(); document.body.classList.toggle('light', lt); }, lt);
  for (let i = 0; i < 20 && !(await p.locator('.Input.LineInput').count()); i++) { await p.keyboard.press('Space'); await p.waitForTimeout(250); }
  const li = p.locator('.Input.LineInput'); for (const c of ['look','southeast','inventory']) { await li.fill(c); await li.press('Enter'); await p.waitForTimeout(1200); }
  await li.fill('examine the extremely long command line to see wrapping'); await p.waitForTimeout(400);
  await p.screenshot({ path: 'work/investigations/beautify-shots/s2-' + w + (lt ? '-light' : '-dark') + '.png' });
  console.log(w, lt, JSON.stringify(await p.evaluate(() => { const r = s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)]; };
    const st = document.querySelector('.GridWindow, #pl-statusbar, .pl-status'); return { input: r('.Input.LineInput'), send: r('#pl-input-send') || r('[id*="send"]'), mic: r('#pl-input-mic'), status: st ? [st.className || st.id, st.textContent.slice(0, 80)] : null, overflowX: document.documentElement.scrollWidth > innerWidth + 1 }; })));
  await p.close(); }
 await b.close(); })();
