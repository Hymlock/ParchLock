// Scratch (claude): how many real moves before ZIL look-ahead predicts unwalked exits?
const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
(async () => { const b = await chromium.launch(); const p = await (await b.newContext()).newPage();
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen', 'PL_TutorialLibrarySeen']) localStorage.setItem(k, '1'); });
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + process.argv[2]); await p.waitForTimeout(4500);
  await p.evaluate(() => { if (Message.IsOpen) Message.Hide(); });
  for (let i = 0; i < 20 && !(await p.locator('.Input.LineInput').count()); i++) { await p.keyboard.press('Space'); await p.waitForTimeout(300); }
  const dump = async (c) => console.log(c.padEnd(8), JSON.stringify(await p.evaluate(() => { const rooms = ParchLockMap.Rooms || []; let hinted = 0, walked = 0;
    rooms.forEach(r => Object.keys(r.ExitMeta || {}).forEach(d => { const m = r.ExitMeta[d]; if (m.source === 'ram-lookahead') hinted++; else walked++; }));
    return { rooms: rooms.map(r => r.Name), hinted, walked, payloadExits: ((WorldModel.lastPayload || {}).exits || []).map(e => e.label + (e.targetRoomName ? '>' + e.targetRoomName : '')).slice(0, 8),
      calib: typeof ExitCalibrator !== 'undefined' && ExitCalibrator.table ? Object.keys(ExitCalibrator.table.props || ExitCalibrator.table || {}).length : null }; })));
  await dump('(start)');
  for (const c of process.argv[3].split(',')) { const li = p.locator('.Input.LineInput'); await li.fill(c); await li.press('Enter'); await p.waitForTimeout(1800); await dump(c); }
  await b.close(); })();
