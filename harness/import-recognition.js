// D283: a user-imported story (the Add stories path, ModuleLibrary.addFiles) is recognised by its
// executable digest, so digest-keyed facts apply exactly as for the bundled copy. Edifice: import a
// plain .z5 decoded from the bundled copy, hide the built-in, play the rock sequence; expect the
// playerGlobal 18 fact, player 27 -> 57, the map room at boot and "Useful Rock" in Equipment.
//   node harness/import-recognition.js
const path = require('path'), fs = require('fs'), os = require('os');
const { pathToFileURL } = require('url');
const { chromium } = require(process.cwd() + '/node_modules/playwright');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m); };

const src = fs.readFileSync('games/edifice.z5.js', 'utf8');
const m = src.match(/processBase64Zcode\s*\(\s*["']([\s\S]*?)["']\s*\)/);
const b64 = m[1].replace(/\s+/g, '');

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 412, height: 900 } });
  await ctx.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
  const p = await ctx.newPage();
  const base = pathToFileURL(path.resolve('play.html')).href;
  await p.goto(base); await p.waitForTimeout(3000);
  const imp = await p.evaluate(async (b64) => {
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const res = await ModuleLibrary.addFiles([new File([bytes], 'edifice.z5', { type: 'application/octet-stream' })]);
    ModuleLibrary.hideBuiltIn('games/edifice.z5.js');
    return res.map(r => ({ status: r.status, path: r.item && r.item.Path }));
  }, b64);
  ok(imp[0] && imp[0].status === 'added' && /^local\//.test(imp[0].path), 'import added as a local module: ' + JSON.stringify(imp));
  await p.goto(base + '?story=' + imp[0].path); await p.waitForTimeout(3500);
  const settle = async () => { for (let i = 0; i < 25; i++) { await p.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { Message.Hide(); } catch (e) {} }); if (await p.locator('.Input.LineInput').count()) return; const c = p.locator('.Input.CharInput'); if (await c.count()) await c.first().focus(); await p.keyboard.press('Space'); await p.waitForTimeout(150); } };
  const send = async (c) => { await p.evaluate(c => { Input.Clear(); Input.Inject(c, true); }, c); await p.waitForTimeout(1300); await settle(); };
  const state = () => p.evaluate(() => {
    try { WorldModel.tick(); } catch (e) {}
    const P = WorldModel.lastPayload || {}; let rows = [];
    try { EquipmentUI.Show(); rows = [...document.querySelectorAll('#equipment .equip-name')].map(e => e.textContent.trim()); } catch (e) {}
    const lf = ZRamReader.executableLayoutFacts(ZRamProvider.getMem());
    return { story: ParchLock.StoryPath, digest: String(ModuleLibrary.currentExecutableDigest() || ''), fact: lf && lf.playerGlobal, player: P.playerId, mapRoom: ParchLockMap.CurrentRoom, rows };
  });
  await settle();
  const boot = await state();
  ok(/^local\//.test(boot.story), 'playing the imported copy (' + boot.story + ')');
  ok(boot.digest.indexOf('2803fbef240e') === 0, 'same executable digest as the bundled copy');
  ok(boot.fact === 18, 'digest-keyed playerGlobal fact applies');
  ok(boot.player === 27 && boot.mapRoom === 'At the Edifice', 'boot: player 27, map room shown');
  for (const c of ['take rock', 'drop rock', 'take rock', 'throw rock at recess', 'take rock', 'enter edifice', 'open door', 'east', 'inventory']) await send(c);
  const after = await state();
  ok(after.player === 57, 'player follows the body swap to 57');
  ok(after.rows.indexOf('Useful Rock') >= 0, 'Equipment shows Useful Rock: ' + JSON.stringify(after.rows));
  await b.close();
  console.log(pass + ' PASS / ' + fail + ' FAIL (import recognition)');
  process.exit(fail ? 1 : 0);
})();
