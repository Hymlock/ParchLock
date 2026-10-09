// Scratch (claude, blind surfaces 4-7): start screen, menus/tools/display, radial, rail.
const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
const shot = (p, n) => p.screenshot({ path: 'work/investigations/beautify-shots/s47-' + n + '.png' });
(async () => { const b = await chromium.launch();
 for (const [w,h] of [[1280,800],[390,844],[320,640]]) {
  const tag = String(w);
  // Start screen.
  let p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen','PL_MobileTutorialSeen','PL_LearnedWordsTutorialSeen','PL_TutorialLibrarySeen']) localStorage.setItem(k,'1'); });
  await p.goto(pathToFileURL(path.resolve('index.html')).href); await p.waitForTimeout(3000);
  await shot(p, 'start-' + tag); await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2)); await p.waitForTimeout(300); await shot(p, 'start-' + tag + '-mid');
  console.log('start', tag, JSON.stringify(await p.evaluate(() => ({ overflowX: document.documentElement.scrollWidth > innerWidth + 1, h: document.body.scrollHeight, text: document.body.innerText.slice(0, 600).replace(/\s+/g, ' ') }))));
  await p.close();
  // Play: menus.
  p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen','PL_MobileTutorialSeen','PL_LearnedWordsTutorialSeen','PL_TutorialLibrarySeen']) localStorage.setItem(k,'1'); });
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/anchor.z8.js'); await p.waitForTimeout(4500);
  await p.evaluate(() => { if (Message.IsOpen) Message.Hide(); });
  for (let i = 0; i < 20 && !(await p.locator('.Input.LineInput').count()); i++) { await p.keyboard.press('Space'); await p.waitForTimeout(250); }
  for (const id of ['game-menu', 'tools-toggle']) { const el = p.locator('#' + id); if (await el.isVisible().catch(() => false)) { await el.click(); await p.waitForTimeout(800); await shot(p, id + '-' + tag); await p.keyboard.press('Escape'); await p.waitForTimeout(400); } else console.log(id, tag, 'not visible'); }
  const disp = p.locator('#show-display'); if (await disp.isVisible().catch(() => false)) { await disp.click(); await p.waitForTimeout(800); await shot(p, 'display-' + tag); await p.keyboard.press('Escape'); await p.waitForTimeout(400); }
  const act = p.locator('.pl-act').first(); if (await act.count()) { const bb = await act.boundingBox(); await p.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2, { button: 'right' }); await p.waitForTimeout(900); await shot(p, 'radial-' + tag); }
  await p.close(); }
 await b.close(); })();
