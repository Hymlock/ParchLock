const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 412, height: 900 } })).newPage();
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen', 'PL_TutorialLibrarySeen']) localStorage.setItem(k, '1'); });
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + process.argv[2]); await p.waitForTimeout(4500);
  await p.evaluate(() => { if (Message.IsOpen) Message.Hide(); });
  for (let i = 0; i < 20 && !(await p.locator('.Input.LineInput').count()); i++) { await p.keyboard.press('Space'); await p.waitForTimeout(300); }
  for (const c of (process.argv[3] || '').split(',').filter(Boolean)) { const li = p.locator('.Input.LineInput'); await li.fill(c); await li.press('Enter'); await p.waitForTimeout(1800); }
  console.log(JSON.stringify(await p.evaluate(() => { const pl = WorldModel.lastPayload || {}, mem = ZRamProvider.getMem(); const pid = pl.playerId;
    const kids = id => { try { return ZRamReader.children(mem, id).map(k => k + ':' + ZRamReader.shortName(mem, k)); } catch (e) { return String(e); } };
    const links = pid ? ZRamReader.objectLinks(mem, pid) : null;
    let zr = null; try { zr = ZRamProvider.collect(); } catch (e) { zr = { err: String(e) }; }
    return { probe: pl.probe, playerId: pid, playerName: pid && ZRamReader.shortName(mem, pid), playerParent: links && links.parent + ':' + ZRamReader.shortName(mem, links.parent),
      parentKids: links && kids(links.parent), roomId: pl.roomId, roomKids: pl.roomId && kids(pl.roomId),
      zrDisc: zr && (zr.discoveredObjects || []).length, cands: (pl.unnamedCandidates || []).map(c => c.id + ':' + (c.aliases || []).join('/') + (c.parentId != null ? '@' + c.parentId : '') + (c.reason ? '[' + c.reason + ']' : '')), words: [147, 148, 245].map(id => { try { return id + '=' + (ZRamReader.parserWordsAny(mem, id) || []).join('/'); } catch (e) { return id + '!'; } }), zrKeys: zr && Object.keys(zr), inform: ZRamReader.isInformCompiled(mem) }; })).slice(0, 2500));
  await b.close(); })();
