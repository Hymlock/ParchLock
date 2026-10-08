// D214 U5/U6: the Yourself editable lane offers the story's own item verbs,
// and the full item radial never offers give/put in a story whose dictionary
// lacks them -- without touching games where no dictionary can be read.
//   node harness/d214-yourself-verbs.js
const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? 'PASS: ' : 'FAIL: ') + m); };
async function run(b, game, cmds, probe) {
  const p = await (await b.newContext({ viewport: { width: 412, height: 900 } })).newPage();
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen', 'PL_TutorialLibrarySeen']) localStorage.setItem(k, '1'); });
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + game); await p.waitForTimeout(4500);
  await p.evaluate(() => { if (Message.IsOpen) Message.Hide(); try { localStorage.setItem(ModuleLibrary.inventoryWarningKey(ParchLock.StoryPath || ParchLock.GameFilename), '1'); } catch (e) {} });
  for (let i = 0; i < 20 && !(await p.locator('.Input.LineInput').count()); i++) { if (await p.locator('.Input.CharInput').count()) await p.keyboard.press('Space'); await p.waitForTimeout(300); }
  const ready = async () => { for (let i = 0; i < 20 && !(await p.locator('.Input.LineInput').count()); i++) { if (await p.locator('.Input.CharInput').count()) await p.keyboard.press('Space'); await p.waitForTimeout(300); } };
  for (const c of cmds) { await ready(); const li = p.locator('.Input.LineInput'); await li.fill(c); await li.press('Enter'); await p.waitForTimeout(2000); }
  await ready();
  const r = await p.evaluate(probe); await p.close(); return r;
}
const items = () => { const m = EquipmentUI.model(); return m.items.map(o => ({ name: o.name, full: ActionSynth.commandsForObject(o, 'inventory', null).map(c => c.command.trim()),
  yourself: EquipmentUI.yourselfCommands(o, m).map(c => c.Form + (c.Enter ? '' : '…')) })); };
(async () => {
  const b = await chromium.launch();
  // Treasures: no "give"/"put" in its dictionary; has light/turn/hold/push/smell.
  const t = await run(b, 'TreasuresofaSlaversKingdom.z8.js', ['seize gladius', 'south', 'in', 'seize flashlight'], items);
  const sword = t.find(i => /sword|gladius/i.test(i.name)), lamp = t.find(i => /flashl/i.test(i.name));
  ok(sword && lamp, 'Treasures: sword and flashlight held ' + JSON.stringify(t.map(i => i.name)));
  ok(t.every(i => i.full.every(c => !/^(give|put) /.test(c))), 'U6 Treasures: no invented give/put in the full item radial ' + JSON.stringify(sword && sword.full));
  ok(lamp && ['light…', 'turn on…'].every(f => lamp.yourself.includes(f)), 'U5 Treasures: flashlight Yourself lane offers light / turn on ' + JSON.stringify(lamp && lamp.yourself));
  ok(sword && sword.yourself.includes('hold…') && !sword.yourself.some(f => /^(read|wear|eat)/.test(f)), 'U5 Treasures: only this story\'s own verbs (hold yes; read/wear/eat not in its dictionary) ' + JSON.stringify(sword && sword.yourself));
  ok(t.every(i => i.yourself.filter(f => !f.endsWith('…')).every(f => /^(examine|use|drop)$/.test(f))), 'U5: submit-ready entries are unchanged (examine/use/drop only)');
  // Hitchhiker's: richer dictionary keeps give/put and gains its own verbs.
  const h = await run(b, 'Hitchhik.z5.js', ['turn on light', 'get up', 'take gown', 'i'], items);
  const gown = h.find(i => /gown/i.test(i.name));
  ok(gown && gown.full.some(c => /^(give|put) /.test(c)) || h.some(i => i.full.some(c => /^(give|put) /.test(c))), 'U6 HHG: give/put still offered (both are in its dictionary) ' + JSON.stringify(h.map(i => i.full)));
  ok(h.some(i => i.yourself.some(f => /^(read|open|throw|wave|clean)…$/.test(f))), 'U5 HHG: its own item verbs appear as editable suggestions ' + JSON.stringify(h.map(i => i.name + ':' + i.yourself.join(','))));
  // Wumpus (operator: do not break it): its forms follow its own dictionary.
  const w = await run(b, 'wump2ka.z5.js', ['no', 'i'], () => ({ items: (() => { try { const m = EquipmentUI.model(); return m.items.map(o => ({ name: o.name, full: ActionSynth.commandsForObject(o, 'inventory', null).map(c => c.command.trim()) })); } catch (e) { return String(e); } })(),
    give: Actionable.isGameWord('give') && Actionable.isGameWord('to'), put: Actionable.isGameWord('put') && Actionable.isGameWord('in') }));
  ok(Array.isArray(w.items) && w.items.every(i => i.full.some(c => /^give /.test(c)) === w.give && i.full.some(c => /^put /.test(c)) === w.put), 'Wumpus: give/put present exactly when its dictionary has them ' + JSON.stringify(w).slice(0, 300));
  // Glulx control: no Z dictionary adapter, so the forms stay as before.
  const g = await run(b, 'CounterfeitMonkey.gblorb.js', [], () => ({ mem: !!(ZRamProvider.getMem && ZRamProvider.getMem()), give: ActionSynth.literalAvailable('give to'), put: ActionSynth.literalAvailable('put in') }));
  ok(!g.mem && g.give && g.put, 'Glulx (no dictionary adapter): give/put stay available ' + JSON.stringify(g));
  // #1944: with a dictionary adapter present, a read that throws fails CLOSED.
  const closed = await run(b, 'TreasuresofaSlaversKingdom.z8.js', [], () => { const h = ZRamReader.hasDictionaryWord; ZRamReader.hasDictionaryWord = () => { throw new Error('read failure'); };
    const r = { adapter: !!ZRamProvider.getMem(), give: ActionSynth.literalAvailable('give to') }; ZRamReader.hasDictionaryWord = h; return r; });
  ok(closed.adapter && closed.give === false, 'U6: an adapter read failure fails closed (no invented give/put) ' + JSON.stringify(closed));
  await b.close();
  console.log(pass + ' PASS / ' + fail + ' FAIL'); process.exit(fail ? 1 : 0);
})();
