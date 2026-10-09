// Scratch (claude, death research): VM call frames / pc at a normal prompt vs the end-of-game prompt.
//   node harness/_death_frames.js GAME.js [PACKAGE.json|-] "cmd"
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs'); const { pathToFileURL } = require('url');
(async () => { const [game, pkg, cmd] = process.argv.slice(2); const b = await chromium.launch(); const p = await (await b.newContext()).newPage();
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen','PL_MobileTutorialSeen','PL_LearnedWordsTutorialSeen','PL_TutorialLibrarySeen']) localStorage.setItem(k,'1'); });
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + game); await p.waitForTimeout(4500);
  await p.evaluate(() => { if (Message.IsOpen) Message.Hide(); try { localStorage.setItem(ModuleLibrary.inventoryWarningKey(ParchLock.StoryPath || ParchLock.GameFilename), '1'); } catch (e) {} });
  const ready = async () => { for (let i = 0; i < 20 && !(await p.locator('.Input.LineInput').count()); i++) { if (await p.locator('.Input.CharInput').count()) await p.keyboard.press('Space'); await p.waitForTimeout(300); } };
  await ready(); const li = p.locator('.Input.LineInput');
  if (pkg && pkg !== '-') { await p.evaluate(t => ParchLockQol.ImportPackageData(t), fs.readFileSync(pkg, 'utf8')); await p.waitForTimeout(400); await p.evaluate(() => { if (Message.IsOpen) Message.Hide(); });
    await li.fill('restore'); await li.press('Enter'); await p.waitForSelector('#dialog_select'); await p.locator('#dialog_select').selectOption({ index: 0 }); await p.locator('#dialog_accept').click(); await p.waitForTimeout(2500); await ready(); }
  const state = () => p.evaluate(() => { const z = window.__PARCHLOCK_ZVM__; const mem = ZRamProvider.getMem(); const gb = mem.getUint16(0x0C);
    const fr = (z.frames || []).map(f => { const o = {}; for (const k of Object.keys(f)) { const v = f[k]; o[k] = typeof v === 'number' || typeof v === 'boolean' ? v : (Array.isArray(v) ? 'arr' + v.length : typeof v); } return o; });
    return { pc: z.pc, frames: fr, globals: Array.from({ length: 240 }, (_, i) => mem.getUint16(gb + i * 2)) }; });
  const a = await state(); await li.fill(cmd); await li.press('Enter'); await p.waitForTimeout(3000); await ready(); const c = await state();
  const tail = await p.evaluate(() => Array.from(document.querySelectorAll('.BufferWindow .BufferLine')).slice(-3).map(l => l.textContent.trim()).join(' | ').slice(0, 200));
  console.log(JSON.stringify({ before: { pc: a.pc, frames: a.frames }, after: { pc: c.pc, frames: c.frames }, changed: a.globals.map((v, i) => v !== c.globals[i] ? i + ':' + v + '>' + c.globals[i] : null).filter(Boolean), tail }));
  await b.close(); })();
