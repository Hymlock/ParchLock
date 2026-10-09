// Scratch (claude, blind surface 3): Map panel and World Map, Anchorhead after a few moves.
const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
(async () => { const b = await chromium.launch();
 for (const [w,h] of [[1280,800],[390,844],[320,640]]) for (const lt of [false,true]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen','PL_MobileTutorialSeen','PL_LearnedWordsTutorialSeen','PL_TutorialLibrarySeen']) localStorage.setItem(k,'1'); });
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/anchor.z8.js'); await p.waitForTimeout(4500);
  await p.evaluate(lt => { if (Message.IsOpen) Message.Hide(); document.body.classList.toggle('light', lt); }, lt);
  for (let i = 0; i < 20 && !(await p.locator('.Input.LineInput').count()); i++) { await p.keyboard.press('Space'); await p.waitForTimeout(250); }
  const li = p.locator('.Input.LineInput'); for (const c of ['southeast','northwest','west','east']) { await li.fill(c); await li.press('Enter'); await p.waitForTimeout(1500); }
  await p.evaluate(() => ParchLockMap.Show()); await p.waitForTimeout(2500);
  const tag = w + (lt ? '-light' : '-dark');
  await p.screenshot({ path: 'work/investigations/beautify-shots/s3-map-' + tag + '.png' });
  const m = await p.evaluate(() => { const r = s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)]; };
    const clipped = Array.from(document.querySelectorAll('#map *')).filter(e => e.offsetParent && e.children.length === 0 && e.textContent.trim() && e.scrollWidth > e.clientWidth + 1).map(e => e.textContent.trim().slice(0, 30)).slice(0, 8);
    return { map: r('#map'), overflowX: document.documentElement.scrollWidth > innerWidth + 1, clipped }; });
  await p.evaluate(() => WorldMap.Open()); await p.waitForTimeout(2000);
  await p.screenshot({ path: 'work/investigations/beautify-shots/s3-world-' + tag + '.png' });
  console.log(tag, JSON.stringify(m));
  await p.close(); }
 await b.close(); })();
