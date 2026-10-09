// Scratch (claude, sealed investigation of #1981/#1982): restore a save package,
// then dump marks -> owners, each mark's radial commands and their build time,
// and the inventory with label provenance. Read-only.
//   node harness/_hhg2_probe.js GAME.js PACKAGE.json ["cmd1,cmd2"]
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs'); const { pathToFileURL } = require('url');
(async () => {
  const [game, pkg, cmds] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 412, height: 900 } })).newPage();
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen', 'PL_TutorialLibrarySeen']) localStorage.setItem(k, '1'); });
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + game); await p.waitForTimeout(4500);
  await p.evaluate(() => { if (Message.IsOpen) Message.Hide(); try { localStorage.setItem(ModuleLibrary.inventoryWarningKey(ParchLock.StoryPath || ParchLock.GameFilename), '1'); } catch (e) {} });
  const ready = async () => { for (let i = 0; i < 20 && !(await p.locator('.Input.LineInput').count()); i++) { if (await p.locator('.Input.CharInput').count()) await p.keyboard.press('Space'); await p.waitForTimeout(300); } };
  await ready();
  await p.evaluate(text => ParchLockQol.ImportPackageData(text), fs.readFileSync(pkg, 'utf8')); await p.waitForTimeout(500);
  await p.evaluate(() => { if (Message.IsOpen) Message.Hide(); });
  const li = p.locator('.Input.LineInput'); await li.fill('restore'); await li.press('Enter');
  await p.waitForSelector('#dialog_select', { timeout: 15000 }); await p.locator('#dialog_select').selectOption({ index: 0 }); await p.locator('#dialog_accept').click(); await p.waitForTimeout(3000);
  for (const c of (cmds || '').split(',').filter(Boolean)) { await ready(); await li.fill(c); await li.press('Enter'); await p.waitForTimeout(2500); }
  await ready();
  console.log(JSON.stringify(await p.evaluate(() => {
    const pl = WorldModel.lastPayload || {};
    const marks = Array.from(document.querySelectorAll('.pl-act:not(.is-stale)')).map(m => {
      const id = m.dataset.objectId, kind = m.dataset.kind; let cmds = [], ms = null;
      if (id) { const t = performance.now(); try { cmds = Actionable.resolveObjectCommands(id, kind === 'inventory' ? 'inventory' : 'room').map(c => c.command); } catch (e) { cmds = ['ERR ' + e.message]; } ms = +(performance.now() - t).toFixed(1); }
      return { text: m.textContent, id: id || null, cand: m.dataset.candidateIds || null, kind, ms, cmds };
    });
    const inv = (pl.inventory || []).map(o => ({ id: o.id, name: o.name, parent: o.parentId, prov: o.labelProvenance || null, aliases: (o.aliases || []).slice(0, 6) }));
    let refreshMs = null; try { const t = performance.now(); Actionable.Signature = ''; Actionable.Refresh(); refreshMs = +(performance.now() - t).toFixed(1); } catch (e) {}
    return { room: pl.roomName, player: pl.playerId, refreshMs, marks, inv,
      tail: Array.from(document.querySelectorAll('.BufferWindow .BufferLine')).slice(-10).map(l => l.textContent.trim()).filter(Boolean).join(' | ').slice(0, 700) };
  }), null, 0));
  await b.close();
})();
