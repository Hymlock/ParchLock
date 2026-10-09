// Scratch (claude): fresh HHG route to the gown/pocket state; marks -> owners, triggers, Take, timing.
const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 412, height: 900 } })).newPage();
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen', 'PL_TutorialLibrarySeen']) localStorage.setItem(k, '1'); });
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/Hitchhik.z5.js'); await p.waitForTimeout(4500);
  await p.evaluate(() => { if (Message.IsOpen) Message.Hide(); try { localStorage.setItem(ModuleLibrary.inventoryWarningKey(ParchLock.StoryPath || ParchLock.GameFilename), '1'); } catch (e) {} });
  const ready = async () => { for (let i = 0; i < 20 && !(await p.locator('.Input.LineInput').count()); i++) { if (await p.locator('.Input.CharInput').count()) await p.keyboard.press('Space'); await p.waitForTimeout(300); } };
  const li = p.locator('.Input.LineInput');
  for (const c of process.argv[2].split(',')) { await ready(); await li.fill(c); await li.press('Enter'); await p.waitForTimeout(2200); }
  console.log(JSON.stringify(await p.evaluate(() => { const pl = WorldModel.lastPayload || {}, pool = Actionable.payloadPool();
    const marks = Array.from(document.querySelectorAll('.pl-act:not(.is-stale)')).slice(-14).map(m => { const id = m.dataset.objectId; const o = id && pool.find(x => String(x.id) === id);
      let cmds = [], ms = null; if (id) { const t = performance.now(); try { cmds = Actionable.resolveObjectCommands(id, m.dataset.kind === 'inventory' ? 'inventory' : 'room').map(c => c.command); } catch (e) {} ms = +(performance.now() - t).toFixed(0); }
      return m.textContent + ' -> ' + (o ? o.id + ':' + o.name : (m.dataset.candidateIds || m.dataset.kind)) + ' [' + cmds.join(';') + '] ' + ms + 'ms'; });
    const inv = (pl.inventory || []).map(o => o.id + ':' + o.name + ' p' + o.parentId + ' prov=' + (o.labelProvenance || '-'));
    const triggers = pool.filter(o => /thing|analgesic|gown|fluff/i.test(o.name)).map(o => o.id + ':' + o.name + ' => ' + Actionable.namePhrases(o.name).join('|') + ' aliases=' + (o.aliases || []).join('/'));
    return { marks, inv, triggers, tail: Array.from(document.querySelectorAll('.BufferWindow .BufferLine')).slice(-8).map(l => l.textContent.trim()).filter(Boolean).join(' | ').slice(0, 600) }; }), null, 1));
  await b.close(); })();
