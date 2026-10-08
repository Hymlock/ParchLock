// Scratch (claude, sealed investigation): import the operator's save package,
// restore it, then dump underlines, scope and the Yourself-hold menu per item.
//   node harness/_ul_save.js GAME.js "PACKAGE.json" ["cmd1,cmd2"]
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs'); const { pathToFileURL } = require('url');
(async () => {
  const [game, pkg, cmds] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 412, height: 900 } })).newPage();
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen', 'PL_TutorialLibrarySeen']) localStorage.setItem(k, '1'); });
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + game); await p.waitForTimeout(4500);
  await p.evaluate((bp) => { if (bp && typeof BufferRevision !== "undefined") BufferRevision.bypass = true; /*BYPASS*/ if (Message.IsOpen) Message.Hide(); try { localStorage.setItem(ModuleLibrary.inventoryWarningKey(ParchLock.StoryPath || ParchLock.GameFilename), '1'); } catch (e) {} }, process.argv.includes("--bypass"));
  for (let i = 0; i < 20 && !(await p.locator('.Input.LineInput').count()); i++) { await p.keyboard.press('Space'); await p.waitForTimeout(300); }
  await p.evaluate(text => ParchLockQol.ImportPackageData(text), fs.readFileSync(pkg, 'utf8')); await p.waitForTimeout(500);
  await p.evaluate(() => { if (Message.IsOpen) Message.Hide(); });
  const li = p.locator('.Input.LineInput'); await li.fill('restore'); await li.press('Enter');
  await p.waitForSelector('#dialog_select', { timeout: 15000 }); await p.locator('#dialog_select').selectOption({ index: 0 }); await p.locator('#dialog_accept').click(); await p.waitForTimeout(2500);
  const dump = async (label) => console.log(label.padEnd(10), JSON.stringify(await p.evaluate(() => { const pl = WorldModel.lastPayload || {};
    let your = {}; try { const m = EquipmentUI.model(); m.items.forEach(o => { your[o.id + ':' + o.name] = { full: ActionSynth.commandsForObject(o, 'inventory', ActionSynth.heldContainerName(o, WorldModel.lastPayload)).map(c => c.command + (c.Enter === false || c.enter === false ? '…' : '')), unique: Actionable.referenceFor(o).unique, worn: !!(o.attrs || {}).worn, cmds: EquipmentUI.yourselfCommands(o, m).map(c => c.Form + (c.Enter ? '' : '…')) }; }); } catch (e) { your = String(e); }
    const lines = Array.from(document.querySelectorAll('#windowport .BufferWindow .BufferLine')); const lastInput = lines.map(l => !!l.querySelector('.Style_input')).lastIndexOf(true);
    return { room: pl.roomName, marks: Array.from(document.querySelectorAll('.pl-act:not(.is-stale)')).map(m => { const li = lines.indexOf(m.closest('.BufferLine')); return m.textContent + '@' + (li - lastInput); }),
      disc: (pl.discoveredObjects || []).map(o => o.id + ':' + o.name), cands: (pl.unnamedCandidates || []).map(c => c.id + ':' + (c.aliases || []).join('/')),
      dark: !!(typeof DarkScope !== 'undefined' && DarkScope.dark), yourself: your,
      tail: Array.from(document.querySelectorAll('.BufferWindow .BufferLine')).slice(-8).map(l => l.textContent.trim()).filter(Boolean).join(' | ').slice(0, 500) }; })));
  await dump('restored');
  for (const c of (cmds || '').split(',').filter(Boolean)) { await li.fill(c); await li.press('Enter'); await p.waitForTimeout(2000); await dump(c); }
  await b.close();
})();
